# 💬 EzTalk — Minimalist Real-Time Messenger

> **Clean, noise-free communication for friends.** Built for speed, privacy, and simplicity with a sleek Telegram/Cyber Dark aesthetic.

---

## 🏗️ Tech Stack & Architecture

- **Frontend Core**: React 18 + TypeScript (Vite / Next.js target architecture)
- **Styling**: Tailwind CSS (Custom Cyber Dark & Neon Green theme)
- **Icons**: Lucide React
- **Real-Time Messaging**: Socket.io-client (Optimized with targeted user & group room routing)
- **Voice Communication**: WebRTC + Peer signaling (Opus audio codec, P2P peer connection architecture, ICE/STUN support)
- **Backend & DB**: Node.js, Express.js, MongoDB (Mongoose with compound indexed queries) + High-Performance Local JSON fallback
- **Presence Engine**: Real-time multi-socket presence tracking (with Redis target support)
- **Storage Target**: Offloaded media storage architecture (Cloudinary / AWS S3 ready)

---

## ⚡ Key Features

- 💬 **Real-Time Direct & Group Messaging:** Instant, bi-directional message delivery with zero page reload.
- 📞 **Crystal Clear WebRTC Voice Calls:** High-fidelity P2P audio calling with Opus codec, waveform visualizer, and custom sound synthesizer.
- 👥 **Friends & Group Chats:** Easily search by `@username`, create custom groups, and manage friend lists.
- 🚫 **Telegram-Style User Blocking:** Restrict profile data (masked avatars, hidden bio/custom status, offline presence) and block unwanted communication.
- 📅 **Dynamic Date Dividers:** Messages grouped smoothly by "Today", "Yesterday", and calendar dates.
- 🟢 **Unread Counter Badges:** Bright neon count badges that clear automatically when conversations are viewed.
- ⚡ **Lightweight & Fast:** Zero bloat, instant load times, minimal RAM footprint.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```

---

## 💖 Powered by Gemini

