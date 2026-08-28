import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { UserModel } from './models/User.js';
import { MessageModel } from './models/Message.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eztalk_db';

// Normalized handle helper
export function normalizeHandle(handle) {
  if (!handle) return '';
  const trimmed = handle.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function getConversationKey(handle1, handle2) {
  const h1 = normalizeHandle(handle1);
  const h2 = normalizeHandle(handle2);
  return [h1, h2].sort().join('__');
}

// Fallback JSON DB file path
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isMongoConnected = false;

// Preset Guaranteed Working Avatars
export const CURATED_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

// Helper functions for Local JSON Store
function readLocalDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.groups) parsed.groups = [];
      return parsed;
    }
  } catch (err) {
    console.error('Error reading local JSON DB:', err);
  }
  const initial = { users: [], messages: [], groups: [] };
  writeLocalDB(initial);
  return initial;
}

function writeLocalDB(data) {
  try {
    if (!data.groups) data.groups = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local JSON DB:', err);
  }
}

let mongoConnectionError = null;

// Connect to MongoDB with graceful local fallback
async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    mongoConnectionError = 'MONGODB_URI environment variable is not defined on server.';
    isMongoConnected = false;
    readLocalDB();
    console.log('ℹ️ Running with high-performance Local JSON Database (MONGODB_URI not set).');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    isMongoConnected = true;
    mongoConnectionError = null;
    console.log('✅ Connected to MongoDB Database successfully.');
  } catch (err) {
    isMongoConnected = false;
    mongoConnectionError = err.message;
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('ℹ️ Running with high-performance Local JSON Database.');
    readLocalDB();
  }
}

connectDatabase();

// --- REST API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isMongoConnected ? 'MongoDB' : 'Local JSON DB',
    isMongoConnected,
    mongoConfigured: Boolean(process.env.MONGODB_URI),
    mongoError: isMongoConnected ? null : mongoConnectionError,
    timestamp: new Date().toISOString(),
  });
});

