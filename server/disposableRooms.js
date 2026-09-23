import crypto from 'crypto';

// In-Memory Storage for Disposable Rooms
// Key: roomId (string) -> Value: Room object
const tempRooms = new Map();

// IP Creation Rate Limiter (Max 5 rooms per IP per 10 minutes)
const ipCreations = new Map();
const IP_LIMIT = 5;
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkIpRateLimit(ip) {
  const now = Date.now();
  const timestamps = (ipCreations.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (timestamps.length >= IP_LIMIT) {
    return false;
  }
  timestamps.push(now);
  ipCreations.set(ip, timestamps);
  return true;
}

// Clean up stale IP timestamps periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of ipCreations.entries()) {
    const valid = list.filter((t) => now - t < IP_WINDOW_MS);
    if (valid.length === 0) {
      ipCreations.delete(ip);
    } else {
      ipCreations.set(ip, valid);
    }
  }
}, 15 * 60 * 1000);

/**
 * Generate a short, human-friendly, cryptographically secure room ID
 * Format: e.g. "burn-7x9k-2m4q"
 */
function generateRoomId() {
  const part1 = crypto.randomBytes(2).toString('hex');
  const part2 = crypto.randomBytes(2).toString('hex');
  return `burn-${part1}-${part2}`;
}

/**
 * Create a new disposable room
 */
export function createDisposableRoom({ durationMinutes = 15, ip = '127.0.0.1', io }) {
  if (!checkIpRateLimit(ip)) {
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many disposable rooms created from this IP. Please wait 10 minutes.',
    };
  }

  // Sanitize duration: 5, 15, or 60 minutes (default 15)
  const allowed = [5, 15, 60];
  const validDuration = allowed.includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;
  const roomId = generateRoomId();
  const createdAt = Date.now();
  const durationMs = validDuration * 60 * 1000;
  const expiresAt = createdAt + durationMs;

  const room = {
    id: roomId,
    createdAt,
    expiresAt,
    durationMinutes: validDuration,
    creatorIp: ip,
    participants: new Map(), // socketId -> { socketId, nickname, avatar, isCreator, joinedAt }
    messages: [],            // Array of in-memory message objects
    ttlTimer: null,
    graceTimer: null,
  };

  // Schedule TTL expiration timer
  room.ttlTimer = setTimeout(() => {
    burnRoom(roomId, 'expired', io);
  }, durationMs);

  tempRooms.set(roomId, room);

  return {
    success: true,
    room: {
      id: roomId,
      createdAt,
      expiresAt,
      durationMinutes: validDuration,
    },
  };
}

/**
 * Completely destroy and annihilate a room from RAM
 * Cleans up all pending timers to prevent Node.js memory leaks
 */
export function burnRoom(roomId, reason = 'manual', io) {
  const room = tempRooms.get(roomId);
  if (!room) return false;

  // 1. Explicitly clear all timers to avoid event-loop memory leaks on Node.js/Render
  if (room.ttlTimer) {
    clearTimeout(room.ttlTimer);
    room.ttlTimer = null;
  }
  if (room.graceTimer) {
    clearTimeout(room.graceTimer);
    room.graceTimer = null;
  }
  for (const p of room.participants.values()) {
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = null;
    }
  }

  // 2. Notify all connected sockets in this room
  if (io) {
    io.to(`temp_room_${roomId}`).emit('disposable_burned', {
      roomId,
      reason, // 'manual' | 'expired' | 'abandoned'
      timestamp: Date.now(),
    });
  }

  // 3. Purge from in-memory Map
  tempRooms.delete(roomId);
  return true;
}

/**
 * Get public info for a room
 */
export function getRoomInfo(roomId) {
  const room = tempRooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    durationMinutes: room.durationMinutes,
    participantCount: room.participants.size,
  };
}

/**
 * Register Socket.IO handlers for disposable rooms
 */
