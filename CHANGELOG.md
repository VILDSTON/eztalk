# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2026-09-03

### Added
- **Call Event Cards**: Redesigned perspective-aware call status bubbles (Canceled, Missed, Outgoing, Incoming) with duration timestamps and 1-tap "Call back" action.
- **Reaction Badges**: Telegram-style floating reaction capsules anchored to message bubbles with deep contrast backgrounds (`#0F141C` / `#131B26`), count badges, and interactive toggling.
- **Portal Rendering**: Desktop context menu is now rendered via `createPortal(..., document.body)` to eliminate CSS transform and containing-block clipping issues.
- **User Profile Modal**: Added floating Telegram-style close button, Escape key dismissal, backdrop click to close, and direct media downloading.

### Fixed
- **Message Editing**: Resolved missing `onSaveEdit` callback prop wiring between `ChatWindow` and `MessageInput`, restoring real-time message editing.
- **Real-Time Presence**: Fixed bug where `UserProfileModal` displayed offline users as online by connecting dynamic socket `isOnline` presence.
- **Sidebar FAB Placement**: Tucked the green new-chat FAB button strictly inside the sidebar container (`bottom-4 right-4`) preventing it from overflowing into the conversation canvas.
- **Input Bar Baseline**: Aligned attachment paperclip, input pill, emoji picker, and send/mic buttons along a shared horizontal baseline with clear `text-sm text-white` typography.

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
