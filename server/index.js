import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dns from 'dns';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { UserModel } from './models/User.js';
import { MessageModel } from './models/Message.js';
import { GroupModel } from './models/Group.js';
import { ConversationModel } from './models/Conversation.js';
import { encryptMessage, decryptMessage, isEncrypted } from './utils/crypto.js';
import { authRateLimiter, uploadRateLimiter, apiRateLimiter, messageRateLimiter } from './utils/rateLimiter.js';
import jwt from 'jsonwebtoken';
import ess from './security/essEngine.js';
import { askEzTalkAI } from './services/aiService.js';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { console.error('FATAL: JWT_SECRET environment variable is not set in production. Exiting.'); process.exit(1); })()
  : 'eztalk_jwt_secret_dev_key_2026');
const AI_BOT_ENABLED = false;

// Force Google Public DNS for reliable MongoDB Atlas SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable trust proxy for correct client IP detection behind Render, Vercel, and Nginx reverse proxies
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (мобильные клиенты, curl, PWA standalone)
    if (!origin) return callback(null, true);

    // Очищаем origin от хвостового слэша для точного сравнения
    const cleanOrigin = origin.replace(/\/$/, '');

    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('vercel.app');

    if (isAllowed) {
      return callback(null, true);
    }

    // ВАЖНО: Не бросать new Error(), а возвращать false или мягко пропускать
    console.warn(`[CORS Blocked] Origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 15000,
  pingInterval: 10000,
});

ess.attach(io);
ess.clearAllBans();


app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Force HTTPS in production (Render, Vercel, Fly.io, etc.)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Middleware проверки JWT для защищенных API роутов
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}


const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eztalk_db';

// Normalized handle helper
export function normalizeHandle(handle) {
  if (!handle || typeof handle !== 'string') return '';
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

// Local Fallback Uploads Directory (for offline PC development)
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Apply global API rate limiter (excluding auth and specific routes)
app.use('/api', apiRateLimiter);

// Supabase Storage Configuration (Strictly required on Render due to ephemeral filesystem)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'chat-attachments';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`⚡ Supabase Storage configured successfully (Bucket: ${supabaseBucket}).`);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
} else {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.warn(
      '⚠️ CRITICAL WARNING: SUPABASE credentials are NOT set! On Render, local uploads/ are ephemeral and will be wiped on restart/sleep. Set SUPABASE_URL and SUPABASE_KEY in Render Environment variables.'
    );
  } else {
    console.log('ℹ️ Running local upload storage fallback in uploads/ folder (Supabase Storage not configured).');
  }
}

// Strict 10MB limit to prevent storage overload and server OOM (Out Of Memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB strict limit
});

let isMongoConnected = false;

// Preset Guaranteed Working EzTalk Branded Avatars
function createEzTalkSvg(strokeColor, glowColor = strokeColor, bgColor = '#0A0D14') {
  const safeId = strokeColor.replace(/[^a-zA-Z0-9]/g, '');
  return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="${bgColor}"/><defs><radialGradient id="glow_${safeId}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${glowColor}" stop-opacity="0.28"/><stop offset="100%" stop-color="${glowColor}" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="58" r="44" fill="url(#glow_${safeId})"/><path d="M50 34C36.7452 34 26 44.7452 26 58C26 71.2548 36.7452 82 50 82H52L46 96L64 86C82 86 94 76 94 58C94 44.7452 83.2548 34 70 34H50Z" stroke="${strokeColor}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="48" cy="58" r="4.5" fill="${strokeColor}"/><circle cx="60" cy="58" r="4.5" fill="${strokeColor}"/><circle cx="72" cy="58" r="4.5" fill="${strokeColor}"/></svg>`;
}
const toUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const CURATED_AVATARS = [
  toUri(createEzTalkSvg('#00E599')),
  toUri(createEzTalkSvg('#A855F7')),
  toUri(createEzTalkSvg('#00D2FF')),
  toUri(createEzTalkSvg('#F59E0B')),
  toUri(createEzTalkSvg('#FF3366')),
  toUri(createEzTalkSvg('#10B981')),
  toUri(createEzTalkSvg('#E4E4E7')),
  toUri(createEzTalkSvg('#FBBF24')),
];

// Helper functions for Local JSON Store
function readLocalDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.groups) parsed.groups = [];
      if (!parsed.conversations) parsed.conversations = [];
      return parsed;
    }
  } catch (err) {
    console.error('Error reading local JSON DB:', err);
  }
  const initial = { users: [], messages: [], groups: [], conversations: [] };
  writeLocalDB(initial);
  return initial;
}

function writeLocalDB(data) {
  try {
    if (!data.groups) data.groups = [];
    if (!data.conversations) data.conversations = [];
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
    await seedAIUser();
    await migratePlaintextMessages();
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
    await seedAIUser();
    await migratePlaintextMessages();
  } catch (err) {
    isMongoConnected = false;
    mongoConnectionError = err.message;
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('ℹ️ Running with high-performance Local JSON Database.');
    readLocalDB();
    await seedAIUser();
    await migratePlaintextMessages();
  }
}

async function seedAIUser() {
  if (!AI_BOT_ENABLED) return;

  const aiData = {
    handle: '@ai',
    name: 'EzTalk AI',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=EzTalkAI',
    bio: 'Your personal AI study buddy & homework assistant',
    status: 'Online',
    statusEmoji: '🤖',
  };
  
  if (isMongoConnected) {
    try {
      const existing = await UserModel.findOne({ handle: '@ai' });
      if (!existing) {
        await UserModel.create({ ...aiData, id: 'user_ai', friends: [] });
        console.log('AI User seeded in MongoDB');
      }
    } catch (err) {
      console.error('Error seeding AI user in MongoDB', err);
    }
  } else {
    const db = readLocalDB();
    if (!db.users.find((u) => u.handle === '@ai')) {
      db.users.unshift({ ...aiData, id: 'user_ai', friends: [] });
      writeLocalDB(db);
      console.log('AI User seeded in JSON DB');
    }
  }
}

connectDatabase();

