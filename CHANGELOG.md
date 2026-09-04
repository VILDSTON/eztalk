# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.3] - 2026-09-04

### Added
- **Supabase Storage & Zero-Base64 Database**: Replaced Cloudinary with Supabase Storage (`@supabase/supabase-js`) to eliminate regional service restrictions. Uploads stream to a public Supabase bucket (`SUPABASE_BUCKET=chat-attachments`) via `POST /api/upload`, returning permanent public HTTPS URLs via `supabase.storage.from(bucket).getPublicUrl(fileName)`.
- **Strict 10MB OOM & Overload Protection**: Enforced a strict 10MB file limit on the backend with Multer (`LIMIT_FILE_SIZE` returning HTTP 413) and added pre-upload validation on the frontend in `MessageInput` for both file attachments and voice recordings, notifying users if a file exceeds 10MB.
- **Render Production Safeguard & Offline Fallback**: Maintained `uploads/` static directory fallback for offline local PC development, accompanied by an explicit server startup warning in production/Render if Supabase credentials are not configured.
- **Optimistic UI with 1-Tap Retry**: Instantaneous UI delivery for sent messages using unique `temp_${Date.now()}` IDs and spinning `status: 'sending'` indicator. Network or server failures immediately update status to `failed` and render a red alert badge with a 1-tap "Retry" button.
- **Socket Race Condition Deduplication**: Hardened `socketService.onNewMessage` against race conditions where backend WebSocket broadcasts arrive before the HTTP `fetch()` promise resolves. Incoming socket messages from `currentUser.handle` are deduplicated and merged with pending optimistic messages in place, preventing duplicate bubbles and screen flickering.
- **Cursor-Based Message Pagination**: Added `cursor` (`createdAt < cursor`) and `limit: 30` parameters to `GET /api/messages/:handle1/:handle2` and `GET /api/groups/:groupId/messages`, returning `{ messages, nextCursor, hasMore }`.
- **DOM-Preserved Infinite Scroll**: Integrated asynchronous scroll restoration inside `useLayoutEffect` in `MessageThread`, compensating `scrollTop = scrollHeight - prevScrollHeight + prevScrollTop` after React reconciliation, guaranteeing zero jitter and exact viewport retention during history loading.

## [0.9.2] - 2026-09-04

### Added
- **Call Event Cards**: Redesigned perspective-aware call status bubbles (Canceled, Missed, Outgoing, Incoming) with duration timestamps and 1-tap "Call back" action.
- **Reaction Badges**: Telegram-style floating reaction capsules anchored to message bubbles with deep contrast backgrounds (`#0F141C` / `#131B26`), count badges, and interactive toggling.
- **Portal Rendering**: Desktop context menu is now rendered via `createPortal(..., document.body)` to eliminate CSS transform and containing-block clipping issues.
- **User Profile Modal**: Added floating Telegram-style close button, Escape key dismissal, backdrop click to close, and direct media downloading.
- **Chat List Previews**: Replaced static user bio/about with live latest message previews (text, voice notes, photos, files, calls with "You:" tag and timestamp).

