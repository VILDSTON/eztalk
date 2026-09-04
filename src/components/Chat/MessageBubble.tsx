import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Message, QuotedMessage } from '../../types/chat';
import {
  FileText,
  CheckCheck,
  Download,
  Play,
  Pause,
  CornerUpLeft,
  CornerUpRight,
  Edit2,
  Trash2,
  Smile,
  Copy,
  MoreHorizontal,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Phone,
  Check,
  Lock,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { normalizeHandle } from '../../utils/chatStorage';
import { MobileMessageActionSheet } from './MobileMessageActionSheet';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  currentUserHandle?: string;
  isGroupChat?: boolean;
  onReply?: (quoted: QuotedMessage) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenMedia?: (media: { url: string; name?: string; type?: 'image' | 'video' | 'file' | 'audio' }) => void;
  onCallBack?: () => void;
  onRetry?: (message: Message) => void;
}

function formatTelegramTime(createdAt?: string, fallbackText?: string): string {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch {}
  }
  if (fallbackText && (fallbackText.includes(':') || fallbackText.includes('M'))) {
    return fallbackText;
  }
  return '12:00';
}

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '🔥', '😮', '👏', '🚀', '😢'];
const PLAYBACK_SPEEDS = [1, 1.5, 2];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  currentUserHandle,
  isGroupChat,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
  onCallBack,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  // Mobile Bottom Sheet State (< 640px)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Mobile Swipe-to-Reply Gesture State (Touch Only)
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef(false);
  const hasHaptickedRef = useRef(false);

  // Desktop Context Menu State (>= 640px)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio & Waveform player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [playbackSpeedIdx, setPlaybackSpeedIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const isMe =
    (currentUserHandle &&
      message.senderHandle &&
      normalizeHandle(message.senderHandle) === normalizeHandle(currentUserHandle)) ||
    (currentUserId && message.senderId === currentUserId) ||
    message.senderId === 'me';

  const timeString = formatTelegramTime(message.createdAt, message.timestamp);

  // Normalize reactions into an array of { emoji, count, hasReacted }
  const formattedReactions = useMemo(() => {
    if (!message.reactions) return [];
    if (Array.isArray(message.reactions)) {
      return (message.reactions as any[]).map((r) => {
        const users: string[] = Array.isArray(r.users) ? r.users : [];
        const hasReacted = Boolean(
          (currentUserHandle && users.some((u) => normalizeHandle(u).toLowerCase() === normalizeHandle(currentUserHandle).toLowerCase())) ||
          (currentUserId && users.includes(currentUserId))
        );
        return {
          emoji: r.emoji,
          count: r.count || users.length || 1,
          hasReacted,
        };
      });
    }
    return Object.entries(message.reactions)
      .filter(([_, handles]) => Array.isArray(handles) && handles.length > 0)
      .map(([emoji, handles]) => {
        const hasReacted = Boolean(
          (currentUserHandle && handles.some((h) => normalizeHandle(h).toLowerCase() === normalizeHandle(currentUserHandle).toLowerCase())) ||
          (currentUserId && handles.includes(currentUserId))
        );
        return {
          emoji,
          count: handles.length,
          hasReacted,
        };
      });
  }, [message.reactions, currentUserHandle, currentUserId]);

  // Check if message is a call event (structured callInfo or fallback text pattern)
  const callData = useMemo(() => {
    if (message.callInfo) {
      let type = message.callInfo.type;
      const duration = message.callInfo.duration || 0;
      if (duration === 0 && (type === 'outgoing' || type === 'incoming')) {
        type = isMe ? 'canceled' : 'missed';
      }
      return { type, duration };
    }
    if (!message.text) return null;
    if (message.text.includes('Canceled Call')) {
      return { type: (isMe ? 'canceled' : 'missed') as 'canceled' | 'missed', duration: 0 };
    }
    if (message.text.includes('Missed Voice Call') || message.text.includes('Missed Call')) {
      return { type: 'missed' as const, duration: 0 };
    }
    if (message.text.includes('Declined Call')) {
      return { type: 'declined' as const, duration: 0 };
    }
    const match = message.text.match(/Voice Call \((\d+):(\d+)\)/);
    if (match) {
      const mins = parseInt(match[1], 10) || 0;
      const secs = parseInt(match[2], 10) || 0;
      return { type: (isMe ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming', duration: mins * 60 + secs };
    }
    if (message.text.startsWith('📞 Voice Call')) {
      return { type: (isMe ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming', duration: 0 };
    }
    return null;
  }, [message.callInfo, message.text, isMe]);

  const callPresentation = useMemo(() => {
    if (!callData) return null;

    const { type, duration } = callData;
    const hasDuration = duration > 0;
    const formattedDuration = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;

    if (hasDuration) {
      return {
        title: isMe ? 'Outgoing Call' : 'Incoming Call',
        subtitle: `${formattedDuration} duration`,
        statusColor: 'bg-neon-green/15 text-neon-green border-neon-green/25',
        Icon: isMe ? PhoneOutgoing : PhoneIncoming,
        isNegative: false,
      };
    }

    if (type === 'declined') {
      return {
        title: 'Declined Call',
        subtitle: isMe ? 'Call was declined' : 'Declined voice call',
        statusColor: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
        Icon: PhoneOff,
        isNegative: true,
      };
    }

    if (type === 'missed') {
      return {
        title: 'Missed Call',
        subtitle: isMe ? 'No answer' : 'Missed voice call',
        statusColor: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
        Icon: PhoneMissed,
        isNegative: true,
      };
    }

    // Default for canceled
    return {
      title: isMe ? 'Canceled Call' : 'Missed Call',
      subtitle: isMe ? 'Call canceled' : 'Missed voice call',
      statusColor: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
      Icon: isMe ? PhoneOff : PhoneMissed,
      isNegative: true,
    };
  }, [callData, isMe]);

  // Close context menu on outside click, scroll, or Escape
  useEffect(() => {
    const handleClose = () => {
      setContextMenuPos(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (contextMenuPos) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuPos]);


  // Audio Playback Lifecycle
  useEffect(() => {
    if (message.attachment?.type === 'audio') {
      const audio = new Audio(message.attachment.url);
      audio.preservesPitch = true;
      audio.playbackRate = PLAYBACK_SPEEDS[playbackSpeedIdx];
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        const total =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : message.attachment?.duration || 1;
        setAudioProgress(Math.min(100, (audio.currentTime / total) * 100));
        setCurrentTimeSec(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        setCurrentTimeSec(0);
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };

      return () => {
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }
  }, [message.attachment]);

  const togglePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (playbackSpeedIdx + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeedIdx(nextIdx);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIdx];
    }
  };

  // Scrub audio via waveform click
  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!waveformRef.current || !audioRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percentage = clickX / rect.width;
    const totalDuration =
      audioRef.current.duration && isFinite(audioRef.current.duration)
        ? audioRef.current.duration
        : message.attachment?.duration || 5;

    audioRef.current.currentTime = percentage * totalDuration;
    setAudioProgress(percentage * 100);
    setCurrentTimeSec(Math.floor(audioRef.current.currentTime));
    if (!isPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Generate or read audio peaks (32 bars)
  const waveformBars = useMemo(() => {
    if (message.attachment?.peaks && message.attachment.peaks.length > 0) {
      return message.attachment.peaks;
    }
    const seed = (message.id || 'msg').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const val = Math.abs(Math.sin((i + seed) * 0.45)) * 75 + 20;
      bars.push(Math.round(val));
    }
    return bars;
  }, [message.attachment?.peaks, message.id]);

  // Mobile Touch Handlers: Swipe-to-Reply & Long-Press Context Menu (NO mouse dragging)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipeRef.current = false;
    hasHaptickedRef.current = false;

    // Start mobile 450ms long press timer
    longPressTimerRef.current = setTimeout(() => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {}
      }
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        setIsMobileSheetOpen(true);
      } else {
        const menuWidth = 220;
        const menuHeight = 280;
        let x = touch.clientX;
        let y = touch.clientY;
        if (x + menuWidth > window.innerWidth - 12) {
          x = Math.max(12, window.innerWidth - menuWidth - 12);
        } else {
          x = Math.max(12, x);
        }
        if (y + menuHeight > window.innerHeight - 12) {
          y = Math.max(12, y - menuHeight);
        } else {
          y = Math.max(12, y);
        }
        setContextMenuPos({ x, y });
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;

    // Cancel long press if moved > 10px
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Determine swipe orientation
    if (!isHorizontalSwipeRef.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        isHorizontalSwipeRef.current = true;
        setIsSwiping(true);
      }
    }

    // Horizontal left-swipe rubber-band clamping (constrained to max -75px)
    if (isHorizontalSwipeRef.current && dx < 0) {
      const clamped = Math.max(-75, Math.min(0, dx));
      setSwipeOffset(clamped);

      if (clamped <= -55 && !hasHaptickedRef.current) {
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {}
        }
        hasHaptickedRef.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (swipeOffset <= -55) {
      triggerReply();
    }

    // Always spring back smoothly to 0px
    setSwipeOffset(0);
    setIsSwiping(false);
    isHorizontalSwipeRef.current = false;
    touchStartPosRef.current = null;
  };

  // Right-Click Context Menu Trigger (Desktop & Touch)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setIsMobileSheetOpen(true);
    } else {
      const menuWidth = 220;
      const menuHeight = 280;
      let x = e.clientX;
      let y = e.clientY;
      if (x + menuWidth > window.innerWidth - 12) {
        x = Math.max(12, window.innerWidth - menuWidth - 12);
      } else {
        x = Math.max(12, x);
      }
      if (y + menuHeight > window.innerHeight - 12) {
        y = Math.max(12, y - menuHeight);
      } else {
        y = Math.max(12, y);
      }
      setContextMenuPos({ x, y });
    }
  };

  // Copy Message Text
  const handleCopyText = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const content = callPresentation
      ? `${callPresentation.title} (${callPresentation.subtitle})`
      : message.text || message.attachment?.url || message.attachment?.name || '';
    if (content) {
      navigator.clipboard.writeText(content).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setContextMenuPos(null);
    setIsMobileSheetOpen(false);
  };

  const triggerReply = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onReply) {
      onReply({
        id: message.id,
        senderHandle: message.senderHandle || (isMe ? 'You' : 'Friend'),
        text: message.text || message.attachment?.name || 'Attachment',
      });
    }
    setContextMenuPos(null);
    setIsMobileSheetOpen(false);
  };

  const triggerForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (message.forwardRestricted || message.isSecret) return;
    if (onForward) onForward(message);
    setContextMenuPos(null);
    setIsMobileSheetOpen(false);
  };

  const triggerEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEdit) onEdit(message);
    setContextMenuPos(null);
    setIsMobileSheetOpen(false);
  };

  const triggerDelete = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onDelete) onDelete(message.id);
    setContextMenuPos(null);
    setIsMobileSheetOpen(false);
  };


  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.attachment && onOpenMedia) {
      onOpenMedia({
        url: message.attachment.url,
        name: message.attachment.name,
        type: message.attachment.type,
      });
    }
  };

  return (
    <>
      <div
        className={`group/bubble relative flex flex-col ${
          formattedReactions.length > 0 ? 'mb-3.5 sm:mb-4' : 'mb-1.5'
        } max-w-full ${
          isMe ? 'items-end' : 'items-start'
        } animate-fade-in font-sans`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Group Sender Name */}
        {isGroupChat && !isMe && message.senderHandle && (
          <span className="text-[11px] font-bold text-neon-green mb-0.5 ml-3">
            {message.senderHandle}
          </span>
        )}



        {/* Mobile Swipe-to-Reply Neon Arrow Indicator Reveal */}
        {swipeOffset < 0 && (
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{
              transform: `translateX(${Math.abs(swipeOffset) * 0.3}px) scale(${Math.min(1.2, Math.abs(swipeOffset) / 50)})`,
              opacity: Math.min(1, Math.abs(swipeOffset) / 40),
            }}
          >
            <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/50 flex items-center justify-center text-neon-green shadow-neon-sm">
              <CornerUpLeft className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Main Message Bubble with Mobile Smooth Spring Reset */}
        <div
          className={`relative px-3.5 pt-2 pb-1.5 rounded-2xl max-w-[85%] sm:max-w-[70%] text-[14px] leading-relaxed shadow-sm select-text ${
            isSwiping ? '' : 'transition-transform duration-200 ease-out'
          } ${
            isMe
              ? 'bg-ez-sent text-white border border-neon-green/15 rounded-br-sm telegram-bubble-out'
              : 'bg-ez-received text-slate-100 border border-ez-border/50 rounded-bl-sm telegram-bubble-in'
          }`}
          style={{ transform: `translateX(${swipeOffset}px)` }}
        >
          {/* Forwarded Header */}
          {message.isForwarded && (
            <div className="flex items-center space-x-1.5 text-[11px] text-neon-green/90 mb-1 font-semibold select-none">
              <CornerUpRight className="w-3.5 h-3.5 text-neon-green shrink-0" />
              <span>
                Forwarded from <strong className="text-white font-mono">{message.forwardedFrom || 'Contact'}</strong>
              </span>
            </div>
          )}

          {/* Quoted Message */}
          {message.replyTo && (
            <div
              className={`mb-1.5 px-2.5 py-1 rounded-lg border-l-2 text-xs truncate select-none ${
                isMe ? 'bg-black/20 border-neon-green' : 'bg-black/25 border-neon-green'
              }`}
            >
              <span className="font-bold block text-[11px] text-neon-green">{message.replyTo.senderHandle}</span>
              <span className="text-gray-300 italic text-[11px] truncate block">{message.replyTo.text}</span>
            </div>
          )}

          {/* Interactive Voice Waveform Player */}
          {message.attachment?.type === 'audio' && (
            <div className="flex items-center space-x-3 py-1.5 pr-2 min-w-[240px] sm:min-w-[270px] select-none">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-neon-green text-black hover:scale-105 shadow-neon-sm transition-transform duration-150 cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {/* Waveform Equalizer Container */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div
                  ref={waveformRef}
                  onClick={handleWaveformSeek}
                  className="flex items-center space-x-[2px] h-6 cursor-pointer py-1 group/wave"
                  title="Click to seek"
                >
                  {waveformBars.map((height, idx) => {
                    const barPercent = (idx / waveformBars.length) * 100;
                    const isPassed = barPercent <= audioProgress;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-75 ${
                          isPassed
                            ? 'bg-neon-green shadow-neon-dot'
                            : 'bg-white/20 group-hover/wave:bg-white/35'
                        }`}
                        style={{ height: `${Math.max(15, height)}%` }}
                      />
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-[10px] text-ez-muted font-mono mt-0.5">
                  <span>
                    {isPlaying
                      ? `0:${currentTimeSec < 10 ? '0' : ''}${currentTimeSec}`
                      : 'Voice message'}
                  </span>
                  <span>
                    {message.attachment.duration ? `0:${message.attachment.duration < 10 ? '0' : ''}${message.attachment.duration}` : '0:05'}
                  </span>
                </div>
              </div>

              {/* Speed Toggle Pill Button */}
              <button
                type="button"
                onClick={handleSpeedToggle}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono text-neon-green bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 transition-colors cursor-pointer shrink-0"
                title="Playback Speed"
              >
                {PLAYBACK_SPEEDS[playbackSpeedIdx]}x
              </button>
            </div>
          )}

          {/* Fluid Image Preview */}
          {message.attachment && message.attachment.type === 'image' && (
            <div className="mb-1 rounded-xl overflow-hidden select-none">
              <div
                onClick={handleMediaClick}
                className="relative cursor-pointer rounded-xl overflow-hidden bg-black/20 group/media"
              >
                <img
                  src={message.attachment.url}
                  alt={message.attachment.name}
                  className="max-h-72 max-w-full rounded-xl object-contain group-hover/media:scale-[1.01] transition-transform duration-150"
                />
              </div>
            </div>
          )}

          {/* Document Attachment */}
          {message.attachment && message.attachment.type === 'file' && (
            <div
              onClick={handleMediaClick}
              className="flex items-center justify-between space-x-2.5 p-2 rounded-xl cursor-pointer bg-black/20 hover:bg-black/30 mb-1 border border-white/5 transition-colors duration-150 select-none"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-neon-green/15 text-neon-green">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs truncate min-w-0">
                  <span className="font-semibold block truncate text-white">{message.attachment.name}</span>
                  <span className="text-[10px] text-ez-muted">{message.attachment.size}</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-ez-muted hover:text-white shrink-0 ml-1" />
            </div>
          )}

          {/* Call Event Card */}
          {callPresentation && (
            <div className="flex items-center justify-between space-x-3.5 py-1 min-w-[210px] select-none">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${callPresentation.statusColor} shadow-xs`}
                >
                  <callPresentation.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-white block truncate tracking-tight">
                    {callPresentation.title}
                  </span>
                  <span className="text-[11px] text-ez-muted block font-mono mt-0.5">
                    {callPresentation.subtitle}
                  </span>
                </div>
              </div>

              {onCallBack && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCallBack();
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-neon-green/20 text-ez-muted hover:text-neon-green border border-white/10 hover:border-neon-green/30 transition-all duration-150 cursor-pointer shadow-xs shrink-0 group/callbtn ml-2"
                  title="Call back"
                >
                  <Phone className="w-3.5 h-3.5 transition-transform duration-150 group-hover/callbtn:scale-110" />
                </button>
              )}
            </div>
          )}

          {/* Text Content with Native Selection (Suppressed for call events to prevent duplicate raw text) */}
          {!callPresentation && message.text && (
            <p className="whitespace-pre-wrap break-words word-break-all select-text selection:bg-neon-green selection:text-black">
              {message.text}
            </p>
          )}

          {/* Bubble Meta Footer: Time + Checkmarks */}
          <div className="flex items-center justify-end space-x-1.5 text-[10px] font-mono select-none mt-0.5 text-ez-muted">
            {/* Secret / Forward Protected Lock Icon */}
            {(message.forwardRestricted || message.isSecret) && (
              <span title="Forward Restricted">
                <Lock className="w-2.5 h-2.5 text-neon-green" />
              </span>
            )}

            {message.isEdited && <span className="italic text-[9px] text-ez-muted mr-0.5">edited</span>}

            <span>{timeString}</span>

            {/* Delivery / Sending / Retry Status */}
            {isMe && (
              <span className="ml-0.5">
                {message.status === 'sending' ? (
                  <span title="Sending...">
                    <Clock className="w-3 h-3 text-ez-muted animate-spin" />
                  </span>
                ) : message.status === 'failed' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRetry) onRetry(message);
                    }}
                    className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Failed to send. Click to retry."
                  >
                    <AlertCircle className="w-3 h-3 text-red-400 animate-pulse" />
                    <span className="text-[9px] font-sans font-bold underline">Retry</span>
                  </button>
                ) : message.status === 'read' ? (
                  <span title="Read">
                    <CheckCheck className="w-3.5 h-3.5 text-neon-green" />
                  </span>
                ) : (
                  <span title="Sent">
                    <CheckCheck className="w-3.5 h-3.5 text-ez-muted/70" />
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Floating Reaction Badges (attached cleanly to the bottom edge of the bubble) */}
          {formattedReactions.length > 0 && (
            <div
              className={`absolute -bottom-2 ${
                isMe ? 'right-2' : 'left-2'
              } flex items-center gap-1 z-20 select-none`}
            >
              {formattedReactions.map((reaction, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleReaction) onToggleReaction(message.id, reaction.emoji);
                  }}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-90 border shadow-md cursor-pointer ${
                    reaction.hasReacted
                      ? 'bg-[#0F141C] border-neon-green/40 text-neon-green font-semibold shadow-xs'
                      : 'bg-[#131B26] border-white/10 text-gray-200 hover:bg-[#1A2332] hover:border-white/20'
                  }`}
                >
                  <span className="text-[13px] leading-none">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="text-[10px] font-bold font-mono ml-0.5">
                      {reaction.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Context Menu (Desktop Right-Click >= 640px) rendered via Portal */}
        {contextMenuPos &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-50 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuPos(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuPos(null);
                }}
              />
              <div
                className="fixed bg-ez-elevated/95 backdrop-blur-md border border-ez-border rounded-2xl shadow-glass-lg p-2 z-50 animate-scale-up text-xs space-y-1 w-56 select-none"
                style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Quick Reactions Bar in Context Menu */}
                <div className="flex items-center justify-between px-1 py-1 bg-white/[0.04] rounded-xl border border-white/5 mb-1">
                  {EMOJI_OPTIONS.slice(0, 7).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ('vibrate' in navigator) {
                          try {
                            navigator.vibrate(15);
                          } catch {}
                        }
                        if (onToggleReaction) onToggleReaction(message.id, emoji);
                        setContextMenuPos(null);
                      }}
                      className="p-1 hover:scale-125 active:scale-130 transition-transform duration-100 text-base cursor-pointer rounded-lg hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={triggerReply}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <CornerUpLeft className="w-4 h-4 text-neon-green" />
                  <span className="font-medium">Reply</span>
                </button>

                {!message.forwardRestricted && !message.isSecret && (
                  <button
                    type="button"
                    onClick={triggerForward}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <CornerUpRight className="w-4 h-4 text-neon-green" />
                    <span className="font-medium">Forward</span>
                  </button>
                )}

                {(Boolean(message.text) || Boolean(callPresentation)) && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-gray-300" />}
                    <span className="font-medium">{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                )}

                {isMe && message.text && !callPresentation && (
                  <button
                    type="button"
                    onClick={triggerEdit}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <Edit2 className="w-4 h-4 text-amber-400" />
                    <span className="font-medium">Edit</span>
                  </button>
                )}

                {callPresentation && onCallBack && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenuPos(null);
                      onCallBack();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-neon-green hover:text-white hover:bg-neon-green/10 transition-colors cursor-pointer text-left"
                  >
                    <Phone className="w-4 h-4 text-neon-green" />
                    <span className="font-medium">Call Back</span>
                  </button>
                )}

                {onDelete && (
                  <>
                    <div className="h-px bg-ez-border/50 my-1" />
                    <button
                      type="button"
                      onClick={triggerDelete}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">Delete Message</span>
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body
          )}
      </div>

      {/* Mobile Bottom Sheet (< 640px) */}
      <MobileMessageActionSheet
        isOpen={isMobileSheetOpen}
        message={message}
        isMe={isMe}
        copied={copied}
        onClose={() => setIsMobileSheetOpen(false)}
        onReply={() => triggerReply()}
        onForward={!message.forwardRestricted && !message.isSecret ? () => triggerForward() : undefined}
        onCopy={Boolean(message.text) || Boolean(callPresentation) ? () => handleCopyText() : undefined}
        onEdit={isMe && Boolean(message.text) && !callPresentation ? () => triggerEdit() : undefined}
        onDelete={onDelete ? () => triggerDelete() : undefined}
        onToggleReaction={onToggleReaction ? (emoji) => onToggleReaction(message.id, emoji) : undefined}
      />
    </>
  );
};
