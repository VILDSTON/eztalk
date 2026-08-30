import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dns from 'dns';
import { UserModel } from './models/User.js';
import { MessageModel } from './models/Message.js';
import { GroupModel } from './models/Group.js';
import { encryptMessage, decryptMessage } from './utils/crypto.js';

// Force Google Public DNS for reliable MongoDB Atlas SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
  pingTimeout: 10000,
  pingInterval: 5000,
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

// Automatic sanitizer for MongoDB URI passwords containing special unescaped characters or duplicated prefixes
function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return rawUri;
  const trimmed = rawUri.trim().replace(/^["']|["']$/g, '');

  const protoMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
  if (!protoMatch) return trimmed;

  const protocol = protoMatch[1];
  const restOfUri = protoMatch[2];

  const lastAtIndex = restOfUri.lastIndexOf('@');
  if (lastAtIndex === -1) return trimmed;

  const userPassPart = restOfUri.substring(0, lastAtIndex);
  let hostPart = restOfUri.substring(lastAtIndex + 1);

  const colonIndex = userPassPart.indexOf(':');
  if (colonIndex === -1) return trimmed;

  let user = userPassPart.substring(0, colonIndex);
  let pass = userPassPart.substring(colonIndex + 1);

  // Clean user and pass (strip duplicate prefixes if pasted accidentally)
  user = user.replace(/^mongodb(?:\+srv)?:\/?\/?/i, '');
  pass = pass.replace(/^mongodb(?:\+srv)?:\/?\/?/i, '');
  if (pass.includes(':')) {
    const parts = pass.split(':');
    pass = parts[parts.length - 1];
  }

  let cleanUser = user;
  let cleanPass = pass;
  try {
    cleanUser = decodeURIComponent(user);
  } catch {}
  try {
    cleanPass = decodeURIComponent(pass);
  } catch {}

  const encodedUser = encodeURIComponent(cleanUser);
  const encodedPass = encodeURIComponent(cleanPass);

  // Ensure default database is /eztalk if root path is empty
  if (hostPart.startsWith('?')) {
    hostPart = `eztalk${hostPart}`;
  } else if (/^[^\/]+\/\?/.test(hostPart)) {
    hostPart = hostPart.replace(/\/\?/, '/eztalk?');
  } else if (/^[^\/]+$/.test(hostPart)) {
    hostPart = `${hostPart}/eztalk?retryWrites=true&w=majority`;
  }

  return `${protocol}${encodedUser}:${encodedPass}@${hostPart}`;
}

// Connect to MongoDB with graceful local fallback
async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    mongoConnectionError = 'MONGODB_URI environment variable is not defined on server.';
    isMongoConnected = false;
    readLocalDB();
    console.log('ℹ️ Running with high-performance Local JSON Database (MONGODB_URI not set).');
    return;
  }

  const sanitizedUri = sanitizeMongoUri(process.env.MONGODB_URI);

  try {
    await mongoose.connect(sanitizedUri, {
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

// Helper to format user objects with guaranteed id and sensitive fields omitted
function formatUser(u) {
  if (!u) return null;
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  const uid = obj.id || (obj._id ? obj._id.toString() : '') || `user_${(obj.handle || '').replace('@', '')}`;
  delete obj.password;
  return {
    ...obj,
    id: uid,
    blockedUsers: Array.isArray(obj.blockedUsers) ? obj.blockedUsers : [],
    friends: Array.isArray(obj.friends) ? obj.friends : [],
  };
}

// Helper to format message objects and decrypt message text
function formatMessage(m) {
  if (!m) return null;
  const obj = typeof m.toObject === 'function' ? m.toObject() : { ...m };
  return {
    ...obj,
    text: decryptMessage(obj.text || ''),
  };
}

// Auth Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const clean = identifier.trim().toLowerCase();
    const handleClean = clean.startsWith('@') ? clean : `@${clean}`;

    let user = null;
    let localDB = null;

    if (isMongoConnected) {
      user = await UserModel.findOne({
        $or: [{ handle: handleClean }, { email: clean }],
      });
    } else {
      localDB = readLocalDB();
      user = localDB.users.find(
        (u) => u.handle.toLowerCase() === handleClean || (u.email && u.email.toLowerCase() === clean)
      );
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register an account.' });
    }

    if (password) {
      const storedPass = user.password || '';
      let isValid = false;

      if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
        isValid = await bcrypt.compare(password, storedPass);
      } else {
        // Fallback for legacy plaintext passwords in DB
        isValid = storedPass === password;
        if (isValid) {
          // Automatically upgrade legacy plaintext password to secure bcrypt hash
          const upgradedHash = await bcrypt.hash(password, 10);
          if (isMongoConnected) {
            await UserModel.updateOne({ _id: user._id }, { $set: { password: upgradedHash } });
          } else if (localDB) {
            user.password = upgradedHash;
            writeLocalDB(localDB);
          }
        }
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }
    }

    return res.json({ user: formatUser(user) });
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
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    if (isMongoConnected) {
      const existing = await UserModel.findOne({ handle: cleanHandle });
      if (existing) {
        return res.status(409).json({ error: `Username ${cleanHandle} is already registered.` });
      }

      const user = await UserModel.create({
        name: name || cleanHandle.replace('@', ''),
        handle: cleanHandle,
        email: email || `${cleanHandle.replace('@', '')}@eztalk.app`,
        password: hashedPassword,
        avatar: avatar || CURATED_AVATARS[Math.floor(Math.random() * CURATED_AVATARS.length)],
        bio: bio || 'Hey there! I am using EzTalk.',
        status: 'Online',
      });
      const formatted = formatUser(user);
      io.emit('user_registered', formatted);
      return res.json({ user: formatted });
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
        password: hashedPassword,
        avatar: avatar || CURATED_AVATARS[Math.floor(Math.random() * CURATED_AVATARS.length)],
        status: 'Online',
        bio: bio || 'Hey there! I am using EzTalk.',
      };
      db.users.push(user);
      writeLocalDB(db);
      const formatted = formatUser(user);
      io.emit('user_registered', formatted);
      return res.json({ user: formatted });
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
      res.json({ users: users.map(formatUser) });
    } else {
      const db = readLocalDB();
      res.json({ users: db.users.map(formatUser) });
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
      res.json({ user: formatUser(user) });
    } else {
      const db = readLocalDB();
      const user = db.users.find((u) => u.handle.toLowerCase() === cleanHandle);
      res.json({ user: formatUser(user) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Profile for Authenticated Session
app.get('/api/users/profile', async (req, res) => {
  try {
    const rawHandle = req.query.handle || req.headers['x-user-handle'] || req.query.id;
    if (!rawHandle) {
      return res.status(400).json({ error: 'User handle or id is required to fetch profile.' });
    }
    const cleanHandle = normalizeHandle(rawHandle);

    if (isMongoConnected) {
      const user = await UserModel.findOne({
        $or: [{ handle: cleanHandle }, { _id: req.query.id || null }],
      }).lean();
      if (!user) return res.status(404).json({ error: 'User profile not found.' });
      return res.json({ user: formatUser(user) });
    } else {
      const db = readLocalDB();
      const user = db.users.find(
        (u) => u.handle.toLowerCase() === cleanHandle.toLowerCase() || (req.query.id && u.id === req.query.id)
      );
      if (!user) return res.status(404).json({ error: 'User profile not found.' });
      return res.json({ user: formatUser(user) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile (Supports both PUT and PATCH for Cross-Device Persistence)
app.all(['/api/users/profile', '/api/users/settings'], async (req, res, next) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') return next();
  try {
    const {
      id,
      oldHandle,
      handle,
      name,
      avatar,
      status,
      statusEmoji,
      customStatusText,
      banner,
      website,
      accentColor,
      theme,
      soundNotifications,
      bio,
      blockedUsers,
      friends,
    } = req.body;

    const targetHandle = normalizeHandle(handle || oldHandle);
    const prevHandle = oldHandle ? normalizeHandle(oldHandle) : targetHandle;

    if (!targetHandle) {
      return res.status(400).json({ error: 'Handle is required.' });
    }

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
        ...(theme !== undefined && { theme }),
        ...(soundNotifications !== undefined && { soundNotifications: Boolean(soundNotifications) }),
        ...(bio !== undefined && { bio }),
        ...(Array.isArray(blockedUsers) && { blockedUsers: blockedUsers.map(normalizeHandle) }),
        ...(Array.isArray(friends) && { friends: friends.map(normalizeHandle) }),
      };

      const query = id ? { _id: id } : { handle: prevHandle };
      const updated = await UserModel.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true, upsert: true }
      ).lean();

      const formatted = formatUser(updated);
      io.emit('user_updated', formatted);
      io.to(targetHandle).emit('profile_updated', formatted);
      if (prevHandle && prevHandle !== targetHandle) {
        io.to(prevHandle).emit('profile_updated', formatted);
      }
      return res.json({ user: formatted });
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
          theme: theme !== undefined ? theme : db.users[idx].theme || 'dark',
          soundNotifications: soundNotifications !== undefined ? Boolean(soundNotifications) : db.users[idx].soundNotifications !== false,
          bio: bio !== undefined ? bio : db.users[idx].bio,
          blockedUsers: Array.isArray(blockedUsers) ? blockedUsers.map(normalizeHandle) : (db.users[idx].blockedUsers || []),
          friends: Array.isArray(friends) ? friends.map(normalizeHandle) : (db.users[idx].friends || []),
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
          name: name || targetHandle.replace('@', ''),
          handle: targetHandle,
          avatar: avatar || CURATED_AVATARS[0],
          status: status || 'Online',
          statusEmoji: statusEmoji || '🚀',
          customStatusText: customStatusText || '',
          banner: banner || '',
          website: website || '',
          accentColor: accentColor || '#00ff73',
          theme: theme || 'dark',
          soundNotifications: soundNotifications !== undefined ? Boolean(soundNotifications) : true,
          bio: bio || 'Hey there! I am using EzTalk.',
          blockedUsers: Array.isArray(blockedUsers) ? blockedUsers.map(normalizeHandle) : [],
          friends: Array.isArray(friends) ? friends.map(normalizeHandle) : [],
        };
        db.users.push(user);
      }
      writeLocalDB(db);
      const formatted = formatUser(user);
      io.emit('user_updated', formatted);
      io.to(targetHandle).emit('profile_updated', formatted);
      if (prevHandle && prevHandle !== targetHandle) {
        io.to(prevHandle).emit('profile_updated', formatted);
      }
      return res.json({ user: formatted });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle / Set Block User
app.post('/api/users/:handle/block', async (req, res) => {
  try {
    const userHandle = normalizeHandle(req.params.handle);
    const { targetHandle, action } = req.body;
    const cleanTarget = normalizeHandle(targetHandle);

    if (isMongoConnected) {
      const user = await UserModel.findOne({ handle: userHandle });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.blockedUsers) user.blockedUsers = [];

      const isBlocked = user.blockedUsers.includes(cleanTarget);
      if (action === 'unblock' || (action === 'toggle' && isBlocked)) {
        user.blockedUsers = user.blockedUsers.filter((h) => h !== cleanTarget);
      } else {
        if (!isBlocked) user.blockedUsers.push(cleanTarget);
      }
      await user.save();
      const formatted = formatUser(user);
      io.emit('user_updated', formatted);
      res.json({ success: true, blockedUsers: user.blockedUsers });
    } else {
      const db = readLocalDB();
      const idx = db.users.findIndex((u) => u.handle.toLowerCase() === userHandle);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      if (!db.users[idx].blockedUsers) db.users[idx].blockedUsers = [];

      const isBlocked = db.users[idx].blockedUsers.includes(cleanTarget);
      if (action === 'unblock' || (action === 'toggle' && isBlocked)) {
        db.users[idx].blockedUsers = db.users[idx].blockedUsers.filter((h) => h !== cleanTarget);
      } else {
        if (!isBlocked) db.users[idx].blockedUsers.push(cleanTarget);
      }
      writeLocalDB(db);
      io.emit('user_updated', db.users[idx]);
      res.json({ success: true, blockedUsers: db.users[idx].blockedUsers });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle / Add / Remove Friend (Mutual cross-device persistence)
app.post('/api/users/:handle/friends', async (req, res) => {
  try {
    const userHandle = normalizeHandle(req.params.handle);
    const { targetHandle, action } = req.body;
    const cleanTarget = normalizeHandle(targetHandle);

    if (!cleanTarget) {
      return res.status(400).json({ error: 'Target handle is required.' });
    }

    if (isMongoConnected) {
      const [user, targetUser] = await Promise.all([
        UserModel.findOne({ handle: userHandle }),
        UserModel.findOne({ handle: cleanTarget }),
      ]);

      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.friends) user.friends = [];

      const isFriend = user.friends.includes(cleanTarget);
      const isRemoving = action === 'remove' || (action === 'toggle' && isFriend);

      if (isRemoving) {
        user.friends = user.friends.filter((h) => h !== cleanTarget);
        if (targetUser && targetUser.friends) {
          targetUser.friends = targetUser.friends.filter((h) => h !== userHandle);
          await targetUser.save();
          io.to(cleanTarget).emit('friends_updated', { friends: targetUser.friends });
          io.to(cleanTarget).emit('profile_updated', formatUser(targetUser));
        }
      } else {
        if (!user.friends.includes(cleanTarget)) user.friends.push(cleanTarget);
        if (targetUser) {
          if (!targetUser.friends) targetUser.friends = [];
          if (!targetUser.friends.includes(userHandle)) targetUser.friends.push(userHandle);
          await targetUser.save();
          io.to(cleanTarget).emit('friends_updated', { friends: targetUser.friends });
          io.to(cleanTarget).emit('profile_updated', formatUser(targetUser));
        }
      }

      await user.save();
      const formatted = formatUser(user);
      io.emit('user_updated', formatted);
      if (targetUser) io.emit('user_updated', formatUser(targetUser));
      io.to(userHandle).emit('friends_updated', { friends: user.friends });
      io.to(userHandle).emit('profile_updated', formatted);
      res.json({ success: true, friends: user.friends });
    } else {
      const db = readLocalDB();
      const idx = db.users.findIndex((u) => u.handle.toLowerCase() === userHandle);
      const targetIdx = db.users.findIndex((u) => u.handle.toLowerCase() === cleanTarget);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      if (!db.users[idx].friends) db.users[idx].friends = [];

      const isFriend = db.users[idx].friends.includes(cleanTarget);
      const isRemoving = action === 'remove' || (action === 'toggle' && isFriend);

      if (isRemoving) {
        db.users[idx].friends = db.users[idx].friends.filter((h) => h !== cleanTarget);
        if (targetIdx !== -1 && db.users[targetIdx].friends) {
          db.users[targetIdx].friends = db.users[targetIdx].friends.filter((h) => h !== userHandle);
          io.to(cleanTarget).emit('friends_updated', { friends: db.users[targetIdx].friends });
          io.to(cleanTarget).emit('profile_updated', formatUser(db.users[targetIdx]));
        }
      } else {
        if (!db.users[idx].friends.includes(cleanTarget)) db.users[idx].friends.push(cleanTarget);
        if (targetIdx !== -1) {
          if (!db.users[targetIdx].friends) db.users[targetIdx].friends = [];
          if (!db.users[targetIdx].friends.includes(userHandle)) db.users[targetIdx].friends.push(userHandle);
          io.to(cleanTarget).emit('friends_updated', { friends: db.users[targetIdx].friends });
          io.to(cleanTarget).emit('profile_updated', formatUser(db.users[targetIdx]));
        }
      }

      writeLocalDB(db);
      const formatted = formatUser(db.users[idx]);
      io.emit('user_updated', formatted);
      if (targetIdx !== -1) io.emit('user_updated', formatUser(db.users[targetIdx]));
      io.to(userHandle).emit('friends_updated', { friends: db.users[idx].friends });
      io.to(userHandle).emit('profile_updated', formatted);
      res.json({ success: true, friends: db.users[idx].friends });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages for a Group (Decrypted on retrieval)
app.get(['/api/groups/:groupId/messages', '/api/messages/group/:groupId'], async (req, res) => {
  try {
    const { groupId } = req.params;
    const key = `group__${groupId}`;

    if (isMongoConnected) {
      const messages = await MessageModel.find({
        $or: [{ conversationKey: key }, { groupId }],
      }).sort({ createdAt: 1 }).lean();
      res.json({ messages: messages.map(formatMessage) });
    } else {
      const db = readLocalDB();
      const messages = db.messages.filter((m) => m.conversationKey === key || m.groupId === groupId);
      res.json({ messages: messages.map(formatMessage) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages between two users (Decrypted on retrieval)
app.get('/api/messages/:handle1/:handle2', async (req, res) => {
  try {
    const { handle1, handle2 } = req.params;
    const key = getConversationKey(handle1, handle2);

    if (isMongoConnected) {
      const messages = await MessageModel.find({ conversationKey: key }).sort({ createdAt: 1 }).lean();
      res.json({ messages: messages.map(formatMessage) });
    } else {
      const db = readLocalDB();
      const messages = db.messages.filter((m) => m.conversationKey === key);
      res.json({ messages: messages.map(formatMessage) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post New Message (Encrypted at rest with AES-256-GCM)
app.post('/api/messages', async (req, res) => {
  try {
    const { id, senderHandle, recipientHandle, groupId, text, attachment, replyTo, callInfo, isForwarded, forwardedFrom, timestamp } = req.body;
    const sHandle = normalizeHandle(senderHandle);
    let key;
    let rHandle = null;

    if (groupId) {
      key = `group__${groupId}`;
    } else {
      rHandle = normalizeHandle(recipientHandle);
      key = getConversationKey(sHandle, rHandle);
    }

    const plainText = text || '';
    const encryptedText = encryptMessage(plainText);

    const messageData = {
      id: id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationKey: key,
      groupId: groupId || null,
      senderHandle: sHandle,
      recipientHandle: rHandle,
      text: encryptedText, // AES-256-GCM ciphertext in database
      attachment: attachment || null,
      replyTo: replyTo || null,
      callInfo: callInfo || null,
      reactions: {},
      isEdited: false,
      isForwarded: Boolean(isForwarded),
      forwardedFrom: forwardedFrom || null,
      timestamp: timestamp || 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    if (isMongoConnected) {
      const saved = await MessageModel.create(messageData);
      const formatted = formatMessage(saved);
      io.emit('new_message', formatted);
      return res.json({ message: formatted });
    } else {
      const db = readLocalDB();
      db.messages.push(messageData);
      writeLocalDB(db);
      const formatted = formatMessage(messageData);
      io.emit('new_message', formatted);
      return res.json({ message: formatted });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Message (Encrypted at rest with AES-256-GCM)
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const encryptedText = encryptMessage(text || '');

    if (isMongoConnected) {
      const updated = await MessageModel.findOneAndUpdate(
        { id },
        { $set: { text: encryptedText, isEdited: true } },
        { new: true }
      ).lean();
      io.emit('message_edited', { id, text, isEdited: true });
      res.json({ message: formatMessage(updated) });
    } else {
      const db = readLocalDB();
      const msg = db.messages.find((m) => m.id === id);
      if (msg) {
        msg.text = encryptedText;
        msg.isEdited = true;
        writeLocalDB(db);
        io.emit('message_edited', { id, text, isEdited: true });
        res.json({ message: formatMessage(msg) });
      } else {
        res.status(404).json({ error: 'Message not found' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hard Delete Message (Permanently removed from MongoDB and Local DB)
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      await MessageModel.deleteOne({ id });
      io.emit('message_deleted', { id });
      res.json({ success: true, id });
    } else {
      const db = readLocalDB();
      const initialCount = db.messages.length;
      db.messages = db.messages.filter((m) => m.id !== id);
      if (db.messages.length < initialCount) {
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
    if (isMongoConnected) {
      const groups = await GroupModel.find().lean();
      res.json({ groups });
    } else {
      const db = readLocalDB();
      res.json({ groups: db.groups || [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name, avatar, creatorHandle, memberHandles } = req.body;
    const cleanCreator = normalizeHandle(creatorHandle);
    const cleanMembers = (memberHandles || []).map((h) => normalizeHandle(h));

    if (!cleanMembers.includes(cleanCreator)) {
      cleanMembers.push(cleanCreator);
    }

    const groupData = {
      id: `group_${Date.now()}`,
      name: name || 'Unnamed Group',
      avatar: avatar || CURATED_AVATARS[0],
      creatorHandle: cleanCreator,
      memberHandles: cleanMembers,
      createdAt: new Date().toISOString(),
    };

    if (isMongoConnected) {
      const created = await GroupModel.create(groupData);
      io.emit('new_group', created);
      return res.json({ group: created });
    } else {
      const db = readLocalDB();
      if (!db.groups) db.groups = [];
      db.groups.push(groupData);
      writeLocalDB(db);
      io.emit('new_group', groupData);
      return res.json({ group: groupData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Group
app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let memberHandles = [];

    if (isMongoConnected) {
      const group = await GroupModel.findOne({ id }).lean();
      if (group && Array.isArray(group.memberHandles)) {
        memberHandles = group.memberHandles;
      }
      await GroupModel.findOneAndDelete({ id });
      await MessageModel.deleteMany({ groupId: id });
    } else {
      const db = readLocalDB();
      if (db.groups) {
        const group = db.groups.find((g) => g.id === id);
        if (group && Array.isArray(group.memberHandles)) {
          memberHandles = group.memberHandles;
        }
        db.groups = db.groups.filter((g) => g.id !== id);
        db.messages = db.messages.filter((m) => m.groupId !== id && m.conversationKey !== `group__${id}`);
        writeLocalDB(db);
      }
    }

    if (memberHandles.length > 0) {
      memberHandles.forEach((handle) => {
        io.to(normalizeHandle(handle)).emit('group_deleted', { groupId: id });
      });
    } else {
      io.emit('group_deleted', { groupId: id });
    }

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

    if (groupId) {
      let memberHandles = [];
      if (isMongoConnected) {
        const group = await GroupModel.findOne({ id: groupId }).lean();
        if (group && Array.isArray(group.memberHandles)) {
          memberHandles = group.memberHandles;
        }
      } else {
        const db = readLocalDB();
        const group = (db.groups || []).find((g) => g.id === groupId);
        if (group && Array.isArray(group.memberHandles)) {
          memberHandles = group.memberHandles;
        }
      }
      if (memberHandles.length > 0) {
        memberHandles.forEach((handle) => {
          io.to(normalizeHandle(handle)).emit('chat_cleared', { key });
        });
      } else {
        io.emit('chat_cleared', { key });
      }
    } else if (handle1 && handle2) {
      io.to(normalizeHandle(handle1)).emit('chat_cleared', { key });
      io.to(normalizeHandle(handle2)).emit('chat_cleared', { key });
    } else {
      io.emit('chat_cleared', { key });
    }

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
    const rHandle = normalizeHandle(recipientHandle);
    const sHandle = normalizeHandle(senderHandle);
    if (rHandle) {
      io.to(rHandle).emit('user_typing', {
        senderHandle: sHandle,
        recipientHandle: rHandle,
        isTyping,
      });
    }
  });

  socket.on('call_user', ({ caller, recipientHandle }) => {
    const rHandle = normalizeHandle(recipientHandle);
    if (rHandle) {
      io.to(rHandle).emit('incoming_call', {
        caller,
        recipientHandle: rHandle,
      });
    }
  });

  socket.on('answer_call', ({ callerHandle, recipient }) => {
    const cHandle = normalizeHandle(callerHandle);
    if (cHandle) {
      io.to(cHandle).emit('call_accepted', {
        callerHandle: cHandle,
        recipient,
      });
    }
  });

  socket.on('end_call', ({ callerHandle, recipientHandle }) => {
    const cHandle = normalizeHandle(callerHandle);
    const rHandle = normalizeHandle(recipientHandle);
    if (cHandle) io.to(cHandle).emit('call_ended', { callerHandle: cHandle, recipientHandle: rHandle });
    if (rHandle) io.to(rHandle).emit('call_ended', { callerHandle: cHandle, recipientHandle: rHandle });
  });

  socket.on('webrtc_signal', ({ toHandle, fromHandle, signal }) => {
    const target = normalizeHandle(toHandle);
    const source = normalizeHandle(fromHandle);
    if (target) {
      io.to(target).emit('webrtc_signal', {
        toHandle: target,
        fromHandle: source,
        signal,
      });
    }
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