async function upsertConversation(sHandle, rHandle, messageData) {
  if (!sHandle || !rHandle || sHandle === rHandle) return;
  const p = [sHandle, rHandle].sort();
  const convId = `conv_${p[0]}_${p[1]}`;

  // Encrypt lastMessage text and replyTo.text so it's NEVER in plaintext in DB
  let encryptedLastMessage = null;
  if (messageData && typeof messageData === 'object') {
    encryptedLastMessage = {
      ...messageData,
      text: isEncrypted(messageData.text) ? messageData.text : encryptMessage(messageData.text || ''),
    };
    if (encryptedLastMessage.replyTo && typeof encryptedLastMessage.replyTo === 'object' && encryptedLastMessage.replyTo.text) {
      encryptedLastMessage.replyTo = {
        ...encryptedLastMessage.replyTo,
        text: isEncrypted(encryptedLastMessage.replyTo.text) ? encryptedLastMessage.replyTo.text : encryptMessage(encryptedLastMessage.replyTo.text),
      };
    }
  }

  if (isMongoConnected) {
    try {
      await ConversationModel.findOneAndUpdate(
        { id: convId },
        {
          $set: {
            participants: p,
            lastMessage: encryptedLastMessage,
          },
          $pull: { deletedBy: { $in: p } },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('Mongo upsertConversation error:', err);
    }
  } else {
    const db = readLocalDB();
    let conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      conv = {
        id: convId,
        participants: p,
        deletedBy: [],
        createdAt: new Date().toISOString(),
      };
      db.conversations.push(conv);
    }
    conv.lastMessage = encryptedLastMessage;
    conv.updatedAt = new Date().toISOString();
    conv.deletedBy = conv.deletedBy.filter((h) => h !== sHandle && h !== rHandle);
    writeLocalDB(db);
  }
}

// Автоматическая миграция: шифрование существующих открытых сообщений в MongoDB и LocalDB
async function migratePlaintextMessages() {
  try {
    if (isMongoConnected) {
      // 1. Шифрование сообщений в MessageModel
      const cursor = MessageModel.find({ text: { $exists: true, $ne: '' } }).cursor();
      let updatedMessages = 0;
      for await (const doc of cursor) {
        let changed = false;
        if (doc.text && !isEncrypted(doc.text)) {
          doc.text = encryptMessage(doc.text);
          changed = true;
        }
        if (doc.replyTo && typeof doc.replyTo === 'object' && doc.replyTo.text && !isEncrypted(doc.replyTo.text)) {
          doc.replyTo.text = encryptMessage(doc.replyTo.text);
          doc.markModified('replyTo');
          changed = true;
        }
        if (changed) {
          await doc.save();
          updatedMessages++;
        }
      }
      if (updatedMessages > 0) {
        console.log(`🔒 [Crypto Migration] Encrypted ${updatedMessages} existing plaintext messages in MongoDB.`);
      }

      // 2. Шифрование превью в ConversationModel
      const convCursor = ConversationModel.find({ 'lastMessage.text': { $exists: true, $ne: '' } }).cursor();
      let updatedConvs = 0;
      for await (const conv of convCursor) {
        let changed = false;
        if (conv.lastMessage && conv.lastMessage.text && !isEncrypted(conv.lastMessage.text)) {
          conv.lastMessage.text = encryptMessage(conv.lastMessage.text);
          changed = true;
        }
        if (conv.lastMessage && conv.lastMessage.replyTo && typeof conv.lastMessage.replyTo === 'object' && conv.lastMessage.replyTo.text && !isEncrypted(conv.lastMessage.replyTo.text)) {
          conv.lastMessage.replyTo.text = encryptMessage(conv.lastMessage.replyTo.text);
          changed = true;
        }
        if (changed) {
          conv.markModified('lastMessage');
          await conv.save();
          updatedConvs++;
        }
      }
      if (updatedConvs > 0) {
        console.log(`🔒 [Crypto Migration] Encrypted ${updatedConvs} existing conversation previews in MongoDB.`);
      }
    } else {
      const db = readLocalDB();
      let changed = false;
      if (Array.isArray(db.messages)) {
        db.messages.forEach((m) => {
          if (m.text && !isEncrypted(m.text)) {
            m.text = encryptMessage(m.text);
            changed = true;
          }
          if (m.replyTo && typeof m.replyTo === 'object' && m.replyTo.text && !isEncrypted(m.replyTo.text)) {
            m.replyTo.text = encryptMessage(m.replyTo.text);
            changed = true;
          }
        });
      }
      if (Array.isArray(db.conversations)) {
        db.conversations.forEach((c) => {
          if (c.lastMessage && c.lastMessage.text && !isEncrypted(c.lastMessage.text)) {
            c.lastMessage.text = encryptMessage(c.lastMessage.text);
            changed = true;
          }
          if (c.lastMessage && c.lastMessage.replyTo && typeof c.lastMessage.replyTo === 'object' && c.lastMessage.replyTo.text && !isEncrypted(c.lastMessage.replyTo.text)) {
            c.lastMessage.replyTo.text = encryptMessage(c.lastMessage.replyTo.text);
            changed = true;
          }
        });
      }
      if (changed) {
        writeLocalDB(db);
        console.log('🔒 [Crypto Migration] Encrypted existing plaintext records in local database.');
      }
    }
  } catch (err) {
    console.error('🔒 [Crypto Migration] Error:', err.message);
  }
}

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



// Upload Attachment File or Audio (Supabase Storage on Render, uploads/ fallback on local PC)
app.post('/api/upload', uploadRateLimiter, authenticateToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Файл слишком большой. Лимит — 10 МБ' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const file = req.file;
      const originalName = file.originalname || 'attachment';
      const ext = path.extname(originalName) || '';
      const mimeType = file.mimetype || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isAudio = mimeType.startsWith('audio/');
      const fileType = isImage ? 'image' : isAudio ? 'audio' : 'file';
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

      if (supabase) {
        const cleanBase = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${Date.now()}_${cleanBase}${ext}`;

        const { data, error } = await supabase.storage
          .from(supabaseBucket)
          .upload(fileName, file.buffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (error) {
          console.error('Supabase storage upload error:', error);
          throw new Error(error.message || 'Supabase upload failed');
        }

        const { data: urlData } = supabase.storage
          .from(supabaseBucket)
          .getPublicUrl(fileName);

        return res.json({
          url: urlData.publicUrl,
          name: originalName,
          type: fileType,
          size: sizeStr,
        });
      } else {
        const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, safeName);
        fs.writeFileSync(targetPath, file.buffer);

        const host = req.get('host');
        const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = host ? `${protocol}://${host}/uploads/${safeName}` : `/uploads/${safeName}`;

        return res.json({
          url: fileUrl,
          name: originalName,
          type: fileType,
          size: sizeStr,
        });
      }
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      res.status(500).json({ error: uploadErr.message || 'File upload failed' });
    }
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
  const formatted = {
    ...obj,
    text: decryptMessage(obj.text || ''),
  };
  if (formatted.replyTo && typeof formatted.replyTo === 'object' && formatted.replyTo.text) {
    formatted.replyTo = {
      ...formatted.replyTo,
      text: decryptMessage(formatted.replyTo.text),
    };
  }
  return formatted;
}

