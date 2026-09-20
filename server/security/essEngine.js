class SecurityEngine {
  constructor() {
    this.ipStrikes = new Map(); // IP -> { strikes: number, banExpires: number }
    this.ipConnections = new Map(); // IP -> Set<SocketID>
    this.socketBuckets = new Map(); // SocketID -> { tokens: number, lastRefill: number }
    this.socketMutes = new Map(); // SocketID -> mutedUntil: number
    this.socketViolations = new Map(); // SocketID -> { count: number, firstViolation: number }
    this.unauthTimers = new Map(); // SocketID -> NodeJS.Timeout

    this.MAX_STRIKES = 30;
    this.BAN_DURATION = 15 * 60 * 1000; // 15 minutes
    this.BUCKET_CAPACITY = 10; // Burst capacity (tokens)
    this.REFILL_RATE = 1000 / 5; // 5 tokens per second (200ms per token)
    this.MAX_SOCKETS_PER_IP = 10; // Max concurrent sockets per single IP
    this.MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB max payload size
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
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.endsWith('127.0.0.1')) {
      return;
    }
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

  _isMuted(socketId) {
    const mutedUntil = this.socketMutes.get(socketId);
    if (!mutedUntil) return false;
    if (Date.now() < mutedUntil) return true;
    this.socketMutes.delete(socketId);
    return false;
  }

  _validatePayloadSize(args) {
    let totalBytes = 0;
    if (!args || !args.length) return { valid: true, size: 0 };
    for (const arg of args) {
      if (typeof arg === 'string') {
        totalBytes += Buffer.byteLength(arg, 'utf8');
      } else if (Buffer.isBuffer(arg)) {
        totalBytes += arg.length;
      } else if (arg && typeof arg === 'object') {
        try {
          totalBytes += Buffer.byteLength(JSON.stringify(arg), 'utf8');
        } catch {
          return { valid: false, size: Infinity, malformed: true };
        }
      }
    }
    return { valid: totalBytes <= this.MAX_PAYLOAD_BYTES, size: totalBytes, malformed: false };
  }

  _recordViolation(socketId, ip, socket) {
    const now = Date.now();
    if (!this.socketViolations.has(socketId)) {
      this.socketViolations.set(socketId, { count: 0, firstViolation: now });
    }
    const record = this.socketViolations.get(socketId);
    if (now - record.firstViolation > 10000) {
      record.count = 0;
      record.firstViolation = now;
    }
    record.count += 1;

    // 1-2 violations: Soft throttle / warning
    if (record.count <= 2) {
      socket.emit('rate_limited', {
        message: 'Rate limit exceeded: max 5 messages/sec. Please slow down.',
        retryAfter: 1
      });
      return 'warn';
    }

    // 3-5 violations: Temporary mute for 10 seconds
    if (record.count <= 5) {
      const muteDuration = 10000;
      this.socketMutes.set(socketId, now + muteDuration);
      this._addStrike(ip, 2);
      socket.emit('muted', {
        message: 'Temporarily muted for 10 seconds due to message flood.',
        mutedUntil: now + muteDuration
      });
      return 'mute';
    }

    // Critical persistent flood: Immediate termination of socket connection
    this._addStrike(ip, 10);
    socket.emit('security_violation', {
      message: 'Connection terminated by ESS: Persistent message flood violation.'
    });
    // Harsh disconnect: close underlying transport
    socket.disconnect(true);
    if (socket.conn) {
      socket.conn.close();
    }
    return 'terminate';
  }

  attach(io) {
    // Middleware to block banned IPs & reject excessive connections at handshake stage
    io.use((socket, next) => {
      const ip = this._getIP(socket);
      
      if (!this.ALPHA_DRY_RUN && this._isBanned(ip)) {
        return next(new Error('ERR_BANNED_BY_ESS: IP is temporarily blocked'));
      }

      // Pre-handshake check: Reject if IP already has too many active sockets
      const currentConns = this.ipConnections.get(ip)?.size || 0;
      if (currentConns >= this.MAX_SOCKETS_PER_IP) {
        return next(new Error('ERR_MAX_CONNECTIONS_PER_IP: Max concurrent sockets exceeded for this IP'));
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

      // Packet spam & payload validation via wildcard middleware
      socket.use(([event, ...args], next) => {
        // 1. Check if socket is currently muted
        if (this._isMuted(socketId)) {
          // Drop all incoming messages while muted
          return;
        }

        // 2. Validate payload size (< 64 KB)
        const payloadCheck = this._validatePayloadSize(args);
        if (!payloadCheck.valid) {
          this._addStrike(ip, 5);
          socket.emit('payload_too_large', {
            error: 'Packet exceeds 64 KB limit. Dropped by ESS.',
            size: payloadCheck.size
          });
          // Terminate socket immediately if severely oversized (> 128 KB) or malformed
          if (payloadCheck.malformed || payloadCheck.size > this.MAX_PAYLOAD_BYTES * 2) {
            socket.disconnect(true);
            if (socket.conn) socket.conn.close();
          }
          return;
        }

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

        // 3. Token Bucket rate check (max 5 msg/sec)
        if (!this._consumeToken(socketId)) {
          this._addStrike(ip, 1);
          
          if (this.ALPHA_DRY_RUN) {
            console.warn('[ESS ALPHA] Rate limit exceeded on socket', socketId);
            return next();
          }
          
          if (this._isBanned(ip)) {
            socket.emit('security_violation', { message: 'Banned by ESS: Rate limit / flood violation' });
            socket.disconnect(true);
            if (socket.conn) socket.conn.close();
            return;
          }
          
          this._recordViolation(socketId, ip, socket);
          return;
        }
        
        next();
      });

      socket.on('disconnect', () => {
        clearTimeout(this.unauthTimers.get(socketId));
        this.unauthTimers.delete(socketId);
        this.socketBuckets.delete(socketId);
        this.socketMutes.delete(socketId);
        this.socketViolations.delete(socketId);
        
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