// Auth Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const clean = identifier.trim().toLowerCase();
    const handleClean = clean.startsWith('@') ? clean : `@${clean}`;

    if (isMongoConnected) {
      const user = await UserModel.findOne({
        $or: [{ handle: handleClean }, { email: clean }],
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found. Please register an account.' });
      }

      if (password && user.password && user.password !== password) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      return res.json({ user });
    } else {
      const db = readLocalDB();
      const user = db.users.find(
        (u) => u.handle.toLowerCase() === handleClean || (u.email && u.email.toLowerCase() === clean)
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found. Please register an account.' });
      }

      if (password && user.password && user.password !== password) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      return res.json({ user });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, handle, email, password, avatar, bio } = req.body;
    if (!handle) {
      return res.status(400).json({ error: 'Username handle is required' });
    }

    const cleanHandle = normalizeHandle(handle);

    if (isMongoConnected) {
      const existing = await UserModel.findOne({ handle: cleanHandle });
      if (existing) {
        return res.status(409).json({ error: `Username ${cleanHandle} is already registered.` });
      }

      const user = await UserModel.create({
        name: name || cleanHandle.replace('@', ''),
        handle: cleanHandle,
        email: email || `${cleanHandle.replace('@', '')}@eztalk.app`,
        password: password || 'password123',
        avatar: avatar || CURATED_AVATARS[Math.floor(Math.random() * CURATED_AVATARS.length)],
        bio: bio || 'Hey there! I am using EzTalk.',
        status: 'Online',
      });
      io.emit('user_registered', user);
      return res.json({ user });
    } else {
      const db = readLocalDB();
      const existing = db.users.find((u) => u.handle.toLowerCase() === cleanHandle);
      if (existing) {
        return res.status(409).json({ error: `Username ${cleanHandle} is already registered.` });
      }

      const user = {
        id: `user_${Date.now()}`,
        name: name || cleanHandle.replace('@', ''),
        handle: cleanHandle,
        email: email || `${cleanHandle.replace('@', '')}@eztalk.app`,
        password: password || 'password123',
        avatar: avatar || CURATED_AVATARS[Math.floor(Math.random() * CURATED_AVATARS.length)],
        status: 'Online',
        bio: bio || 'Hey there! I am using EzTalk.',
      };
      db.users.push(user);
      writeLocalDB(db);
      io.emit('user_registered', user);
      return res.json({ user });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Users
app.get('/api/users', async (req, res) => {
  try {
    if (isMongoConnected) {
      const users = await UserModel.find().lean();
      res.json({ users });
    } else {
      const db = readLocalDB();
      res.json({ users: db.users });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User by Handle
app.get('/api/users/by-handle/:handle', async (req, res) => {
  try {
    const cleanHandle = normalizeHandle(req.params.handle);
    if (isMongoConnected) {
      const user = await UserModel.findOne({ handle: cleanHandle }).lean();
      res.json({ user });
    } else {
      const db = readLocalDB();
      const user = db.users.find((u) => u.handle.toLowerCase() === cleanHandle);
      res.json({ user: user || null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.put('/api/users/profile', async (req, res) => {
  try {
    const { id, oldHandle, handle, name, avatar, status, statusEmoji, customStatusText, banner, website, accentColor, bio } = req.body;
    const targetHandle = normalizeHandle(handle || oldHandle);
    const prevHandle = oldHandle ? normalizeHandle(oldHandle) : targetHandle;

    if (isMongoConnected) {
      if (targetHandle !== prevHandle) {
        const handleTaken = await UserModel.findOne({ handle: targetHandle, _id: { $ne: id } });
        if (handleTaken) {
          return res.status(409).json({ error: `Username ${targetHandle} is already taken.` });
        }
      }

      const updateData = {
        handle: targetHandle,
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(status && { status }),
        ...(statusEmoji !== undefined && { statusEmoji }),
        ...(customStatusText !== undefined && { customStatusText }),
        ...(banner !== undefined && { banner }),
        ...(website !== undefined && { website }),
        ...(accentColor !== undefined && { accentColor }),
        ...(bio !== undefined && { bio }),
      };

      const query = id ? { _id: id } : { handle: prevHandle };
      const updated = await UserModel.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true, upsert: true }
      ).lean();

      io.emit('user_updated', updated);
      res.json({ user: updated });
    } else {
      const db = readLocalDB();
      const idx = db.users.findIndex(
        (u) => (id && u.id === id) || u.handle.toLowerCase() === prevHandle.toLowerCase()
      );

      if (targetHandle !== prevHandle) {
        const collision = db.users.some(
          (u, index) => index !== idx && u.handle.toLowerCase() === targetHandle.toLowerCase()
        );
        if (collision) {
          return res.status(409).json({ error: `Username ${targetHandle} is already taken.` });
        }
      }

      let user;
      if (idx >= 0) {
        db.users[idx] = {
          ...db.users[idx],
          handle: targetHandle,
          name: name || db.users[idx].name,
          avatar: avatar || db.users[idx].avatar,
          status: status || db.users[idx].status,
          statusEmoji: statusEmoji !== undefined ? statusEmoji : db.users[idx].statusEmoji || '🚀',
          customStatusText: customStatusText !== undefined ? customStatusText : db.users[idx].customStatusText || '',
          banner: banner !== undefined ? banner : db.users[idx].banner || '',
          website: website !== undefined ? website : db.users[idx].website || '',
          accentColor: accentColor !== undefined ? accentColor : db.users[idx].accentColor || '#00ff73',
          bio: bio !== undefined ? bio : db.users[idx].bio,
        };
        user = db.users[idx];

        if (targetHandle !== prevHandle) {
          db.messages.forEach((msg) => {
            if (msg.senderHandle && msg.senderHandle.toLowerCase() === prevHandle) {
              msg.senderHandle = targetHandle;
            }
            if (msg.recipientHandle && msg.recipientHandle.toLowerCase() === prevHandle) {
              msg.recipientHandle = targetHandle;
            }
            if (!msg.groupId) {
              msg.conversationKey = getConversationKey(msg.senderHandle, msg.recipientHandle);
            }
          });
        }
      } else {
        user = {
          id: id || `user_${Date.now()}`,
          name,
          handle: targetHandle,
          avatar: avatar || CURATED_AVATARS[0],
          status: status || 'Online',
          statusEmoji: statusEmoji || '🚀',
          customStatusText: customStatusText || '',
          banner: banner || '',
          website: website || '',
          accentColor: accentColor || '#00ff73',
          bio: bio || '',
        };
        db.users.push(user);
      }
      writeLocalDB(db);
      io.emit('user_updated', user);
      res.json({ user });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages for a Group
app.get(['/api/groups/:groupId/messages', '/api/messages/group/:groupId'], async (req, res) => {
  try {
    const { groupId } = req.params;
    const key = `group__${groupId}`;

    if (isMongoConnected) {
      const messages = await MessageModel.find({
        $or: [{ conversationKey: key }, { groupId }],
      }).sort({ createdAt: 1 }).lean();
      res.json({ messages });
    } else {
      const db = readLocalDB();
      const messages = db.messages.filter((m) => m.conversationKey === key || m.groupId === groupId);
      res.json({ messages });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages between two users
app.get('/api/messages/:handle1/:handle2', async (req, res) => {
  try {
    const { handle1, handle2 } = req.params;
    const key = getConversationKey(handle1, handle2);

    if (isMongoConnected) {
      const messages = await MessageModel.find({ conversationKey: key }).sort({ createdAt: 1 }).lean();
      res.json({ messages });
    } else {
      const db = readLocalDB();
      const messages = db.messages.filter((m) => m.conversationKey === key);
      res.json({ messages });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post New Message
app.post('/api/messages', async (req, res) => {
  try {
    const { id, senderHandle, recipientHandle, groupId, text, attachment, replyTo, callInfo, timestamp } = req.body;
    const sHandle = normalizeHandle(senderHandle);
    let key;
    let rHandle = null;

    if (groupId) {
      key = `group__${groupId}`;
    } else {
      rHandle = normalizeHandle(recipientHandle);
      key = getConversationKey(sHandle, rHandle);
    }

    const messageData = {
      id: id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationKey: key,
      groupId: groupId || null,
      senderHandle: sHandle,
      recipientHandle: rHandle,
      text: text || '',
      attachment: attachment || null,
      replyTo: replyTo || null,
      callInfo: callInfo || null,
      reactions: {},
      isEdited: false,
      timestamp: timestamp || 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    if (isMongoConnected) {
      const saved = await MessageModel.create(messageData);
      io.emit('new_message', saved);
      return res.json({ message: saved });
    } else {
      const db = readLocalDB();
      db.messages.push(messageData);
      writeLocalDB(db);
      io.emit('new_message', messageData);
      return res.json({ message: messageData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Message
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (isMongoConnected) {
      const updated = await MessageModel.findOneAndUpdate(
        { id },
        { $set: { text, isEdited: true } },
        { new: true }
      ).lean();
      io.emit('message_edited', { id, text, isEdited: true });
      res.json({ message: updated });
    } else {
      const db = readLocalDB();
      const msg = db.messages.find((m) => m.id === id);
      if (msg) {
        msg.text = text;
        msg.isEdited = true;
        writeLocalDB(db);
        io.emit('message_edited', { id, text, isEdited: true });
        res.json({ message: msg });
      } else {
        res.status(404).json({ error: 'Message not found' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      await MessageModel.findOneAndDelete({ id });
      io.emit('message_deleted', { id });
      res.json({ success: true, id });
    } else {
      const db = readLocalDB();
      const idx = db.messages.findIndex((m) => m.id === id);
      if (idx >= 0) {
        db.messages.splice(idx, 1);
        writeLocalDB(db);
        io.emit('message_deleted', { id });
        res.json({ success: true, id });
      } else {
        res.status(404).json({ error: 'Message not found' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Emoji Reaction on Message
app.post('/api/messages/:id/reaction', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, userHandle } = req.body;
    const handle = normalizeHandle(userHandle);

    if (isMongoConnected) {
      const msg = await MessageModel.findOne({ id });
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        const currentList = msg.reactions[emoji] || [];
        if (currentList.includes(handle)) {
          msg.reactions[emoji] = currentList.filter((h) => h !== handle);
          if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
        } else {
          msg.reactions[emoji] = [...currentList, handle];
        }
        msg.markModified('reactions');
        await msg.save();
        io.emit('reaction_updated', { id, reactions: msg.reactions });
        res.json({ reactions: msg.reactions });
      } else {
        res.status(404).json({ error: 'Message not found' });
      }
    } else {
      const db = readLocalDB();
      const msg = db.messages.find((m) => m.id === id);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        const currentList = msg.reactions[emoji] || [];
        if (currentList.includes(handle)) {
          msg.reactions[emoji] = currentList.filter((h) => h !== handle);
          if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
        } else {
          msg.reactions[emoji] = [...currentList, handle];
        }
        writeLocalDB(db);
        io.emit('reaction_updated', { id, reactions: msg.reactions });
        res.json({ reactions: msg.reactions });
      } else {
        res.status(404).json({ error: 'Message not found' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Groups Endpoints
app.get('/api/groups', async (req, res) => {
  try {
    const db = readLocalDB();
    res.json({ groups: db.groups || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name, avatar, creatorHandle, memberHandles } = req.body;
    const db = readLocalDB();
    if (!db.groups) db.groups = [];

    const newGroup = {
      id: `group_${Date.now()}`,
      name: name || 'Unnamed Group',
      avatar: avatar || CURATED_AVATARS[0],
      creatorHandle: normalizeHandle(creatorHandle),
      memberHandles: (memberHandles || []).map((h) => normalizeHandle(h)),
      createdAt: new Date().toISOString(),
    };

    // Ensure creator is in memberHandles
    if (!newGroup.memberHandles.includes(newGroup.creatorHandle)) {
      newGroup.memberHandles.push(newGroup.creatorHandle);
    }

    db.groups.push(newGroup);
    writeLocalDB(db);
    io.emit('new_group', newGroup);
    res.json({ group: newGroup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Group
app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = readLocalDB();
    if (db.groups) {
      db.groups = db.groups.filter((g) => g.id !== id);
      db.messages = db.messages.filter((m) => m.groupId !== id && m.conversationKey !== `group__${id}`);
      writeLocalDB(db);
    }
    io.emit('group_deleted', { groupId: id });
    res.json({ success: true, groupId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Messages
app.post('/api/messages/clear', async (req, res) => {
  try {
    const { handle1, handle2, groupId } = req.body;
    let key;
    if (groupId) {
      key = `group__${groupId}`;
    } else {
      key = getConversationKey(handle1, handle2);
    }

    if (isMongoConnected) {
      await MessageModel.deleteMany({ conversationKey: key });
    } else {
      const db = readLocalDB();
      db.messages = db.messages.filter((m) => m.conversationKey !== key);
      writeLocalDB(db);
    }
    io.emit('chat_cleared', { key });
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOCKET.IO REAL-TIME EVENTS & PRESENCE ---
const socketHandleMap = new Map(); // socket.id -> handle
const handleSocketCount = new Map(); // handle -> count

function getOnlineHandles() {
  return Array.from(handleSocketCount.keys()).filter((h) => (handleSocketCount.get(h) || 0) > 0);
}

io.on('connection', (socket) => {
  // Send current online users immediately on connection
  socket.emit('online_users', getOnlineHandles());

  socket.on('join', (userHandle) => {
    if (userHandle) {
      const handle = normalizeHandle(userHandle);
      socket.join(handle);

      // Track presence
      socketHandleMap.set(socket.id, handle);
      const prevCount = handleSocketCount.get(handle) || 0;
      handleSocketCount.set(handle, prevCount + 1);

      // Broadcast updated online list
      io.emit('online_users', getOnlineHandles());
    }
  });

  socket.on('disconnect', () => {
    const handle = socketHandleMap.get(socket.id);
    if (handle) {
      socketHandleMap.delete(socket.id);
      const count = (handleSocketCount.get(handle) || 1) - 1;
      if (count <= 0) {
        handleSocketCount.delete(handle);
      } else {
        handleSocketCount.set(handle, count);
      }
      io.emit('online_users', getOnlineHandles());
    }
  });

  socket.on('typing', ({ senderHandle, recipientHandle, isTyping }) => {
    io.emit('user_typing', {
      senderHandle: normalizeHandle(senderHandle),
      recipientHandle: normalizeHandle(recipientHandle),
      isTyping,
    });
  });

  socket.on('call_user', ({ caller, recipientHandle }) => {
    io.emit('incoming_call', {
      caller,
      recipientHandle: normalizeHandle(recipientHandle),
    });
  });

  socket.on('answer_call', ({ callerHandle, recipient }) => {
    io.emit('call_accepted', {
      callerHandle: normalizeHandle(callerHandle),
      recipient,
    });
  });

  socket.on('end_call', ({ callerHandle, recipientHandle }) => {
    io.emit('call_ended', {
      callerHandle: normalizeHandle(callerHandle),
      recipientHandle: normalizeHandle(recipientHandle),
    });
  });

  socket.on('webrtc_signal', ({ toHandle, fromHandle, signal }) => {
    io.emit('webrtc_signal', {
      toHandle: normalizeHandle(toHandle),
      fromHandle: normalizeHandle(fromHandle),
      signal,
    });
  });
});

// Health check endpoint for UptimeRobot / Ping services
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbConnected: isMongoConnected,
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend dist if available (for single-server / Docker / VPS / Render deployments)
const DIST_PATH = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(DIST_PATH, 'index.html'));
    }
    next();
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EzTalk Backend Server running on http://0.0.0.0:${PORT}`);
});