### Fixed
- **Message Editing**: Resolved missing `onSaveEdit` callback prop wiring between `ChatWindow` and `MessageInput`, restoring real-time message editing.
- **Real-Time Presence**: Fixed bug where `UserProfileModal` displayed offline users as online by connecting dynamic socket `isOnline` presence.
- **Network & Parsing Resiliency**: Wrapped API calls in safe JSON parsing preventing crashes on HTML 502/504/CORS errors.
- **JWT Authentication**: Added JWT token generation on login/registration and automatic `Authorization: Bearer <token>` request headers across all endpoints.
- **Socket Handshake & Reconnect Stability**: Added JWT handshake authentication in `socket.ts`, exponential reconnect backoff, and automatic room rejoin on `connect` and `reconnect` events.
- **ISO Timestamps & Message Status**: Fixed legacy timestamp strings in `sendMessage` with valid ISO timestamps and proper `failed` message status on network interruptions.
- **Sidebar FAB Placement**: Tucked the green new-chat FAB button strictly inside the sidebar container (`bottom-4 right-4`) preventing it from overflowing into the conversation canvas.
- **Chat Types & Settings Deduplication**: Structured user preferences strictly inside `User.settings`, added `'video'` attachment type, harmonized `ReactionItem[]` with bubble rendering, and removed obsolete active tab artifacts.
- **Web Audio & Chime Stability**: Added Safari/iOS autoplay unlock via `ctx.resume()`, shared `AudioContext` for message chimes to prevent browser resource exhaustion, and smooth 25ms gain ramp eliminating pops/clicks on cutoff.
- **Cross-Tab Synchronization**: Hardened `liveSync.ts` with standalone `BroadcastChannel` and `localStorage` storage-event fallback for production, along with deterministic event ID deduplication.
- **Instant Theme Bootstrapping**: Added `initThemeEngine()` executed before React mount in `main.tsx` to restore saved themes and compact mode instantly without screen flash, and stabilized dynamic alpha glow calculations.
- **Crypto Key Caching & Tamper Protection**: Cached SHA256-derived AES-256-GCM encryption key once in process memory avoiding CPU bottlenecks on bulk fetches, enforced strict hex/length verification, and safely flagged corrupted/tampered ciphertexts.
- **Backend Route & Socket JWT Security**: Added `authenticateToken` middleware across mutating REST endpoints, verified JWT tokens in Socket.io handshake (`io.use`) to prevent handle impersonation, switched group message delivery strictly to members, and eliminated presence leak by tracking active socket IDs with `Set` deduplication.
- **Input Bar Baseline**: Aligned attachment paperclip, input pill, emoji picker, and send/mic buttons along a shared horizontal baseline with clear `text-sm text-white` typography.
- **Message Pagination & Fast Decryption**: Added 50-message pagination windowing on direct and group message queries and added fast bypass for Base64/data URLs in `decryptMessage`, preventing CPU spikes on low-resource hosting (Render/free tiers).
- **Persistent Chat Dictionary & Zero-Flicker Switching**: Refactored frontend message state into a key-indexed dictionary (`messagesByChat[chatKey]`) with background merging, eliminating empty-screen flashes on chat switches and socket reconnects.
- **Client-Side Image Downscaling**: Added canvas image compression in `MessageInput` (1280px max dimension, 0.82 JPEG quality) reducing photo attachment payloads by ~90-95% before Base64 encoding.

### Removed
- **Hover Toolbar**: Removed redundant desktop hover action toolbar above message bubbles to prevent visual jitter and declutter the reading experience.
- **Header Redundancy**: Removed duplicate mini-avatar top bar inside the user profile modal.

## [0.9.0] - Public Beta - 2026-09-01

### Added
- **Cryptography**: AES-256-GCM message encryption at rest, bcrypt password security, hard DB deletion on purge.
- **Mobile UX**: Native Telegram-style Mobile Bottom Sheet with haptics (`navigator.vibrate`) & multi-gesture dismissals (swipe down, tap backdrop, hardware back button).
- **Desktop UX**: Desktop right-click context menu with viewport collision clamping and vertical flip protection.
- **Audio Experience**: Interactive Voice Waveform visualizer & seeker with pitch-preserved playback at 1.0x / 1.5x / 2.0x speeds.
- **Media Lightbox**: Fullscreen Media Lightbox with dark blur backdrop, zoom, pan, rotation, and file download support.
- **Cloud Sync**: Real-time cloud draft synchronization across sessions and tabs using `BroadcastChannel` and `Socket.io`.

### Fixed
- **WebRTC Audio**: WebRTC mono voice quality & SDP optimizations (removed audio clipping/distortion, forced 64kbps Opus).
- **Database Validation**: Mongoose schema validation stripping user settings.
- **Text Selection**: Desktop text selection bugs (removed erroneous mouse-drag swipe that conflicted with native text selection).

### Removed
- **Self-Destruct**: TTL self-destruct countdowns and related UI clutter for a cleaner chat interface.