// Auth Login (Rate-limited against brute-force attacks)
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ error: 'Username or email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const clean = identifier.trim().toLowerCase();
    const handleClean = clean.startsWith('@') ? clean : `@${clean}`;

    let user = null;
    let localDB = null;

    if (isMongoConnected) {
      user = await UserModel.findOne({
        $or: [{ handle: handleClean }, { email: clean }],
      }).select('+password'); // password has select:false in schema — must be explicitly requested
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

    const token = jwt.sign(
      { id: user.id || user._id, handle: user.handle },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    return res.json({ user: formatUser(user), token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth Register (Protected by Honeypot & Rate Limiting)
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  try {
    // 1. Honeypot check: Bots auto-fill hidden trap fields (b_username, bot_field, website)
    if (req.body.b_username || req.body.bot_field || req.body.website) {
      return res.status(200).json({ success: true, message: 'Account registered' });
    }

    const { name, handle, email, password, avatar, bio } = req.body;
    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Username handle is required' });
    }

    const cleanHandle = normalizeHandle(handle);
    const rawHandle = cleanHandle.replace(/^@/, '');

    // Handle character and length validation: 3-20 alphanumeric characters or underscores
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(rawHandle)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
      });
    }

    // Password validation: minimum 8 characters
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
      });
    }

    // Email validation: RFC compliant if provided
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
      const token = jwt.sign(
        { id: user.id || user._id, handle: user.handle },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({ user: formatted, token });
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
      const token = jwt.sign(
        { id: user.id || user._id, handle: user.handle },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({ user: formatted, token });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Users (authenticated — prevents anonymous user enumeration)
app.get('/api/users', authenticateToken, async (req, res) => {
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

app.get('/api/conversations', authenticateToken, async (req, res) => {
  const currentHandle = normalizeHandle(req.user.handle);
  try {
    if (isMongoConnected) {
      const convs = await ConversationModel.find({
        participants: currentHandle,
        deletedBy: { $ne: currentHandle }
      }).sort({ updatedAt: -1 }).lean();
      const formattedConvs = convs.map((c) => ({
        ...c,
        lastMessage: c.lastMessage ? formatMessage(c.lastMessage) : null,
      }));
      return res.json({ conversations: formattedConvs });
    } else {
      const db = readLocalDB();
      const convs = db.conversations
        .filter((c) => c.participants.includes(currentHandle) && !c.deletedBy.includes(currentHandle))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const formattedConvs = convs.map((c) => ({
        ...c,
        lastMessage: c.lastMessage ? formatMessage(c.lastMessage) : null,
      }));
      return res.json({ conversations: formattedConvs });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/conversations/:targetHandle', authenticateToken, async (req, res) => {
  const currentHandle = normalizeHandle(req.user.handle);
  const targetHandle = normalizeHandle(req.params.targetHandle);
  const p = [currentHandle, targetHandle].sort();
  const convId = `conv_${p[0]}_${p[1]}`;

  try {
    if (isMongoConnected) {
      await ConversationModel.findOneAndUpdate(
        { id: convId },
        { $addToSet: { deletedBy: currentHandle } }
      );
    } else {
      const db = readLocalDB();
      const conv = db.conversations.find(c => c.id === convId);
      if (conv && !conv.deletedBy.includes(currentHandle)) {
        conv.deletedBy.push(currentHandle);
        writeLocalDB(db);
      }
    }
    io.to(`user_${currentHandle}`).emit('chat_deleted', { targetHandle });
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (Supports both PUT and PATCH for Cross-Device Persistence)
app.all(['/api/users/profile', '/api/users/settings'], authenticateToken, async (req, res, next) => {
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
      desktopNotifications,
      floatingToasts,
      callRingtones,
      enterToSend,
      compactMode,
      settings,
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
        ...(desktopNotifications !== undefined && { desktopNotifications: Boolean(desktopNotifications) }),
        ...(floatingToasts !== undefined && { floatingToasts: Boolean(floatingToasts) }),
        ...(callRingtones !== undefined && { callRingtones: Boolean(callRingtones) }),
        ...(enterToSend !== undefined && { enterToSend: Boolean(enterToSend) }),
        ...(compactMode !== undefined && { compactMode: Boolean(compactMode) }),
        ...(settings !== undefined && { settings }),
        ...(bio !== undefined && { bio }),
        ...(Array.isArray(blockedUsers) && { blockedUsers: blockedUsers.map(normalizeHandle) }),
        ...(Array.isArray(friends) && { friends: friends.map(normalizeHandle) }),
      };

      const query = (id && mongoose.Types.ObjectId.isValid(id))
        ? { $or: [{ _id: id }, { handle: prevHandle }] }
        : { handle: prevHandle };
      const updated = await UserModel.findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after', upsert: true }
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
          accentColor: accentColor !== undefined ? accentColor : db.users[idx].accentColor || '#10B981',
          theme: theme !== undefined ? theme : db.users[idx].theme || 'neon',
          soundNotifications: soundNotifications !== undefined ? Boolean(soundNotifications) : db.users[idx].soundNotifications !== false,
          desktopNotifications: desktopNotifications !== undefined ? Boolean(desktopNotifications) : db.users[idx].desktopNotifications !== false,
          floatingToasts: floatingToasts !== undefined ? Boolean(floatingToasts) : db.users[idx].floatingToasts !== false,
          callRingtones: callRingtones !== undefined ? Boolean(callRingtones) : db.users[idx].callRingtones !== false,
          enterToSend: enterToSend !== undefined ? Boolean(enterToSend) : db.users[idx].enterToSend !== false,
          compactMode: compactMode !== undefined ? Boolean(compactMode) : Boolean(db.users[idx].compactMode),
          settings: settings !== undefined ? settings : (db.users[idx].settings || {}),
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
          accentColor: accentColor || '#10B981',
          theme: theme || 'neon',
          soundNotifications: soundNotifications !== undefined ? Boolean(soundNotifications) : true,
          desktopNotifications: desktopNotifications !== undefined ? Boolean(desktopNotifications) : true,
          floatingToasts: floatingToasts !== undefined ? Boolean(floatingToasts) : true,
          callRingtones: callRingtones !== undefined ? Boolean(callRingtones) : true,
          enterToSend: enterToSend !== undefined ? Boolean(enterToSend) : true,
          compactMode: Boolean(compactMode),
          settings: settings || {},
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
app.post('/api/users/:handle/block', authenticateToken, async (req, res) => {
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
      // FIX: Use formatUser() to strip password hash before broadcasting
      io.emit('user_updated', formatUser(db.users[idx]));
      res.json({ success: true, blockedUsers: db.users[idx].blockedUsers });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle / Add / Remove Friend (Mutual cross-device persistence)
app.post('/api/users/:handle/friends', authenticateToken, async (req, res) => {
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

// Update Contact Alias
app.patch('/api/users/:handle/contacts/alias', authenticateToken, async (req, res) => {
  try {
    const userHandle = normalizeHandle(req.params.handle);
    const { targetHandle, aliasName } = req.body;
    const cleanTarget = normalizeHandle(targetHandle);

    if (req.user.handle !== userHandle) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!cleanTarget) {
      return res.status(400).json({ error: 'Target handle is required.' });
    }
    if (typeof aliasName === 'string' && aliasName.trim().length > 50) {
      return res.status(400).json({ error: 'Alias must be 50 characters or less.' });
    }

    if (isMongoConnected) {
      const user = await UserModel.findOne({ handle: userHandle });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (!user.contactAliases) user.contactAliases = {};
      
      if (!aliasName || aliasName.trim() === '') {
        delete user.contactAliases[cleanTarget];
      } else {
        user.contactAliases[cleanTarget] = aliasName.trim();
      }
      
      user.markModified('contactAliases');
      await user.save();
      
      io.to(userHandle).emit('profile_updated', formatUser(user));
      res.json({ success: true, contactAliases: user.contactAliases });
    } else {
      const db = readLocalDB();
      const idx = db.users.findIndex((u) => u.handle.toLowerCase() === userHandle);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });

      if (!db.users[idx].contactAliases) db.users[idx].contactAliases = {};
      
      if (!aliasName || aliasName.trim() === '') {
        delete db.users[idx].contactAliases[cleanTarget];
      } else {
        db.users[idx].contactAliases[cleanTarget] = aliasName.trim();
      }

      writeLocalDB(db);
      io.to(userHandle).emit('profile_updated', formatUser(db.users[idx]));
      res.json({ success: true, contactAliases: db.users[idx].contactAliases });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages for a Group (Cursor pagination, Decrypted on retrieval)
app.get(['/api/groups/:groupId/messages', '/api/messages/group/:groupId'], async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const before = req.query.before ? String(req.query.before) : null;
    const key = `group__${groupId}`;

    if (isMongoConnected) {
      const query = {
        $or: [{ conversationKey: key }, { groupId }],
      };
      if (before) {
        const cursorDate = new Date(before);
        if (!isNaN(cursorDate.getTime())) {
          query.createdAt = { $lt: cursorDate };
        }
      }

      const messages = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = messages.length > limit;
      const pageMessages = hasMore ? messages.slice(0, limit) : messages;

      res.json({
        messages: pageMessages.reverse().map(formatMessage),
        hasMore,
      });
    } else {
      const db = readLocalDB();
      let msgs = (db.messages || []).filter((m) => m.conversationKey === key || m.groupId === groupId);

      if (before) {
        const cursorTime = new Date(before).getTime();
        if (!isNaN(cursorTime)) {
          msgs = msgs.filter((m) => new Date(m.createdAt || 0).getTime() < cursorTime);
        }
      }

      msgs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const hasMore = msgs.length > limit;
      const pageMessages = hasMore ? msgs.slice(0, limit) : msgs;

      res.json({
        messages: pageMessages.reverse().map(formatMessage),
        hasMore,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Last Messages for all conversations of a user (Decrypted on retrieval)
app.get('/api/conversations/recent/:handle', authenticateToken, async (req, res) => {
  try {
    const rawHandle = normalizeHandle(req.params.handle);
    // FIX: Enforce identity — callers can only fetch their own recent conversations
    if (normalizeHandle(req.user.handle) !== rawHandle) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own conversations.' });
    }
    const handleClean = rawHandle.toLowerCase();

    let allMessages = [];
    if (isMongoConnected) {
      allMessages = await MessageModel.find({
        $or: [
          { senderHandle: { $regex: new RegExp(`^${rawHandle.replace('@', '')}$`, 'i') } },
          { recipientHandle: { $regex: new RegExp(`^${rawHandle.replace('@', '')}$`, 'i') } },
          { senderHandle: { $regex: new RegExp(`^@${rawHandle.replace('@', '')}$`, 'i') } },
          { recipientHandle: { $regex: new RegExp(`^@${rawHandle.replace('@', '')}$`, 'i') } },
          { groupId: { $ne: null } },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      const db = readLocalDB();
      allMessages = (db.messages || [])
        .filter((m) => {
          const s = normalizeHandle(m.senderHandle || '').toLowerCase();
          const r = normalizeHandle(m.recipientHandle || '').toLowerCase();
          return s === handleClean || r === handleClean || Boolean(m.groupId);
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    const recentMap = {};
    for (const msg of allMessages) {
      let chatKey = '';
      if (msg.groupId) {
        chatKey = `group__${msg.groupId}`;
      } else {
        const s = normalizeHandle(msg.senderHandle || '').toLowerCase();
        const r = normalizeHandle(msg.recipientHandle || '').toLowerCase();
        if (s === handleClean && r === handleClean) {
          chatKey = 'saved_messages';
        } else if (s === handleClean) {
          chatKey = r;
        } else {
          chatKey = s;
        }
      }

      if (chatKey && !recentMap[chatKey]) {
        const formatted = formatMessage(msg);
        recentMap[chatKey] = formatted;
        if (chatKey.startsWith('group__')) {
          recentMap[msg.groupId] = formatted;
        }
      }
    }

    res.json({ recent: recentMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages between two users (Cursor pagination, Decrypted on retrieval)
app.get('/api/messages/:handle1/:handle2', authenticateToken, async (req, res) => {
  try {
    const { handle1, handle2 } = req.params;
    // Bug 1 fix: only participants can read their own conversation
    const userHandle = normalizeHandle(req.user?.handle);
    const h1 = normalizeHandle(handle1);
    const h2 = normalizeHandle(handle2);
    if (userHandle !== h1 && userHandle !== h2) {
      return res.status(403).json({ error: 'Forbidden: You cannot read messages from this conversation' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const before = req.query.before ? String(req.query.before) : null;
    const key = getConversationKey(handle1, handle2);

    if (isMongoConnected) {
      const query = { conversationKey: key };
      if (before) {
        const cursorDate = new Date(before);
        if (!isNaN(cursorDate.getTime())) {
          query.createdAt = { $lt: cursorDate };
        }
      }

      const messages = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = messages.length > limit;
      const pageMessages = hasMore ? messages.slice(0, limit) : messages;

      res.json({
        messages: pageMessages.reverse().map(formatMessage),
        hasMore,
      });
    } else {
      const db = readLocalDB();
      let msgs = (db.messages || []).filter((m) => m.conversationKey === key);

      if (before) {
        const cursorTime = new Date(before).getTime();
        if (!isNaN(cursorTime)) {
          msgs = msgs.filter((m) => new Date(m.createdAt || 0).getTime() < cursorTime);
        }
      }

      msgs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const hasMore = msgs.length > limit;
      const pageMessages = hasMore ? msgs.slice(0, limit) : msgs;

      res.json({
        messages: pageMessages.reverse().map(formatMessage),
        hasMore,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post New Message (Encrypted at rest with AES-256-GCM)
// --- Anti-Spam & Block Enforcement ---
const userSpamRecords = new Map(); // handle -> { timestamps: [], cooldownUntil: number }

const isBlockedBy = async (senderHandle, recipientHandle) => {
  const rHandle = normalizeHandle(recipientHandle);
  const sHandle = normalizeHandle(senderHandle);
  if (!rHandle || !sHandle) return false;
  
  if (isMongoConnected) {
    const user = await UserModel.findOne({ handle: rHandle });
    return user && Array.isArray(user.blockedUsers) && user.blockedUsers.includes(sHandle);
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.handle.toLowerCase() === rHandle);
    return user && Array.isArray(user.blockedUsers) && user.blockedUsers.includes(sHandle);
  }
};
// -------------------------------------

// --- AI Bot Processing Logic ---
const aiQueues = new Map();

async function processAIBot(sHandle, userText) {
  if (!AI_BOT_ENABLED) return;

  if (!aiQueues.has(sHandle)) {
    aiQueues.set(sHandle, Promise.resolve());
  }

  const currentQueue = aiQueues.get(sHandle);

  const nextQueue = currentQueue.then(async () => {
    const startTime = Date.now();
    console.log(`[AI] Processing message from ${sHandle}...`);
    try {
      io.to(sHandle).emit('user_typing', { senderHandle: '@ai', recipientHandle: sHandle, isTyping: true });
      
      // Fetch last 6 messages for context
      let history = [];
      const convKey = getConversationKey(sHandle, '@ai');
      if (isMongoConnected) {
         history = await MessageModel.find({ conversationKey: convKey })
           .sort({ createdAt: -1 })
           .limit(6)
           .lean();
      } else {
         const db = readLocalDB();
         history = (db.messages || [])
           .filter(m => m.conversationKey === convKey)
           .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
           .slice(0, 6);
      }
      
      const formattedHistory = history.reverse().map(m => ({
         role: m.senderHandle === '@ai' ? 'model' : 'user',
         parts: [{ text: decryptMessage(m.text || '') }]
      }));

      const replyText = await askEzTalkAI(userText, formattedHistory);
      
      const aiMessageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationKey: convKey,
        senderHandle: '@ai',
        recipientHandle: sHandle,
        text: encryptMessage(replyText),
        isEdited: false,
        isForwarded: false,
        status: 'sent',
        timestamp: 'Sent by AI',
        createdAt: new Date().toISOString(),
      };

      if (isMongoConnected) {
         const saved = await MessageModel.create(aiMessageData);
         const formatted = formatMessage(saved);
         io.to(sHandle).emit('new_message', formatted);
         await upsertConversation('@ai', sHandle, formatted);
      } else {
         const db = readLocalDB();
         db.messages.push(aiMessageData);
         writeLocalDB(db);
         const formatted = formatMessage(aiMessageData);
         io.to(sHandle).emit('new_message', formatted);
         await upsertConversation('@ai', sHandle, formatted);
      }

      const duration = Date.now() - startTime;
      console.log(`[AI] Response sent in ${duration}ms`);
    } catch (err) {
      console.error('AI Bot Error:', err);
    } finally {
      io.to(sHandle).emit('user_typing', { senderHandle: '@ai', recipientHandle: sHandle, isTyping: false });
    }
  });

  aiQueues.set(sHandle, nextQueue.catch(() => {}));
}

app.post('/api/messages', authenticateToken, messageRateLimiter, async (req, res) => {
  try {
    const {
      id,
      tempId,
      senderHandle,
      recipientHandle,
      groupId,
      text,
      attachment,
      replyTo,
      callInfo,
      isForwarded,
      forwardedFrom,
      isSecret,
      forwardRestricted,
      timestamp,
    } = req.body;
    // FIX: Never trust req.body for sender identity — always derive from verified JWT
    const sHandle = normalizeHandle(req.user.handle);
    // If body explicitly provides a mismatching senderHandle, reject to prevent spoofing
    if (senderHandle && normalizeHandle(senderHandle) !== sHandle) {
      return res.status(403).json({ error: 'Forbidden: senderHandle does not match authenticated user.' });
    }
    let key;
    let rHandle = null;

    // Spam check
    const now = Date.now();
    let spamRecord = userSpamRecords.get(sHandle) || { timestamps: [], cooldownUntil: 0 };
    
    if (now < spamRecord.cooldownUntil) {
      const cooldownSeconds = Math.ceil((spamRecord.cooldownUntil - now) / 1000);
      io.to(sHandle).emit('spam_warning', { cooldownSeconds, message: 'Too many messages. Please wait.' });
      return res.status(429).json({ error: 'Too many messages. You are in cooldown.', cooldownSeconds });
    }
    
    spamRecord.timestamps = spamRecord.timestamps.filter(t => now - t <= 3000);
    spamRecord.timestamps.push(now);
    
    if (spamRecord.timestamps.length > 5) {
      spamRecord.cooldownUntil = now + 30000;
      userSpamRecords.set(sHandle, spamRecord);
      io.to(sHandle).emit('spam_warning', { cooldownSeconds: 30, message: 'Too many messages. Please wait.' });
      return res.status(429).json({ error: 'Spam detected. Muted for 30 seconds.', cooldownSeconds: 30 });
    }
    userSpamRecords.set(sHandle, spamRecord);

    if (groupId) {
      key = `group__${groupId}`;
    } else {
      rHandle = normalizeHandle(recipientHandle);
      key = getConversationKey(sHandle, rHandle);
      
      const blocked = await isBlockedBy(sHandle, rHandle);
      if (blocked) {
        return res.status(403).json({ error: 'blocked' });
      }
    }

    const plainText = text || '';
    const encryptedText = isEncrypted(plainText) ? plainText : encryptMessage(plainText);

    let encryptedReplyTo = replyTo || null;
    if (encryptedReplyTo && typeof encryptedReplyTo === 'object' && encryptedReplyTo.text && !isEncrypted(encryptedReplyTo.text)) {
      encryptedReplyTo = {
        ...encryptedReplyTo,
        text: encryptMessage(encryptedReplyTo.text),
      };
    }

    const realId = (id && !id.startsWith('temp_')) ? id : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveTempId = tempId || (id && id.startsWith('temp_') ? id : null);

    const messageData = {
      id: realId,
      tempId: effectiveTempId,
      conversationKey: key,
      groupId: groupId || null,
      senderHandle: sHandle,
      recipientHandle: rHandle,
      text: encryptedText,
      attachment: attachment || null,
      replyTo: encryptedReplyTo,
      callInfo: callInfo || null,
      reactions: {},
      isEdited: false,
      isForwarded: Boolean(isForwarded),
      forwardedFrom: forwardedFrom || null,
      isSecret: Boolean(isSecret),
      forwardRestricted: Boolean(forwardRestricted),
      status: 'sent',
      timestamp: timestamp || 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    if (isMongoConnected) {
      const saved = await MessageModel.create(messageData);
      const formatted = formatMessage(saved);
      if (groupId) {
        io.to(`group_${groupId}`).emit('new_message', formatted);
      } else {
        if (rHandle) io.to(rHandle).emit('new_message', formatted);
        if (sHandle && sHandle !== rHandle) io.to(sHandle).emit('new_message', formatted);
        await upsertConversation(sHandle, rHandle, formatted);
      }
      res.json({ message: formatted });
    } else {
      const db = readLocalDB();
      db.messages.push(messageData);
      writeLocalDB(db);
      const formatted = formatMessage(messageData);
      if (groupId) {
        io.to(`group_${groupId}`).emit('new_message', formatted);
      } else {
        if (rHandle) io.to(rHandle).emit('new_message', formatted);
        if (sHandle && sHandle !== rHandle) io.to(sHandle).emit('new_message', formatted);
        await upsertConversation(sHandle, rHandle, formatted);
      }
      res.json({ message: formatted });
    }
    
    // Trigger AI processing if recipient is the AI bot
    if (rHandle === '@ai' && !groupId && plainText) {
      processAIBot(sHandle, plainText);
      
      // Auto-read the message by the bot
      // FIX: Wrap in try/catch to prevent unhandled promise rejection crashing Node 18+
      setTimeout(async () => {
        try {
          if (isMongoConnected) {
            await MessageModel.updateMany(
              { conversationKey: key, recipientHandle: '@ai', status: { $ne: 'read' } },
              { $set: { status: 'read' } }
            );
          } else {
            const db = readLocalDB();
            let updated = false;
            db.messages.forEach((m) => {
              if (m.conversationKey === key && m.recipientHandle === '@ai' && m.status !== 'read') {
                m.status = 'read';
                updated = true;
              }
            });
            if (updated) writeLocalDB(db);
          }
          io.to(sHandle).emit('messages_read', { conversationKey: key, readerHandle: '@ai' });
        } catch (aiReadErr) {
          console.error('[AI auto-read] Unhandled error:', aiReadErr);
        }
      }, 500);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Edit Message (Encrypted at rest with AES-256-GCM)
app.put('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const callerHandle = normalizeHandle(req.user.handle);
    const encryptedText = encryptMessage(text || '');

    if (isMongoConnected) {
      // FIX: Verify ownership before editing — prevents any user editing others' messages
      const existing = await MessageModel.findOne({ id }).lean();
      if (!existing) return res.status(404).json({ error: 'Message not found' });
      if (normalizeHandle(existing.senderHandle) !== callerHandle) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own messages.' });
      }
      const updated = await MessageModel.findOneAndUpdate(
        { id },
        { $set: { text: encryptedText, isEdited: true } },
        { returnDocument: 'after' }
      ).lean();
      io.emit('message_edited', { id, text, isEdited: true });
      res.json({ message: formatMessage(updated) });
    } else {
      const db = readLocalDB();
      const msg = db.messages.find((m) => m.id === id);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      // FIX: Ownership check for local DB path too
      if (normalizeHandle(msg.senderHandle) !== callerHandle) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own messages.' });
      }
      msg.text = encryptedText;
      msg.isEdited = true;
      writeLocalDB(db);
      io.emit('message_edited', { id, text, isEdited: true });
      res.json({ message: formatMessage(msg) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hard Delete Message (Permanently removed from MongoDB and Local DB)
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const callerHandle = normalizeHandle(req.user?.handle);

    if (isMongoConnected) {
      // Bug 3 fix: find message first to verify ownership and target socket rooms
      const msgToDelete = await MessageModel.findOne({ id }).lean();
      if (!msgToDelete) return res.status(404).json({ error: 'Message not found' });
      if (normalizeHandle(msgToDelete.senderHandle) !== callerHandle) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
      }
      await MessageModel.deleteOne({ id });
      if (msgToDelete.groupId) {
        io.to(`group_${msgToDelete.groupId}`).emit('message_deleted', { id });
      } else {
        if (msgToDelete.senderHandle) io.to(msgToDelete.senderHandle).emit('message_deleted', { id });
        if (msgToDelete.recipientHandle && msgToDelete.recipientHandle !== msgToDelete.senderHandle) {
          io.to(msgToDelete.recipientHandle).emit('message_deleted', { id });
        }
      }
      res.json({ success: true, id });
    } else {
      const db = readLocalDB();
      const msgToDelete = db.messages.find((m) => m.id === id);
      if (!msgToDelete) return res.status(404).json({ error: 'Message not found' });
      if (normalizeHandle(msgToDelete.senderHandle) !== callerHandle) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
      }
      db.messages = db.messages.filter((m) => m.id !== id);
      writeLocalDB(db);
      if (msgToDelete.groupId) {
        io.to(`group_${msgToDelete.groupId}`).emit('message_deleted', { id });
      } else {
        if (msgToDelete.senderHandle) io.to(msgToDelete.senderHandle).emit('message_deleted', { id });
        if (msgToDelete.recipientHandle && msgToDelete.recipientHandle !== msgToDelete.senderHandle) {
          io.to(msgToDelete.recipientHandle).emit('message_deleted', { id });
        }
      }
      res.json({ success: true, id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Chat History (Permanently remove all messages between user and target)
app.delete('/api/messages/history/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isGroup = req.query.isGroup === 'true';
    const currentUserHandle = normalizeHandle(req.user.handle);
    const targetHandle = normalizeHandle(id);

    if (isGroup) {
      // FIX: Verify group membership before allowing bulk message deletion
      let group = null;
      if (isMongoConnected) {
        group = await GroupModel.findOne({ id }).lean();
      } else {
        const dbCheck = readLocalDB();
        group = (dbCheck.groups || []).find((g) => g.id === id) || null;
      }
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!Array.isArray(group.memberHandles) || !group.memberHandles.map(normalizeHandle).includes(currentUserHandle)) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this group.' });
      }

      if (isMongoConnected) {
        await MessageModel.deleteMany({ groupId: id });
        io.emit('history_cleared', { targetId: id, isGroup: true });
        res.json({ success: true, targetId: id });
      } else {
        const db = readLocalDB();
        db.messages = db.messages.filter((m) => m.groupId !== id);
        writeLocalDB(db);
        io.emit('history_cleared', { targetId: id, isGroup: true });
        res.json({ success: true, targetId: id });
      }
    } else {
      const key = getConversationKey(currentUserHandle, targetHandle);
      if (isMongoConnected) {
        await MessageModel.deleteMany({ conversationKey: key });
        // Emit to both users to clear their history
        io.to(currentUserHandle).emit('history_cleared', { targetId: targetHandle, isGroup: false });
        io.to(targetHandle).emit('history_cleared', { targetId: currentUserHandle, isGroup: false });
        res.json({ success: true, targetId: id });
      } else {
        const db = readLocalDB();
        db.messages = db.messages.filter((m) => m.conversationKey !== key);
        writeLocalDB(db);
        io.to(currentUserHandle).emit('history_cleared', { targetId: targetHandle, isGroup: false });
        io.to(targetHandle).emit('history_cleared', { targetId: currentUserHandle, isGroup: false });
        res.json({ success: true, targetId: id });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Emoji Reaction on Message
app.post('/api/messages/:id/reaction', authenticateToken, async (req, res) => {
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

app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const { name, avatar, creatorHandle, memberHandles } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 50) {
      return res.status(400).json({ error: 'Group name must be between 3 and 50 characters long.' });
    }

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
      // Оповещаем только участников группы, чтобы не засорять эфир другим клиентам
      cleanMembers.forEach((handle) => {
        io.to(handle).emit('new_group', created);
      });
      return res.json({ group: created });
    } else {
      const db = readLocalDB();
      if (!db.groups) db.groups = [];
      db.groups.push(groupData);
      writeLocalDB(db);
      // Оповещаем только участников группы, чтобы не засорять эфир другим клиентам
      cleanMembers.forEach((handle) => {
        io.to(handle).emit('new_group', groupData);
      });
      return res.json({ group: groupData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Group
app.delete('/api/groups/:id', authenticateToken, async (req, res) => {
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
app.post('/api/messages/clear', authenticateToken, async (req, res) => {
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

// --- SOCKET.IO SECURE PRESENCE & SIGNALING ---
const socketHandleMap = new Map(); // socket.id -> handle
const disconnectTimers = new Map(); // handle -> timeoutId

// FIX (Medium): Periodic cleanup of userSpamRecords to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [handle, record] of userSpamRecords.entries()) {
    const allStale = record.timestamps.every((t) => now - t > 60000);
    if (record.cooldownUntil < now && allStale) {
      userSpamRecords.delete(handle);
    }
  }
}, 5 * 60 * 1000);

function getOnlineHandles() {
  return Array.from(new Set(socketHandleMap.values()));
}

// Socket Auth Middleware: проверяем JWT перед подключением
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded?.handle) {
        socket.verifiedHandle = normalizeHandle(decoded.handle);
      }
    });
  }
  next();
});

io.on('connection', (socket) => {
  // Send current online users immediately on connection
  socket.emit('online_users', getOnlineHandles());

  socket.on('join', (userHandle) => {
    // FIX (High): Only trust JWT-verified handle — never fall back to client-supplied value
    // Prevents unauthenticated sockets from injecting themselves into other users' rooms
    const handle = socket.verifiedHandle;
    if (!handle) {
      // Allow unverified sockets to exist but not join any user room
      // They'll be disconnected by ESS auth timeout
      return;
    }

    socket.join(handle);
    socketHandleMap.set(socket.id, handle);
    
    // Clear any pending offline timer if user reconnected fast
    if (disconnectTimers.has(handle)) {
      clearTimeout(disconnectTimers.get(handle));
      disconnectTimers.delete(handle);
    }
    
    io.emit('online_users', getOnlineHandles());
  });

  socket.on('join_group', async (groupId) => {
    if (groupId && socket.verifiedHandle) {
      if (isMongoConnected) {
        const group = await GroupModel.findOne({ id: groupId }).lean();
        if (group && Array.isArray(group.memberHandles) && group.memberHandles.includes(socket.verifiedHandle)) {
          socket.join(`group_${groupId}`);
        }
      } else {
        const db = readLocalDB();
        const group = (db.groups || []).find((g) => g.id === groupId);
        if (group && Array.isArray(group.memberHandles) && group.memberHandles.includes(socket.verifiedHandle)) {
          socket.join(`group_${groupId}`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    if (socketHandleMap.has(socket.id)) {
      const handle = socketHandleMap.get(socket.id);
      socketHandleMap.delete(socket.id);
      
      // Check if user still has other active sockets (e.g. multiple tabs)
      const isStillOnline = Array.from(socketHandleMap.values()).includes(handle);
      
      if (!isStillOnline) {
        // 5-second grace period before broadcasting offline status
        const timer = setTimeout(() => {
          io.emit('online_users', getOnlineHandles());
          
          const now = new Date();
          if (isMongoConnected) {
            UserModel.updateOne({ handle }, { $set: { lastSeen: now } }).catch(() => {});
          } else {
            const db = readLocalDB();
            const u = db.users.find((x) => normalizeHandle(x.handle) === normalizeHandle(handle));
            if (u) {
              u.lastSeen = now.toISOString();
              writeLocalDB(db);
            }
          }
          disconnectTimers.delete(handle);
        }, 5000);
        
        disconnectTimers.set(handle, timer);
      }
    }
  });

  // FIX (High): Per-socket block cache — avoids a DB query on every keypress
  // Cache is keyed by `sHandle:rHandle` and invalidated when user_updated fires on this socket
  const blockCache = new Map();

  // Invalidate block cache when any user profile changes (block/unblock may have changed)
  socket.on('user_updated', () => blockCache.clear());

  socket.on('typing', async ({ senderHandle, recipientHandle, isTyping }) => {
    const rHandle = normalizeHandle(recipientHandle);
    const sHandle = socket.verifiedHandle || normalizeHandle(senderHandle);
    if (!rHandle || !sHandle) return;
    const cacheKey = `${sHandle}:${rHandle}`;
    let blocked = blockCache.get(cacheKey);
    if (blocked === undefined) {
      blocked = await isBlockedBy(sHandle, rHandle);
      blockCache.set(cacheKey, blocked);
    }
    if (blocked) return;
    io.to(rHandle).emit('user_typing', {
      senderHandle: sHandle,
      recipientHandle: rHandle,
      isTyping,
    });
  });

  socket.on('call_user', async (data) => {
    const caller = socket.verifiedHandle || data.caller || data.from;
    const recipientHandle = normalizeHandle(data.recipientHandle || data.to);
    if (recipientHandle) {
      const blocked = await isBlockedBy(caller, recipientHandle);
      if (blocked) return;
      io.to(recipientHandle).emit('incoming_call', {
        caller,
        from: caller,
        recipientHandle,
        to: recipientHandle,
      });
    }
  });

  const handleAcceptCall = (data) => {
    const callerHandle = normalizeHandle(data.callerHandle || data.to);
    const recipientHandle = socket.verifiedHandle || normalizeHandle(data.recipientHandle || data.from);
    const recipient = data.recipient || (callerHandle ? { handle: recipientHandle } : null);
    if (callerHandle) {
      io.to(callerHandle).emit('call_accepted', {
        callerHandle,
        recipientHandle,
        recipient,
        to: callerHandle,
        from: recipientHandle,
      });
    }
  };

  socket.on('accept_call', handleAcceptCall);
  socket.on('answer_call', handleAcceptCall);

  socket.on('decline_call', (data) => {
    const callerHandle = normalizeHandle(data.callerHandle || data.to);
    const recipientHandle = socket.verifiedHandle || normalizeHandle(data.recipientHandle || data.from);
    if (callerHandle) {
      io.to(callerHandle).emit('call_declined', { callerHandle, recipientHandle });
      io.to(callerHandle).emit('call_ended', { callerHandle, recipientHandle });
    }
    if (recipientHandle && recipientHandle !== callerHandle) {
      io.to(recipientHandle).emit('call_declined', { callerHandle, recipientHandle });
      io.to(recipientHandle).emit('call_ended', { callerHandle, recipientHandle });
    }
  });

  socket.on('end_call', (data) => {
    const callerHandle = normalizeHandle(data.callerHandle || data.to);
    const recipientHandle = socket.verifiedHandle || normalizeHandle(data.recipientHandle || data.from);
    if (callerHandle) io.to(callerHandle).emit('call_ended', { callerHandle, recipientHandle });
    if (recipientHandle && recipientHandle !== callerHandle) io.to(recipientHandle).emit('call_ended', { callerHandle, recipientHandle });
  });

  socket.on('save_draft', ({ senderHandle, recipientHandle, text }) => {
    const sHandle = socket.verifiedHandle || normalizeHandle(senderHandle);
    const rHandle = normalizeHandle(recipientHandle);
    if (sHandle && rHandle) {
      // Echo draft to sender's other tabs/devices
      io.to(sHandle).emit('draft_synced', {
        senderHandle: sHandle,
        recipientHandle: rHandle,
        text,
      });
    }
  });

  socket.on('mark_read', async ({ messageId, readerHandle, conversationKey }) => {
    const rHandle = socket.verifiedHandle || normalizeHandle(readerHandle);
    const readAt = new Date().toISOString();

    if (messageId) {
      let m = null;
      if (isMongoConnected) {
        m = await MessageModel.findOneAndUpdate(
          { id: messageId },
          { $set: { status: 'read', readAt: new Date() } },
          { new: true }
        ).lean();
      } else {
        const db = readLocalDB();
        m = db.messages.find((x) => x.id === messageId);
        if (m) {
          m.status = 'read';
          m.readAt = readAt;
          writeLocalDB(db);
        }
      }

      if (m) {
        // Bug 4 fix: only allow participants to mark messages as read
        if (!m.groupId && m.recipientHandle !== rHandle && m.senderHandle !== rHandle) return;
        if (m.groupId) {
          io.to(`group_${m.groupId}`).emit('message_read', { messageId, readerHandle: rHandle, readAt });
        } else {
          io.to(m.senderHandle).emit('message_read', { messageId, readerHandle: rHandle, readAt });
          if (m.senderHandle !== m.recipientHandle) {
            io.to(m.recipientHandle).emit('message_read', { messageId, readerHandle: rHandle, readAt });
          }
        }
      }
    }
  });

  socket.on('webrtc_signal', (data) => {
    const target = normalizeHandle(data.toHandle || data.to);
    const source = socket.verifiedHandle || normalizeHandle(data.fromHandle || data.from);
    if (target) {
      io.to(target).emit('webrtc_signal', {
        ...data,
        toHandle: target,
        fromHandle: source,
        to: target,
        from: source,
        signal: data.signal,
      });
    }
  });
});

// OpenGraph Link Preview Endpoint with SSRF Protection
app.get('/api/link-preview', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    const hostname = parsedUrl.hostname;
    // SSRF Protections — Step 1: reject known private hostnames by string
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return res.status(403).json({ error: 'Forbidden domain or IP' });
    }

    // SSRF Protections — Step 2: DNS rebinding defense
    // Resolve hostname to IPs BEFORE fetching and reject any private/internal IP ranges
    const PRIVATE_IP_REGEX = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc00:|fd|0\.0\.0\.0$)/;
    try {
      const resolvedAddresses = await dns.promises.resolve4(hostname);
      if (resolvedAddresses.some((ip) => PRIVATE_IP_REGEX.test(ip))) {
        return res.status(403).json({ error: 'Forbidden: hostname resolves to a private/internal IP address' });
      }
    } catch {
      // DNS resolution failure (NXDOMAIN, timeout) — block the request
      return res.status(403).json({ error: 'Forbidden: hostname could not be resolved' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EzTalkBot/1.0 (+https://eztalk.app)',
        'Accept': 'text/html',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch' });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return res.status(400).json({ error: 'Not an HTML page' });
    }

    const html = await response.text();

    const getMatch = (regex) => {
      const match = html.match(regex);
      return match ? match[1].trim() : null;
    };

    let title = getMatch(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                getMatch(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
                getMatch(/<title[^>]*>([^<]+)<\/title>/i);
    
    let description = getMatch(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                      getMatch(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
                      getMatch(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      getMatch(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    
    let image = getMatch(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                getMatch(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
                
    let siteName = getMatch(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                   getMatch(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i) ||
                   hostname;

    if (!title && !description && !image) {
      return res.status(404).json({ error: 'No metadata found' });
    }

    // Convert relative image URLs to absolute
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, targetUrl).href;
      } catch (e) {}
    }

    res.json({
      title: title ? title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : null,
      description: description ? description.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : null,
      image,
      url: targetUrl,
      siteName
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    res.status(500).json({ error: 'Failed to parse URL or fetch' });
  }
});

// Serve frontend dist if available (for single-server / Docker / VPS / Render deployments)
const DIST_PATH = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EzTalk Backend Server running on http://0.0.0.0:${PORT}`);
});
