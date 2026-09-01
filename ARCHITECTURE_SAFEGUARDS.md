# EzTalk Architecture Safeguards

**CRITICAL PROTOCOL: DO NOT BREAK / DO NOT TOUCH RULES**

This document outlines the foundational architectural pillars of the EzTalk Web Messenger. These constraints exist to ensure the security, stability, and high performance of the application.

**You MUST NEVER alter or circumvent these rules in future prompts without EXPLICIT instructions.**

## 1. Cryptography Pipeline
The AES-256-GCM encryption flow ensures data security at rest.
- **Rule**: All messages MUST be encrypted before they are written to the MongoDB database and MUST be decrypted immediately upon retrieval before being sent to the client.
- **Location**: `server/utils/crypto.js`
- **Constraint**: Do not bypass `encryptMessage` or `decryptMessage` in any database transaction involving message text. If a new message field containing PII or sensitive text is added, it must follow the same pipeline.

## 2. WebRTC Signaling Flow
The P2P audio call infrastructure relies on a strict signaling handshake.
- **Rule**: The strict handshake sequence must always be: `Call -> Accept -> Create Offer -> Answer -> ICE Candidate Exchange`.
- **Location**: `src/components/Chat/CallModal.tsx` & `server/index.js` (socket events).
- **Constraint**: Do not reorder the signaling events. The SDP modifications (forcing 64kbps Opus codec, DTX, in-band FEC) within `optimizeAudioSDP` must remain intact to prevent audio degradation or distortion on mobile networks.

## 3. Normalization Invariant
To prevent split-brain issues in databases and socket rooms, user handles are strictly normalized.
- **Rule**: The function `normalizeHandle()` (lowercase, with exactly one leading `@`) MUST be used on ALL user handles before database queries, generating conversation keys, or joining/emitting to Socket.io rooms.
- **Location**: `src/utils/chatStorage.ts` & `server/index.js`.
- **Constraint**: Do not perform strict equality checks on raw user inputs against database handles without wrapping them in `normalizeHandle()`.

## 4. Gesture Separation
The UX logic strictly delineates mobile touch interactions from desktop mouse interactions to prevent conflicting behaviors.
- **Rule**: Mouse text-selection must remain intact on Desktop viewports (`>= 640px`). Touch-swipe-to-reply or drag-to-dismiss gestures must ONLY be active on Mobile viewports (`< 640px`).
- **Location**: `src/components/Chat/MessageBubble.tsx` & `src/components/Chat/MobileMessageActionSheet.tsx`.
- **Constraint**: Do not add global mouse `mousedown`/`mousemove` drag listeners to message bubbles that break native text selection (`user-select: text`). Desktop context menus must use right-click (contextmenu event) or click-to-open logic, whereas mobile must use long-press (touch hold) or swipe gestures.

## 5. Portals & Scroll Locks
To maintain pristine z-indexing and prevent viewport scrolling issues when overlays are open.
- **Rule**: All fixed-position mobile bottom sheets, fullscreen media lightboxes, and system-level modals MUST be rendered via React Portals (`createPortal(..., document.body)`).
- **Constraint**: Whenever a portal/modal is active, body scroll locking (`document.body.style.overflow = 'hidden'`) must be strictly enforced and cleanly removed upon unmount. Do not nest fixed modals inside scrollable parent containers.
