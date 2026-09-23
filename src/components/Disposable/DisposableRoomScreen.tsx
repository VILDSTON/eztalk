import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Flame,
  Clock,
  Send,
  Paperclip,
  Smile,
  ShieldCheck,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Check,
  CheckCheck,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Share2,
  Copy,
  CornerUpLeft,
  Trash2,
  ZoomIn,
  X,
  FileText,
  Download,
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { Message, QuotedMessage, DisposableMessage, DisposableParticipant, Attachment } from '../../types/chat';
import { useTranslation } from '../../context/LanguageContext';
import { playMessageChime } from '../../utils/callSounds';
import { MessageThread } from '../Chat/MessageThread';
import { MessageInput } from '../Chat/MessageInput';
import { MediaLightboxModal } from '../Chat/MediaLightboxModal';
import { downloadOrOpenFile, isImageMedia, isVideoMedia } from '../../utils/fileDownloader';

const EMOJI_ONLY_REGEX = /^[\p{Extended_Pictographic}\u200D\uFE0F\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\s]+$/u;

// Emoji Segmenter Helper (strictly for actual emoji characters)
function getEmojiSegments(text: string): string[] {
  const stripped = text.replace(/\s+/g, '');
  if (!stripped || !EMOJI_ONLY_REGEX.test(stripped)) return [];
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
      return [...segmenter.segment(stripped)].map((s: any) => s.segment);
    } catch { }
  }
  const matches = stripped.match(
    /(?:\p{Extended_Pictographic}(?:\uFE0F|\u{1F3FB}-\u{1F3FF})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u{1F3FB}-\u{1F3FF})?)*|\u{1F1E6}-\u{1F1FF}{2})/gu
  );
  return matches || [];
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '😂', '👋', '🎉', '🤝', '🚀', '✨', '👌', '🙏', '💯'];

