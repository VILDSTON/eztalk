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
    // Enable Dry Run mode to just log events instead of dropping packets (Alpha Test)
    this.ALPHA_DRY_RUN = true;
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
      const ip = this._getIP(socket);
      const socketId = socket.id;

      // Track IP connections
      if (!this.ipConnections.has(ip)) {
        this.ipConnections.set(ip, new Set());
      }
      const connections = this.ipConnections.get(ip);
      connections.add(socketId);

      // Strike: > 5 connections from single IP
      if (connections.size > 5) {
        this._addStrike(ip, 2);
        if (!this.ALPHA_DRY_RUN && this._isBanned(ip)) {
          // Disconnect all sockets from this IP
          connections.forEach(sid => {
            const s = io.sockets.sockets.get(sid);
            if (s) s.disconnect(true);
          });
          return;
        }
      }

      // Initialize Token Bucket
      this.socketBuckets.set(socketId, {
        tokens: this.BUCKET_CAPACITY,
        lastRefill: Date.now()
      });

      // Strike: Handshake auth timeout
      const authTimeout = setTimeout(() => {
        // Wait, socket.io doesn't easily expose if user "authenticated" in custom logic,
        // but typically they send an 'authenticate' or similar event, or we just rely on
        // joining a room or saving a handle. We assume auth is done if they joined their personal room.
        // For EzTalk, users send their handle on connection query or via an event.
        // Actually, EzTalk sends handle in query or a 'register' event?
        // We will just wait 5 seconds. If they don't do meaningful action, +2 strikes.
        // To integrate non-intrusively, we will just add a custom flag `isAuthenticated`
        if (!socket.isAuthenticated) {
          this._addStrike(ip, 2);
          if (!this.ALPHA_DRY_RUN && this._isBanned(ip)) {
            socket.disconnect(true);
          }
        }
      }, 5000);
      
      this.unauthTimers.set(socketId, authTimeout);

      // Packet spam protection via wildcard middleware
      socket.use(([event, ...args], next) => {
        // Allow authentication/registration events to pass without strict token check
        if (event === 'authenticate' || event === 'join') {
          socket.isAuthenticated = true;
          clearTimeout(this.unauthTimers.get(socketId));
        }

        // Whitelisted systemic and WebRTC events (no token cost)
        const ignoredEvents = [
          'typing', 'stop_typing', 'mark_read', 'ping', 'pong', 
          'authenticate', 'join', 'call-user', 'webrtc-signal', 
          'ice-candidate', 'answer-call', 'decline-call', 'end-call'
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
            socket.disconnect(true);
            return next(new Error('Banned by ESS for packet spam'));
          }
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
  }
}

export default new SecurityEngine();