export function setupDisposableSocketHandlers(io, socket) {
  // Join disposable room
  socket.on('disposable_join', ({ roomId, participantId, nickname, avatar }) => {
    const room = tempRooms.get(roomId);
    if (!room) {
      socket.emit('disposable_error', {
        code: 'ROOM_NOT_FOUND',
        message: 'This disposable room does not exist or has already been annihilated.',
      });
      return;
    }

    // Cancel room grace timer if active (someone joined / returned)
    if (room.graceTimer) {
      clearTimeout(room.graceTimer);
      room.graceTimer = null;
    }

    const pid = (participantId || '').trim() || socket.id;
    let participant = room.participants.get(pid);

    if (participant) {
      // Re-attachment on page refresh or reconnect
      if (participant.disconnectTimer) {
        clearTimeout(participant.disconnectTimer);
        participant.disconnectTimer = null;
      }
      participant.socketId = socket.id;
      if (nickname && nickname.trim()) {
        participant.nickname = nickname.trim().slice(0, 30);
      }
      if (avatar && avatar.trim()) {
        participant.avatar = avatar.trim();
      }
    } else {
      const cleanNick = (nickname || '').trim().slice(0, 30) || `Guest #${pid.slice(-4)}`;
      const cleanAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${pid}`;

      participant = {
        participantId: pid,
        socketId: socket.id,
        nickname: cleanNick,
        avatar: cleanAvatar,
        isCreator: room.participants.size === 0,
        joinedAt: Date.now(),
        disconnectTimer: null,
      };
      room.participants.set(pid, participant);
    }

    socket.join(`temp_room_${roomId}`);

    // Send initial snapshot to joining user
    socket.emit('disposable_init', {
      roomId: room.id,
      expiresAt: room.expiresAt,
      durationMinutes: room.durationMinutes,
      participants: Array.from(room.participants.values()).map((p) => ({
        participantId: p.participantId,
        socketId: p.socketId,
        nickname: p.nickname,
        avatar: p.avatar,
        isCreator: p.isCreator,
        joinedAt: p.joinedAt,
      })),
      messages: room.messages,
      selfId: participant.participantId,
    });

    // Notify other participants in the room
    socket.to(`temp_room_${roomId}`).emit('disposable_user_joined', {
      participantId: participant.participantId,
      socketId: participant.socketId,
      nickname: participant.nickname,
      avatar: participant.avatar,
      isCreator: participant.isCreator,
      joinedAt: participant.joinedAt,
    });
  });

  // Send message in disposable room
  socket.on('disposable_send_message', ({ roomId, text, attachment, replyTo }) => {
    const room = tempRooms.get(roomId);
    if (!room) {
      socket.emit('disposable_error', { code: 'ROOM_NOT_FOUND', message: 'Room has expired' });
      return;
    }

    let participant = null;
    for (const p of room.participants.values()) {
      if (p.socketId === socket.id) {
        participant = p;
        break;
      }
    }

    if (!participant) {
      socket.emit('disposable_error', { code: 'NOT_A_MEMBER', message: 'You must join first' });
      return;
    }

    const cleanText = (text || '').trim().slice(0, 4000);
    if (!cleanText && !attachment) return;

    // Enforce ESS payload sanity
    const payloadSize = JSON.stringify({ text: cleanText, attachment }).length;
    if (payloadSize > 64 * 1024) {
      socket.emit('disposable_error', { code: 'PAYLOAD_TOO_LARGE', message: 'Message exceeds 64KB limit' });
      return;
    }

    const messageObj = {
      id: `tmsg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      senderId: participant.participantId,
      senderName: participant.nickname,
      senderAvatar: participant.avatar,
      text: cleanText,
      attachment: attachment || null,
      replyTo: replyTo && replyTo.id ? {
        id: String(replyTo.id).slice(0, 60),
        text: String(replyTo.text || '').slice(0, 300),
        senderName: String(replyTo.senderName || '').slice(0, 60),
      } : null,
      reactions: {},
      timestamp: new Date().toISOString(),
    };

    // Store in RAM buffer (keep up to 300 messages)
    room.messages.push(messageObj);
    if (room.messages.length > 300) {
      room.messages.shift();
    }

    io.to(`temp_room_${roomId}`).emit('disposable_new_message', messageObj);
  });

  // Toggle emoji reaction on disposable message
  socket.on('disposable_toggle_reaction', ({ roomId, messageId, emoji }) => {
    const room = tempRooms.get(roomId);
    if (!room || !emoji) return;
    let participant = null;
    for (const p of room.participants.values()) {
      if (p.socketId === socket.id) {
        participant = p;
        break;
      }
    }
    if (!participant) return;

    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (!message.reactions) message.reactions = {};
    const currentList = message.reactions[emoji] || [];
    const index = currentList.indexOf(participant.participantId);

    if (index > -1) {
      currentList.splice(index, 1);
      if (currentList.length === 0) {
        delete message.reactions[emoji];
      } else {
        message.reactions[emoji] = currentList;
      }
    } else {
      currentList.push(participant.participantId);
      message.reactions[emoji] = currentList;
    }

    io.to(`temp_room_${roomId}`).emit('disposable_reaction_updated', {
      messageId,
      reactions: message.reactions,
    });
  });

  // Delete single message in disposable room
  socket.on('disposable_delete_message', ({ roomId, messageId }) => {
    const room = tempRooms.get(roomId);
    if (!room) return;
    let participant = null;
    for (const p of room.participants.values()) {
      if (p.socketId === socket.id) {
        participant = p;
        break;
      }
    }
    if (!participant) return;

    const msgIndex = room.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const msg = room.messages[msgIndex];
    if (msg.senderId === participant.participantId || participant.isCreator) {
      room.messages.splice(msgIndex, 1);
      io.to(`temp_room_${roomId}`).emit('disposable_message_deleted', { messageId });
    }
  });

  // Typing indicator
  socket.on('disposable_typing', ({ roomId, isTyping }) => {
    const room = tempRooms.get(roomId);
    if (!room) return;
    let participant = null;
    for (const p of room.participants.values()) {
      if (p.socketId === socket.id) {
        participant = p;
        break;
      }
    }
    if (!participant) return;

    socket.to(`temp_room_${roomId}`).emit('disposable_typing_change', {
      participantId: participant.participantId,
      socketId: socket.id,
      nickname: participant.nickname,
      isTyping: Boolean(isTyping),
    });
  });

  // Manual burn requested by a participant
  socket.on('disposable_burn', ({ roomId }) => {
    burnRoom(roomId, 'manual', io);
  });

  // P2P WebRTC Audio Signaling Relay
  socket.on('disposable_signal', ({ roomId, targetSocketId, targetParticipantId, signal, callType }) => {
    const room = tempRooms.get(roomId);
    if (!room) return;
    let sender = null;
    for (const p of room.participants.values()) {
      if (p.socketId === socket.id) {
        sender = p;
        break;
      }
    }
    if (!sender) return;

    let targetSocket = targetSocketId;
    if (!targetSocket && targetParticipantId) {
      const target = room.participants.get(targetParticipantId);
      if (target) targetSocket = target.socketId;
    }

    if (targetSocket) {
      io.to(targetSocket).emit('disposable_signal', {
        fromSocketId: socket.id,
        fromParticipantId: sender.participantId,
        senderName: sender.nickname,
        senderAvatar: sender.avatar,
        signal,
        callType: callType || 'audio',
      });
    }
  });

  // Disconnect / Leave handling with 15s page-reload grace period
  const handleLeaveOrDisconnect = () => {
    for (const [roomId, room] of tempRooms.entries()) {
      for (const [pid, participant] of room.participants.entries()) {
        if (participant.socketId === socket.id) {
          socket.leave(`temp_room_${roomId}`);

          if (participant.disconnectTimer) {
            clearTimeout(participant.disconnectTimer);
          }

          participant.disconnectTimer = setTimeout(() => {
            const currentRoom = tempRooms.get(roomId);
            if (!currentRoom) return;

            const p = currentRoom.participants.get(pid);
            if (p && p.socketId === socket.id) {
              currentRoom.participants.delete(pid);

              io.to(`temp_room_${roomId}`).emit('disposable_user_left', {
                participantId: pid,
                socketId: socket.id,
                nickname: p.nickname,
                remainingCount: currentRoom.participants.size,
              });

              // Smart Grace Period: if room is now empty, wait 60 seconds before purging
              if (currentRoom.participants.size === 0 && !currentRoom.graceTimer) {
                currentRoom.graceTimer = setTimeout(() => {
                  const r = tempRooms.get(roomId);
                  if (r && r.participants.size === 0) {
                    burnRoom(roomId, 'abandoned', io);
                  }
                }, 60 * 1000);
              }
            }
          }, 15 * 1000); // 15s grace window for page reload
          break;
        }
      }
    }
  };

  socket.on('disposable_leave', handleLeaveOrDisconnect);
  socket.on('disconnect', handleLeaveOrDisconnect);
}
