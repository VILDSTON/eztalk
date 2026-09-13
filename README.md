# 💬 EzTalk — Minimalist Real-Time Messenger

> **Clean, noise-free communication for friends.** Built for speed, privacy, and simplicity with a sleek Telegram/Cyber Dark aesthetic.

---

## 🏗️ Tech Stack & Architecture

- **Frontend Core**: React 18 + TypeScript (Vite)
- **Styling**: Tailwind CSS (Custom Cyber Dark & Neon Green theme)
- **Icons**: Lucide React
- **Real-Time Messaging**: Socket.io (Optimized with targeted user & group room routing)
- **Voice Communication**: WebRTC + Peer signaling (Opus audio codec, P2P peer connection architecture, ICE/STUN support)
- **Backend & DB**: Node.js, Express.js, MongoDB (Mongoose with compound indexed queries)
- **Storage**: Supabase Storage (Secure bucket offloading for media files)
- **Presence Engine**: Real-time socket presence tracking and typing indicators

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

## 🗺️ Roadmap (Future Enhancements)

- **Next.js Migration**: Transitioning to Next.js for server-side rendering (SSR) and advanced routing capabilities.
- **Redis Integration**: Target support for Redis to scale real-time multi-socket presence tracking across distributed servers.
- **Alternative Storage Providers**: Expanding storage architecture to support AWS S3 and Cloudinary targets natively.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/VILDSTON/eztalk.git
cd eztalk
npm install
```

### 2. Environment Variables
The application requires specific environment variables for the database, JWT auth, and Supabase storage. 
Copy the example file and fill in your credentials:
```bash
cp .env.example .env
```
*Required variables include: `MONGO_URI`, `JWT_SECRET`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.*

### 3. Run the Development Server
Our dev script concurrently launches both the Vite frontend and the Node.js backend.
```bash
npm run dev
```
*(Alternatively, you can run `npm run server` for just the backend and `npm run client` for the frontend).*

### 4. Production Build
To build the frontend for production deployment:
```bash
npm run build
```

---

## 📄 License

MIT License. See `LICENSE` for more information.
