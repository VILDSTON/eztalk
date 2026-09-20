class SecurityEngine {
  constructor() {
    this.ipStrikes = new Map(); // IP -> { strikes: number, banExpires: number }
    this.ipConnections = new Map(); // IP -> Set<SocketID>
    this.socketBuckets = new Map(); // SocketID -> { tokens: number, lastRefill: number }
    this.unauthTimers = new Map(); // SocketID -> NodeJS.Timeout

    this.MAX_STRIKES = 30;
    this.BAN_DURATION = 15 * 60 * 1000; // 15 minutes
    this.BUCKET_CAPACITY = 15;
    this.REFILL_RATE = 1000 / 3; // 3 tokens per second
    this.MAX_BUCKETS = 10000;
    // Enable Dry Run mode to just log events instead of dropping packets (Alpha Test)
    this.ALPHA_DRY_RUN = false;
  }

  _getIP(socket) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return socket.handshake.address;
  }

  _addStrike(ip, points) {
    if (!this.ipStrikes.has(ip)) {
      this.ipStrikes.set(ip, { strikes: 0, banExpires: 0, alphaWarned: false });
    }
    const record = this.ipStrikes.get(ip);
    
    // Ignore if already banned
    if (record.banExpires > Date.now()) return;

    record.strikes += points;
    if (record.strikes >= this.MAX_STRIKES) {
      if (this.ALPHA_DRY_RUN) {
        if (!record.alphaWarned) {
          console.error('[ESS ALPHA] Would ban IP:', ip);
          record.alphaWarned = true;
        }
      } else {
        record.banExpires = Date.now() + this.BAN_DURATION;
      }
    }
  }

  _isBanned(ip) {
    const record = this.ipStrikes.get(ip);
    if (!record) return false;
    if (record.banExpires > Date.now()) return true;
    
    // Reset strikes if ban expired
    if (record.banExpires > 0) {
      record.strikes = 0;
      record.banExpires = 0;
    }
    return false;
  }

  isBanned(ip) {
    return this._isBanned(ip);
  }

  unban(ip) {
    this.ipStrikes.delete(ip);
  }

  getStats() {
    let bannedCount = 0;
    const now = Date.now();
    for (const record of this.ipStrikes.values()) {
      if (record.banExpires > now) bannedCount++;
    }
    return {
      trackedIPs: this.ipStrikes.size,
      bannedIPs: bannedCount,
      activeSockets: this.socketBuckets.size,
      activeIPs: this.ipConnections.size,
    };
  }

  clearAllBans() {
    this.ipStrikes.clear();
    console.log('[ESS] All bans and strikes cleared.');
  }

  _consumeToken(socketId) {
    if (!this.socketBuckets.has(socketId)) {
      this.socketBuckets.set(socketId, { tokens: this.BUCKET_CAPACITY, lastRefill: Date.now() });
    }

    const bucket = this.socketBuckets.get(socketId);
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.REFILL_RATE);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  attach(io) {
    // Middleware to block banned IPs immediately
    io.use((socket, next) => {
      const ip = this._getIP(socket);
      
      if (!this.ALPHA_DRY_RUN && this._isBanned(ip)) {
        return next(new Error('Banned by ESS'));
      }
      
      next();
    });

    io.on('connection', (socket) => {
      // Prevent memory exhaustion under DDoS
      if (this.socketBuckets.size >= this.MAX_BUCKETS) {
        if (this.ALPHA_DRY_RUN) console.warn('[ESS ALPHA] MAX_BUCKETS reached, rejecting connection.');
        socket.disconnect(false);
        return;
      }

      const ip = this._getIP(socket);
      const socketId = socket.id;

      // Track IP connections
      if (!this.ipConnections.has(ip)) {
        this.ipConnections.set(ip, new Set());
      }
      const connections = this.ipConnections.get(ip);
      connections.add(socketId);

      // Strike: > 20 connections from single IP (allow multi-tab / shared Wi-Fi)
      if (connections.size > 20) {
        this._addStrike(ip, 2);
        if (!this.ALPHA_DRY_RUN && this._isBanned(ip)) {
          // Disconnect all sockets from this IP
          connections.forEach(sid => {
            const s = io.sockets.sockets.get(sid);
            if (s) s.disconnect(false);
          });
          return;
        }
      }

      // Initialize Token Bucket
      this.socketBuckets.set(socketId, {
        tokens: this.BUCKET_CAPACITY,
        lastRefill: Date.now()
      });

      // Idle unauthenticated connection cleanup (15s grace period)
      // Disconnects ghost connections without penalizing innocent visitors on login/about screens
      const authTimeout = setTimeout(() => {
        if (!socket.isAuthenticated && !socket.verifiedHandle) {
          socket.disconnect(false);
        }
      }, 15000);
      
      this.unauthTimers.set(socketId, authTimeout);

      // Packet spam protection via wildcard middleware
      socket.use(([event, ...args], next) => {
        // Allow authentication/registration events to pass without strict token check
        if (event === 'authenticate' || event === 'join' || event === 'join_group') {
          socket.isAuthenticated = true;
          const timer = this.unauthTimers.get(socketId);
          if (timer) {
            clearTimeout(timer);
            this.unauthTimers.delete(socketId);
          }
        }

        // Whitelisted systemic and WebRTC events (no token cost)
        const ignoredEvents = [
          'typing', 'stop_typing', 'mark_read', 'ping', 'pong', 
          'authenticate', 'join', 'join_group', 'save_draft', 'update_status', 'user_updated',
          // WebRTC calls & signaling (supports both underscore and hyphenated variants)
          'call_user', 'call-user', 
          'webrtc_signal', 'webrtc-signal', 
          'ice_candidate', 'ice-candidate', 
          'answer_call', 'answer-call', 
          'accept_call', 'accept-call', 
          'decline_call', 'decline-call', 
          'end_call', 'end-call'
        ];
        if (ignoredEvents.includes(event)) {
          return next();
        }

        if (!this._consumeToken(socketId)) {
          this._addStrike(ip, 1);
          
          if (this.ALPHA_DRY_RUN) {
            console.warn('[ESS ALPHA] Rate limit exceeded on socket', socketId);
            return next();
          }
          
          if (this._isBanned(ip)) {
            socket.emit('security_violation', { message: 'Banned by ESS: Rate limit / flood violation' });
            socket.disconnect(false);
            return next(new Error('Banned by ESS for packet spam'));
          }
          
          socket.emit('rate_limited', { message: 'Too many packets' });
          return next(new Error('Rate limit exceeded'));
        }
        
        next();
      });

      socket.on('disconnect', () => {
        clearTimeout(this.unauthTimers.get(socketId));
        this.unauthTimers.delete(socketId);
        this.socketBuckets.delete(socketId);
        
        const conns = this.ipConnections.get(ip);
        if (conns) {
          conns.delete(socketId);
          if (conns.size === 0) {
            this.ipConnections.delete(ip);
          }
        }
      });
    });

    // Periodic strike decay & cleanup (every 2 minutes)
    // 1. Decays accumulated strikes for good behavior (-1 strike every 2 min)
    // 2. Prunes expired bans so users can reconnect cleanly
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.ipStrikes.entries()) {
        // If ban has expired, reset record
        if (record.banExpires > 0 && record.banExpires <= now) {
          this.ipStrikes.delete(ip);
          continue;
        }
        // If IP is not currently banned, decay strikes gradually
        if (record.banExpires <= now) {
          record.strikes = Math.max(0, record.strikes - 1);
          if (record.strikes === 0) {
            this.ipStrikes.delete(ip);
          }
        }
      }
    }, 2 * 60 * 1000); // Every 10 minutes
  }
}

export default new SecurityEngine();
