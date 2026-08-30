import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, QuotedMessage } from '../../types/chat';
import {
  FileText,
  CheckCheck,
  Download,
  X,
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
  Check,
  Flame,
  Lock,
  Clock,
} from 'lucide-react';
import { normalizeHandle } from '../../utils/chatStorage';

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

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '👏', '🚀', '😮', '😢'];
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
}) => {
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Swipe to Reply Gesture State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const hasHaptickedRef = useRef(false);

  // Custom Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Audio & Waveform player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [playbackSpeedIdx, setPlaybackSpeedIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // TTL Burn-on-Read Countdown State
  const [ttlRemaining, setTtlRemaining] = useState<number | null>(
    message.ttlSeconds ? Number(message.ttlSeconds) : null
  );
  const [isDissolving, setIsDissolving] = useState(false);

  const isMe =
    (currentUserHandle &&
      message.senderHandle &&
      normalizeHandle(message.senderHandle) === normalizeHandle(currentUserHandle)) ||
    (currentUserId && message.senderId === currentUserId) ||
    message.senderId === 'me';

  const timeString = formatTelegramTime(message.createdAt, message.timestamp);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClose = () => {
      setContextMenuPos(null);
      setShowEmojiMenu(false);
    };
    if (contextMenuPos) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
    }
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
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

  // TTL Burn-on-Read Countdown Timer
  useEffect(() => {
    if (!message.ttlSeconds || message.ttlSeconds <= 0) return;

    const interval = setInterval(() => {
      setTtlRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsDissolving(true);
          setTimeout(() => {
            if (onDelete) onDelete(message.id);
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [message.ttlSeconds, message.id, onDelete]);

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

  // Scrub audio via waveform click/drag
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
    // Deterministic pseudo-peaks derived from message id
    const seed = (message.id || 'msg').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const val = Math.abs(Math.sin((i + seed) * 0.45)) * 75 + 20;
      bars.push(Math.round(val));
    }
    return bars;
  }, [message.attachment?.peaks, message.id]);

  // Swipe-to-Reply Touch / Mouse Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeStartXRef.current = touch.clientX;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    hasHaptickedRef.current = false;
    setIsSwiping(true);

    longPressTimerRef.current = setTimeout(() => {
      const x = Math.min(window.innerWidth - 190, Math.max(10, touch.clientX));
      const y = Math.min(window.innerHeight - 230, Math.max(10, touch.clientY));
      setContextMenuPos({ x, y });
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchStartPosRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    if (swipeStartXRef.current !== null) {
      const deltaX = touch.clientX - swipeStartXRef.current;
      // Allow only swipe left (negative delta)
      if (deltaX < 0) {
        const dampened = -Math.min(80, Math.pow(-deltaX, 0.9));
        setSwipeOffset(dampened);
        if (Math.abs(dampened) >= 55 && !hasHaptickedRef.current) {
          if ('vibrate' in navigator) navigator.vibrate(10);
          hasHaptickedRef.current = true;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (Math.abs(swipeOffset) >= 55) {
      triggerReply();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    swipeStartXRef.current = null;
  };

  // Right-Click Context Menu Trigger
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(window.innerWidth - 190, Math.max(10, e.clientX));
    const y = Math.min(window.innerHeight - 230, Math.max(10, e.clientY));
    setContextMenuPos({ x, y });
  };

  // Copy Message Text (Without author headers if secret/forward restricted)
  const handleCopyText = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const content = message.text || message.attachment?.url || '';
    if (content) {
      navigator.clipboard.writeText(content).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setContextMenuPos(null);
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
  };

  const triggerForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (message.forwardRestricted || message.isSecret) return;
    if (onForward) onForward(message);
    setContextMenuPos(null);
  };

  const triggerEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEdit) onEdit(message);
    setContextMenuPos(null);
  };

  const triggerDelete = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onDelete) onDelete(message.id);
    setContextMenuPos(null);
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
        className={`relative flex flex-col mb-1.5 max-w-full ${
          isMe ? 'items-end' : 'items-start'
        } ${isDissolving ? 'animate-dissolve opacity-0 scale-95 transition-all duration-500' : 'animate-fade-in'} font-sans`}
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

        {/* Hover Action Toolbar (Desktop) */}
        <div
          className={`absolute -top-9 ${
            isMe ? 'right-0' : 'left-0'
          } hidden group-hover/bubble:flex items-center space-x-0.5 bg-ez-elevated/95 backdrop-blur-md border border-ez-border/80 p-0.5 rounded-full shadow-glass z-30 animate-fade-in`}
        >
          {/* Reaction Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiMenu(!showEmojiMenu);
              }}
              className="p-1 rounded-full text-ez-muted hover:text-amber-400 hover:bg-white/10 transition-colors duration-150 cursor-pointer"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiMenu && (
              <div className="absolute bottom-8 left-0 flex items-center space-x-0.5 bg-ez-elevated/95 backdrop-blur-md border border-ez-border p-1.5 rounded-full shadow-glass-lg z-40 animate-scale-up">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleReaction) onToggleReaction(message.id, emoji);
                      setShowEmojiMenu(false);
                    }}
                    className="p-1 hover:scale-125 transition-transform duration-100 text-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            type="button"
            onClick={triggerReply}
            className="p-1 rounded-full text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>

          {/* Forward (Hidden if secret / forwardRestricted) */}
          {!message.forwardRestricted && !message.isSecret && (
            <button
              type="button"
              onClick={triggerForward}
              className="p-1 rounded-full text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors duration-150 cursor-pointer"
              title="Forward"
            >
              <CornerUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More Options */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setContextMenuPos({
                x: Math.min(window.innerWidth - 190, rect.left),
                y: Math.min(window.innerHeight - 230, rect.bottom + 5),
              });
            }}
            className="p-1 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            title="More actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Swipe-to-Reply Neon Arrow Indicator Reveal */}
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

        {/* Main Message Bubble with Swipe Physics */}
        <div
          className={`group/bubble relative px-3.5 pt-2 pb-1.5 rounded-2xl max-w-[85%] sm:max-w-[70%] text-[14px] leading-relaxed shadow-sm cursor-pointer select-none transition-transform ${
            isSwiping ? '' : 'duration-200 ease-out'
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
              className={`mb-1.5 px-2.5 py-1 rounded-lg border-l-2 text-xs truncate ${
                isMe ? 'bg-black/20 border-neon-green' : 'bg-black/25 border-neon-green'
              }`}
            >
              <span className="font-bold block text-[11px] text-neon-green">{message.replyTo.senderHandle}</span>
              <span className="text-gray-300 italic text-[11px] truncate block">{message.replyTo.text}</span>
            </div>
          )}

          {/* Interactive Voice Waveform Player */}
          {message.attachment?.type === 'audio' && (
            <div className="flex items-center space-x-3 py-1.5 pr-2 min-w-[240px] sm:min-w-[270px]">
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
            <div className="mb-1 rounded-xl overflow-hidden">
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
              className="flex items-center justify-between space-x-2.5 p-2 rounded-xl cursor-pointer bg-black/20 hover:bg-black/30 mb-1 border border-white/5 transition-colors duration-150"
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

          {/* Call Event */}
          {message.callInfo && (
            <div className="flex items-center space-x-2.5 py-1 min-w-[180px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.callInfo.type === 'missed' || message.callInfo.type === 'declined'
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'bg-neon-green/15 text-neon-green'
                }`}
              >
                {message.callInfo.type === 'missed' ? (
                  <PhoneMissed className="w-4 h-4" />
                ) : message.callInfo.type === 'declined' || message.callInfo.type === 'canceled' ? (
                  <PhoneOff className="w-4 h-4" />
                ) : isMe ? (
                  <PhoneOutgoing className="w-4 h-4" />
                ) : (
                  <PhoneIncoming className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs block text-white truncate">
                  {message.callInfo.type === 'missed'
                    ? 'Missed Call'
                    : message.callInfo.type === 'declined'
                    ? 'Declined Call'
                    : 'Voice Call'}
                </span>
                <span className="text-[10px] text-ez-muted block font-mono">
                  {message.callInfo.duration
                    ? `${Math.floor(message.callInfo.duration / 60)}:${(message.callInfo.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : 'Voice call'}
                </span>
              </div>
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <p className="whitespace-pre-wrap break-words word-break-all select-text selection:bg-neon-green selection:text-black">
              {message.text}
            </p>
          )}

          {/* Bubble Meta Footer: Time + TTL Ring + Checkmarks */}
          <div className="flex items-center justify-end space-x-1.5 text-[10px] font-mono select-none mt-0.5 text-ez-muted">
            {/* TTL Countdown Ring */}
            {ttlRemaining !== null && ttlRemaining > 0 && (
              <div
                className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold font-mono animate-pulse"
                title={`Self-destructs in ${ttlRemaining} seconds`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>{ttlRemaining}s</span>
              </div>
            )}

            {/* Secret / Forward Protected Lock Icon */}
            {(message.forwardRestricted || message.isSecret) && (
              <span title="Secret / Forward Restricted">
                <Lock className="w-2.5 h-2.5 text-neon-green" />
              </span>
            )}

            {message.isEdited && <span className="italic text-[9px] text-ez-muted mr-0.5">edited</span>}

            <span>{timeString}</span>

            {/* Delivery / Sending Status */}
            {isMe && (
              <span className="ml-0.5">
                {message.status === 'sending' ? (
                  <Clock className="w-3 h-3 text-ez-muted animate-spin" />
                ) : message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-neon-green" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5 text-ez-muted/70" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Floating Context Menu */}
        {contextMenuPos && (
          <div
            className="fixed bg-ez-elevated/95 backdrop-blur-md border border-ez-border rounded-2xl shadow-glass-lg p-1.5 z-50 animate-scale-up text-xs space-y-0.5 w-44 select-none"
            style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={triggerReply}
              className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-neon-green" />
              <span>Reply</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            {!message.forwardRestricted && !message.isSecret && (
              <button
                type="button"
                onClick={triggerForward}
                className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <CornerUpRight className="w-3.5 h-3.5 text-neon-green" />
                <span>Forward</span>
              </button>
            )}

            {isMe && message.text && (
              <button
                type="button"
                onClick={triggerEdit}
                className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit</span>
              </button>
            )}

            <div className="h-px bg-ez-border/50 my-1" />

            <button
              type="button"
              onClick={triggerDelete}
              className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