export const DisposableRoomScreen: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const [burnReason, setBurnReason] = useState<'manual' | 'expired' | 'abandoned' | null>(null);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);

  // Room State
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [participants, setParticipants] = useState<DisposableParticipant[]>([]);
  const [messages, setMessages] = useState<DisposableMessage[]>([]);
  const [selfSocketId, setSelfSocketId] = useState<string>('');
  const [selfParticipantId, setSelfParticipantId] = useState<string>(() => {
    return roomId ? sessionStorage.getItem(`ez_temp_pid_${roomId}`) || '' : '';
  });
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // socketId -> nickname

  // Local Countdown Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Message & Lightbox State
  const [copiedLink, setCopiedLink] = useState(false);
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name?: string; type?: 'image' | 'video' | 'file' | 'audio' } | null>(null);

  const currentSocketId = selfSocketId || socketService.getSocket()?.id || '';
  const currentPid = selfParticipantId || (roomId ? sessionStorage.getItem(`ez_temp_pid_${roomId}`) : '') || '';
  const otherParticipant = participants.find((p) => {
    if (currentPid && p.participantId) return p.participantId !== currentPid;
    return p.socketId !== currentSocketId;
  });
  const currentParticipant = participants.find(
    (p) => (currentPid && p.participantId === currentPid) || p.socketId === currentSocketId
  );

  const currentUserHandle = React.useMemo(() => {
    if (currentParticipant?.nickname) {
      return currentParticipant.nickname.startsWith('@')
        ? currentParticipant.nickname
        : `@${currentParticipant.nickname}`;
    }
    return '@Me';
  }, [currentParticipant]);

  const recipientLabel = React.useMemo(() => {
    return otherParticipant?.nickname
      ? (otherParticipant.nickname.startsWith('@') ? otherParticipant.nickname : `@${otherParticipant.nickname}`)
      : '@Companion';
  }, [otherParticipant]);

  const mappedMessages: Message[] = React.useMemo(() => {
    return messages.map((m) => {
      const isMe = Boolean(
        (currentPid && m.senderId === currentPid) ||
        (currentSocketId && m.senderId === currentSocketId)
      );

      let replyToQuoted: QuotedMessage | undefined;
      if (m.replyTo) {
        const replySender = m.replyTo.senderName || (m.replyTo as any).senderHandle || 'User';
        replyToQuoted = {
          id: m.replyTo.id,
          senderHandle: replySender.startsWith('@') ? replySender : `@${replySender}`,
          text: m.replyTo.text,
        };
      }

      return {
        id: m.id,
        senderId: m.senderId,
        senderHandle: isMe ? currentUserHandle : (m.senderName.startsWith('@') ? m.senderName : `@${m.senderName}`),
        recipientHandle: isMe ? recipientLabel : currentUserHandle,
        text: m.text,
        timestamp: m.timestamp,
        createdAt: m.timestamp,
        status: 'delivered' as const,
        attachment: m.attachment || undefined,
        replyTo: replyToQuoted,
        reactions: m.reactions || {},
        forwardRestricted: true,
      };
    });
  }, [messages, currentPid, currentSocketId, currentUserHandle, recipientLabel]);

  // WebRTC Audio Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerSocketId, setCallerSocketId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  // Connect socket and join disposable room
  useEffect(() => {
    if (!roomId) {
      setError('Invalid room ID');
      setIsLoading(false);
      return;
    }

    const socket = socketService.connect();
    if (!socket) {
      setError('Could not connect to messaging server');
      setIsLoading(false);
      return;
    }

    // Persistent room identity in sessionStorage so page reload maintains the EXACT same identity
    const participantIdKey = `ez_temp_pid_${roomId}`;
    let storedPid = sessionStorage.getItem(participantIdKey);
    if (!storedPid) {
      storedPid = `pid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(participantIdKey, storedPid);
    }
    setSelfParticipantId(storedPid);

    let defaultNick = sessionStorage.getItem(`ez_temp_nick_${roomId}`) || '';
    let defaultAvatar = sessionStorage.getItem(`ez_temp_avatar_${roomId}`) || '';
    const storedUser = localStorage.getItem('eztalk_user');

    if (!defaultNick && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        defaultNick = parsed.name || parsed.handle || '';
        defaultAvatar = parsed.avatar || '';
      } catch { }
    }

    if (!defaultAvatar) {
      defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${storedPid}`;
      sessionStorage.setItem(`ez_temp_avatar_${roomId}`, defaultAvatar);
    }
    if (defaultNick) {
      sessionStorage.setItem(`ez_temp_nick_${roomId}`, defaultNick);
    }

    const emitJoin = () => {
      if (socket.id) setSelfSocketId(socket.id);
      socket.emit('disposable_join', {
        roomId,
        participantId: storedPid,
        nickname: defaultNick,
        avatar: defaultAvatar,
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once('connect', emitJoin);
    }

    const handleInit = (data: {
      roomId: string;
      expiresAt: number;
      durationMinutes: number;
      participants: DisposableParticipant[];
      messages: DisposableMessage[];
      selfId: string;
    }) => {
      setIsLoading(false);
      setExpiresAt(data.expiresAt);
      setParticipants(data.participants);
      setMessages(data.messages);
      const myPid = data.selfId || storedPid;
      setSelfParticipantId(myPid);
      sessionStorage.setItem(participantIdKey, myPid);
      setSelfSocketId(socket.id || '');
    };

    const handleUserJoined = (participant: DisposableParticipant) => {
      setParticipants((prev) => {
        const id = participant.participantId || participant.socketId;
        const exists = prev.some((p) => (p.participantId || p.socketId) === id);
        if (exists) {
          return prev.map((p) => ((p.participantId || p.socketId) === id ? participant : p));
        }
        return [...prev, participant];
      });
    };

    const handleUserLeft = ({ participantId, socketId }: { participantId?: string; socketId: string }) => {
      setParticipants((prev) =>
        prev.filter((p) => {
          if (participantId && p.participantId) return p.participantId !== participantId;
          return p.socketId !== socketId;
        })
      );
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        if (participantId) delete next[participantId];
        return next;
      });
      if (callerSocketId === socketId) {
        endCall();
      }
    };

    const handleNewMessage = (msg: DisposableMessage) => {
      setMessages((prev) => [...prev, msg]);
      const currentPid = sessionStorage.getItem(participantIdKey) || storedPid;
      if (msg.senderId !== currentPid && msg.senderId !== socket.id) {
        try {
          playMessageChime();
        } catch { }
      }
    };

    const handleTypingChange = ({ socketId, nickname, isTyping }: { socketId: string; nickname: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[socketId] = nickname;
        } else {
          delete next[socketId];
        }
        return next;
      });
    };

    const handleBurned = ({ reason }: { reason: 'manual' | 'expired' | 'abandoned' }) => {
      setIsBurned(true);
      setBurnReason(reason);
      endCall();
    };

    const handleError = (err: { code: string; message: string }) => {
      setIsLoading(false);
      setError(err.message || 'Room error');
    };

    const handleSignal = async ({
      fromSocketId,
      senderName,
      signal,
    }: {
      fromSocketId: string;
      senderName: string;
      signal: any;
    }) => {
      if (signal.type === 'offer') {
        setCallerSocketId(fromSocketId);
        setCallerName(senderName);
        setIsIncomingCall(true);
        peerConnectionRef.current = createPeerConnection(fromSocketId);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'answer') {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } else if (signal.candidate) {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch { }
        }
      } else if (signal.type === 'end') {
        endCall();
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on('disposable_init', handleInit);
    socket.on('disposable_user_joined', handleUserJoined);
    socket.on('disposable_user_left', handleUserLeft);
    socket.on('disposable_new_message', handleNewMessage);
    socket.on('disposable_reaction_updated', handleReactionUpdated);
    socket.on('disposable_message_deleted', handleMessageDeleted);
    socket.on('disposable_typing_change', handleTypingChange);
    socket.on('disposable_burned', handleBurned);
    socket.on('disposable_error', handleError);
    socket.on('disposable_signal', handleSignal);

    return () => {
      socket.off('disposable_init', handleInit);
      socket.off('disposable_user_joined', handleUserJoined);
      socket.off('disposable_user_left', handleUserLeft);
      socket.off('disposable_new_message', handleNewMessage);
      socket.off('disposable_reaction_updated', handleReactionUpdated);
      socket.off('disposable_message_deleted', handleMessageDeleted);
      socket.off('disposable_typing_change', handleTypingChange);
      socket.off('disposable_burned', handleBurned);
      socket.off('disposable_error', handleError);
      socket.off('disposable_signal', handleSignal);
      socket.emit('disposable_leave');
      endCall();
    };
  }, [roomId]);

  // Local Countdown Timer
  useEffect(() => {
    if (!expiresAt || isBurned) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        setIsBurned(true);
        setBurnReason('expired');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isBurned]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const createPeerConnection = (targetId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = socketService.getSocket();
        socket?.emit('disposable_signal', {
          roomId,
          targetSocketId: targetId,
          signal: { candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => { });
      }
    };

    return pc;
  };

  const startCall = async () => {
    const currentPid = selfParticipantId || (roomId ? sessionStorage.getItem(`ez_temp_pid_${roomId}`) : '') || '';
    const otherParticipant = participants.find((p) => {
      if (currentPid && p.participantId) return p.participantId !== currentPid;
      return p.socketId !== (selfSocketId || socketService.getSocket()?.id);
    });
    if (!otherParticipant) {
      alert((t as any)?.disposable?.needTwoForCall || 'Waiting for another person to join before calling.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = createPeerConnection(otherParticipant.socketId);
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = socketService.getSocket();
      socket?.emit('disposable_signal', {
        roomId,
        targetSocketId: otherParticipant.socketId,
        signal: offer,
      });

      setIsInCall(true);
      setCallerSocketId(otherParticipant.socketId);
      setCallerName(otherParticipant.nickname);

      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert((t as any)?.disposable?.micError || 'Microphone error: ' + err.message);
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection(callerSocketId);
      }

      stream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, stream));

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      const socket = socketService.getSocket();
      socket?.emit('disposable_signal', {
        roomId,
        targetSocketId: callerSocketId,
        signal: answer,
      });

      setIsIncomingCall(false);
      setIsInCall(true);

      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert((t as any)?.disposable?.micError || 'Could not access mic: ' + err.message);
      rejectCall();
    }
  };

  const rejectCall = () => {
    const socket = socketService.getSocket();
    socket?.emit('disposable_signal', {
      roomId,
      targetSocketId: callerSocketId,
      signal: { type: 'end' },
    });
    setIsIncomingCall(false);
    endCall();
  };

  const endCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const socket = socketService.getSocket();
    if (callerSocketId) {
      socket?.emit('disposable_signal', {
        roomId,
        targetSocketId: callerSocketId,
        signal: { type: 'end' },
      });
    }
    setIsInCall(false);
    setIsIncomingCall(false);
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleSendMessage = (text: string, att?: Attachment, replyTo?: QuotedMessage) => {
    const cleanText = text.trim();
    if (!cleanText && !att) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('disposable_send_message', {
        roomId,
        text: cleanText,
        attachment: att || undefined,
        replyTo: replyTo ? {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderHandle,
        } : undefined,
      });
      socket.emit('disposable_typing', { roomId, isTyping: false });
    }

    setReplyingTo(null);
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    const socket = socketService.getSocket();
    socket?.emit('disposable_toggle_reaction', {
      roomId,
      messageId,
      emoji,
    });
  };

  const deleteMessage = (messageId: string) => {
    const socket = socketService.getSocket();
    socket?.emit('disposable_delete_message', {
      roomId,
      messageId,
    });
  };

  const handleBurn = () => {
    setShowBurnConfirm(false);
    const socket = socketService.getSocket();
    socket?.emit('disposable_burn', { roomId });
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const remoteAudioElem = <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />;

  // ─── 1. LOADING SCREEN ───
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ez-base flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-neon-md mb-4 animate-pulse">
          <Flame className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">
          {(t as any)?.disposable?.connecting || 'Connecting to room...'}
        </h2>
        <p className="text-xs text-ez-muted font-mono">{roomId}</p>
      </div>
    );
  }

  // ─── 2. ERROR SCREEN ───
  if (error) {
    return (
      <div className="min-h-screen bg-ez-base flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-rose-500/20 shadow-sm mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-white mb-2">
          {(t as any)?.disposable?.roomUnavailable || 'Room Unavailable'}
        </h2>
        <p className="text-xs text-ez-muted max-w-sm mb-6 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => navigate(`/${language}/direct/t`)}
          className="px-5 py-2.5 rounded-2xl bg-neon-green text-black font-bold text-xs shadow-neon-sm transition-transform active:scale-95 cursor-pointer"
        >
          {(t as any)?.common?.returnHome || 'Return to EzTalk'}
        </button>
      </div>
    );
  }

  // ─── 3. CLEAN HUMAN PRIVACY ANNIHILATION SCREEN ───
  if (isBurned) {
    const endTitle =
      burnReason === 'expired'
        ? ((t as any)?.disposable?.roomExpired || 'Session Expired')
        : burnReason === 'abandoned'
          ? ((t as any)?.disposable?.roomAbandoned || 'All participants left the room')
          : ((t as any)?.disposable?.roomBurned || 'Room was deleted');

    return (
      <div className="min-h-screen bg-ez-base flex flex-col items-center justify-center p-4 text-center font-sans relative overflow-hidden select-none">
        {/* Glow backdrop */}
        <div className="absolute w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ash / Flame icon */}
        <div className="relative z-10 mb-5 animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10  border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-glass">
            <Flame className="w-8 h-8" />
          </div>
        </div>

        {/* Clean Human Card */}
        <div className="relative z-10 max-w-sm w-full p-6 bg-ez-surface/90 backdrop-blur-xl border border-ez-border rounded-3xl shadow-2xl text-center mb-6 animate-scale-up">
          <h2 className="text-lg font-bold text-white mb-1.5 tracking-tight">
            {endTitle}
          </h2>
          <p className="text-xs text-ez-muted leading-relaxed mb-5">
            {(t as any)?.disposable?.erasedNotice ||
              'All messages and media have been permanently erased. No chat history was saved.'}
          </p>

          <div className="p-3 bg-ez-elevated rounded-2xl border border-ez-border/60 text-xs text-gray-300 space-y-1.5 mb-2">
            <div className="flex justify-between items-center">
              <span className="text-ez-muted text-[11px]">Room ID</span>
              <span className="font-mono text-[11px] text-white font-semibold">{roomId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ez-muted text-[11px]">Status</span>
              <span className="text-rose-400 font-semibold text-[11px]">
                {(t as any)?.disposable?.roomEnded || 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center space-y-2.5 sm:space-y-0 sm:space-x-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => navigate(`/${language}/direct/t`)}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-neon-green hover:bg-neon-green-light text-black font-extrabold text-xs shadow-neon-md transition-all active:scale-95 cursor-pointer"
          >
            {(t as any)?.disposable?.openEzTalk || 'Open EzTalk Messenger'}
          </button>
        </div>
      </div>
    );
  }

  // ─── 4. ACTIVE DISPOSABLE CHAT ROOM ───
  const isUrgent = secondsRemaining <= 60;
  const typingList = Object.values(typingUsers);

  return (
    <div className="h-[100dvh] bg-ez-base flex flex-col font-sans select-none text-white relative overflow-hidden">
      {remoteAudioElem}

      {/* ─── Top Header Bar ─── */}
      <header className="relative h-14 sm:h-16 px-2.5 sm:px-6 bg-ez-surface/90 backdrop-blur-xl border-b border-ez-border/60 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back & Room / Companion info */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1 sm:max-w-[40%] mr-1 sm:mr-2">
          <button
            type="button"
            onClick={() => navigate(`/${language}/direct/t`)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={(t as any)?.common?.back || 'Back'}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {otherParticipant ? (
            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-ez-elevated border border-neon-green/40 shrink-0 shadow-neon-sm">
                <img
                  src={otherParticipant.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParticipant.socketId}`}
                  alt={otherParticipant.nickname}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                  {otherParticipant.nickname}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-[11px] text-ez-muted">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-neon-green animate-pulse shrink-0" />
                  <span className="text-neon-green font-semibold">{(t as any)?.disposable?.inRoom || 'online'}</span>
                  <span className="shrink-0">•</span>
                  <span className="font-mono text-[9px] sm:text-[10px] truncate">{roomId}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0 shadow-neon-sm">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                    {(t as any)?.disposable?.roomBadge || 'Disposable Room'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-[11px] text-ez-muted">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-amber-300 font-medium truncate">{(t as any)?.disposable?.waitingPeer || 'Waiting...'}</span>
                  <span className="shrink-0">•</span>
                  <span className="font-mono text-[9px] sm:text-[10px] truncate">{roomId}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Center: Live Countdown Timer (Perfect Absolute Centering) */}
        <div
          className={`hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border transition-all duration-300 pointer-events-auto z-10 ${isUrgent
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse shadow-sm'
            : 'bg-ez-elevated border-ez-border text-neon-green shadow-xs'
            }`}
        >
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="font-mono text-xs sm:text-sm font-extrabold tracking-wider">
            {formatTimer(secondsRemaining)}
          </span>
        </div>

        {/* Right: Actions + Mobile Timer */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 z-20">
          {/* Mobile Live Countdown Timer Pill */}
          <div
            className={`sm:hidden flex items-center space-x-1 px-2 py-1 rounded-full border transition-all duration-300 shrink-0 ${isUrgent
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse shadow-sm'
              : 'bg-ez-elevated border-ez-border text-neon-green shadow-xs'
              }`}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="font-mono text-[11px] font-extrabold tracking-wider">
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          {/* Share / Copy Link (Desktop always, Mobile only if companion joined since waiting bar is gone) */}
          <button
            type="button"
            onClick={copyRoomLink}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-ez-elevated hover:bg-ez-hover border border-ez-border items-center space-x-1 sm:space-x-1.5 text-xs text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0 ${
              participants.length <= 1 ? 'hidden sm:flex' : 'flex'
            }`}
            title={(t as any)?.disposable?.copyLink || 'Copy Link'}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedLink ? ((t as any)?.common?.copied || 'Copied') : ((t as any)?.disposable?.copyLink || 'Share')}</span>
          </button>

          {/* Voice Call Button */}
          {!isInCall ? (
            <button
              type="button"
              onClick={startCall}
              className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-neon-green/15 hover:bg-neon-green/25 border border-neon-green/30 text-neon-green text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer shrink-0"
              title={(t as any)?.disposable?.voiceCall || 'Voice Call'}
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{(t as any)?.disposable?.call || 'Call'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1 bg-neon-green/20 border border-neon-green/40 px-1.5 sm:px-2.5 h-8 sm:h-9 rounded-xl">
              <button
                type="button"
                onClick={toggleMute}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${isMuted ? 'text-rose-400 bg-rose-500/20' : 'text-neon-green hover:bg-white/10'
                  }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[10px] sm:text-[11px] font-mono text-neon-green font-bold px-0.5 sm:px-1">
                {formatTimer(callDuration)}
              </span>
              <button
                type="button"
                onClick={endCall}
                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Burn / Delete Button */}
          <button
            type="button"
            onClick={() => setShowBurnConfirm(true)}
            className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer shrink-0"
            title={(t as any)?.disposable?.burnNow || 'Delete Room'}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{(t as any)?.disposable?.burn || 'Burn'}</span>
          </button>
        </div>
      </header>

      {/* ─── Incoming Call Banner Modal ─── */}
      {isIncomingCall && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slide-in-down">
          <div className="p-4 bg-ez-elevated/95 backdrop-blur-2xl border border-neon-green/40 rounded-3xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green animate-bounce">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{(t as any)?.disposable?.incomingCall || 'Incoming Voice Call'}</div>
                <div className="text-[11px] text-ez-muted truncate max-w-[140px]">{callerName || 'Participant'}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={acceptCall}
                className="w-9 h-9 rounded-full bg-neon-green hover:bg-neon-green-light text-black flex items-center justify-center shadow-neon-sm cursor-pointer"
                title="Accept"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={rejectCall}
                className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for Companion Link Bar when alone in room */}
      {participants.length <= 1 && (
        <div className="bg-ez-elevated/95 border-b border-neon-green/30 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 animate-fade-in select-none z-10 shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-neon-green/20 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
              <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-white truncate">
                {(t as any)?.disposable?.waitingTitle || 'Waiting for companion to join'}
              </p>
              <p className="text-[10px] text-ez-muted truncate hidden sm:block">
                {(t as any)?.disposable?.waitingDesc || 'Send this link to start chatting. The room will automatically close after the timer expires.'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="hidden md:block w-48 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-neon-green outline-none select-all"
            />
            <button
              type="button"
              onClick={copyRoomLink}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-neon-green hover:bg-neon-green-light text-black font-bold text-xs rounded-xl shadow-neon-sm flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? ((t as any)?.common?.copied || 'Copied') : ((t as any)?.common?.copy || 'Copy Link')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Message History (Authentic EzTalk Chat Thread) */}
      <MessageThread
        messages={mappedMessages}
        currentUserId={currentPid}
        currentUserHandle={currentUserHandle}
        isGroupChat={false}
        isTyping={typingList.length > 0}
        recipientHandle={recipientLabel}
        hideDateDividers={true}
        hideStartOfHistory={true}
        hideEmptyPlaceholder={true}
        onReply={(msg) => setReplyingTo(msg)}
        onDelete={deleteMessage}
        onToggleReaction={toggleReaction}
        onOpenMedia={(m) => {
          if (!isImageMedia(m.url, m.name, m.type) && !isVideoMedia(m.url, m.name, m.type)) {
            downloadOrOpenFile(m.url, m.name);
          } else {
            setLightboxMedia(m);
          }
        }}
        onCallBack={startCall}
      />

      {/* Fluid Media Lightbox Viewer */}
      {lightboxMedia && (
        <MediaLightboxModal
          isOpen={Boolean(lightboxMedia)}
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Input Bar (Authentic EzTalk Message Input) */}
      <MessageInput
        currentUserHandle={currentUserHandle}
        recipientHandle={recipientLabel}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onDraftChange={() => {
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('disposable_typing', { roomId, isTyping: true });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              socket.emit('disposable_typing', { roomId, isTyping: false });
            }, 2000);
          }
        }}
        onSendMessage={(text, att, replyTo) => {
          handleSendMessage(text, att, replyTo);
        }}
      />

      {/* ─── Confirm Delete Room Modal ─── */}
      {showBurnConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setShowBurnConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-ez-surface border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 animate-scale-up text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 mb-3">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {(t as any)?.disposable?.burnConfirmTitle || 'Delete Room Now?'}
            </h3>
            <p className="text-xs text-ez-muted mb-5 leading-relaxed">
              {(t as any)?.disposable?.burnConfirmDesc ||
                'All messages and files will be permanently deleted for everyone without recovery.'}
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowBurnConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {(t as any)?.common?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleBurn}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
              >
                {(t as any)?.disposable?.confirmBurn || 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
