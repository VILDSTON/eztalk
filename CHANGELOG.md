# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
