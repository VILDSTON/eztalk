import React, { useState, useRef, useEffect } from 'react';
import { Message, QuotedMessage } from '../../types/chat';
import {
  FileText,
  CheckCheck,
  Download,
  X,
  Play,
  Pause,
  CornerUpLeft,
  Edit2,
  Trash2,
  Smile,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
} from 'lucide-react';
import { normalizeHandle } from '../../utils/chatStorage';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  currentUserHandle?: string;
  isGroupChat?: boolean;
  onReply?: (quoted: QuotedMessage) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

function formatTelegramTime(createdAt?: string, fallbackText?: string): string {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch {
      // ignore
    }
  }
  if (fallbackText && (fallbackText.includes(':') || fallbackText.includes('M'))) {
    return fallbackText;
  }
  return '12:00';
}

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '👏', '🚀', '😮', '😢'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  currentUserHandle,
  isGroupChat,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isMe =
    (currentUserHandle &&
      message.senderHandle &&
      normalizeHandle(message.senderHandle) === normalizeHandle(currentUserHandle)) ||
    (currentUserId && message.senderId === currentUserId) ||
    message.senderId === 'me';

  const timeString = formatTelegramTime(message.createdAt, message.timestamp);

  // Audio Playback
  useEffect(() => {
    if (message.attachment?.type === 'audio') {
      const audio = new Audio(message.attachment.url);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        const total =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : message.attachment?.duration || 1;
        setAudioProgress(Math.min(100, (audio.currentTime / total) * 100));
      };

      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };

      return () => {
        audio.pause();
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

  const handleDownloadFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.attachment) return;
    const a = document.createElement('a');
    a.href = message.attachment.url;
    a.download = message.attachment.name || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div
        className={`group/bubble relative flex flex-col mb-1.5 max-w-full ${
          isMe ? 'items-end' : 'items-start'
        } animate-fade-in font-sans`}
      >
        {/* Telegram Group Sender Name */}
        {isGroupChat && !isMe && message.senderHandle && (
          <span className="text-[12px] font-bold text-[#00ff73] mb-0.5 ml-3">
            {message.senderHandle}
          </span>
        )}

        {/* Hover Quick Action Toolbar with clean offset */}
        <div
          className={`absolute -top-10 ${
            isMe ? 'right-0' : 'left-0'
          } hidden group-hover/bubble:flex items-center space-x-0.5 bg-[#171821] border border-white/15 p-1 rounded-full shadow-2xl z-30 animate-fade-in backdrop-blur-xl`}
        >
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiMenu(!showEmojiMenu)}
              className="p-1 rounded-full text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Quick Emoji Reaction Popup */}
            {showEmojiMenu && (
              <div className="absolute bottom-8 left-0 flex items-center space-x-1 bg-[#1f2026] border border-white/15 p-1.5 rounded-full shadow-2xl z-40 animate-fade-in backdrop-blur-xl">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      if (onToggleReaction) onToggleReaction(message.id, emoji);
                      setShowEmojiMenu(false);
                    }}
                    className="p-1 hover:scale-130 transition-transform text-sm cursor-pointer"
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
            onClick={() => {
              if (onReply) {
                onReply({
                  id: message.id,
                  senderHandle: message.senderHandle || (isMe ? 'You' : 'Friend'),
                  text: message.text || message.attachment?.name || 'Attachment',
                });
              }
            }}
            className="p-1 rounded-full text-gray-400 hover:text-[#00ff73] hover:bg-white/10 transition-colors cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>

          {/* Edit (Me only) */}
          {isMe && (
            <button
              type="button"
              onClick={() => {
                if (onEdit) onEdit(message);
              }}
              className="p-1 rounded-full text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete (Me only) */}
          {isMe && (
            <button
              type="button"
              onClick={() => {
                if (onDelete) onDelete(message.id);
              }}
              className="p-1 rounded-full text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Telegram Bubble Geometry */}
        <div
          className={`relative px-3.5 pt-2 pb-1.5 rounded-2xl max-w-[85%] sm:max-w-[70%] text-[14px] leading-relaxed shadow-sm transition-all ${
            isMe
              ? 'bg-[#103823] text-white border border-[#00ff73]/25 rounded-br-xs telegram-bubble-out'
              : 'bg-[#212121] text-slate-100 border border-white/5 rounded-bl-xs telegram-bubble-in'
          }`}
        >
          {/* Quoted Message */}
          {message.replyTo && (
            <div
              className={`mb-1.5 px-2.5 py-1 rounded-lg border-l-2 text-xs truncate ${
                isMe ? 'bg-black/25 border-[#00ff73]' : 'bg-black/35 border-[#00ff73]'
              }`}
            >
              <span className="font-bold block text-[11px] text-[#00ff73]">{message.replyTo.senderHandle}</span>
              <span className="text-gray-300 italic text-[11px] truncate block">{message.replyTo.text}</span>
            </div>
          )}

          {/* Voice Audio Message Player */}
          {message.attachment?.type === 'audio' && (
            <div className="flex items-center space-x-2.5 py-1 pr-2 min-w-[210px]">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#00ff73] text-black hover:scale-105 shadow-xs transition-transform cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden w-full">
                  <div
                    className="h-full bg-[#00ff73] rounded-full transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono mt-1">
                  <span>Voice message</span>
                  <span>{message.attachment.duration ? `0:0${message.attachment.duration}` : '0:05'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Image preview */}
          {message.attachment && message.attachment.type === 'image' && (
            <div className="mb-1 rounded-xl overflow-hidden">
              <div
                onClick={() => setShowFullImage(true)}
                className="relative cursor-pointer rounded-xl overflow-hidden bg-black/30"
              >
                <img
                  src={message.attachment.url}
                  alt={message.attachment.name}
                  className="max-h-72 max-w-full rounded-xl object-contain hover:scale-[1.01] transition-transform"
                />
              </div>
            </div>
          )}

          {/* Document attachment */}
          {message.attachment && message.attachment.type === 'file' && (
            <div
              onClick={handleDownloadFile}
              className="flex items-center justify-between space-x-2.5 p-2 rounded-xl cursor-pointer bg-black/25 hover:bg-black/40 mb-1 border border-white/5"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-[#00ff73]/20 text-[#00ff73]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs truncate min-w-0">
                  <span className="font-semibold block truncate text-white">{message.attachment.name}</span>
                  <span className="text-[10px] text-gray-400">{message.attachment.size}</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400 hover:text-white shrink-0 ml-1" />
            </div>
          )}

          {/* Call event */}
          {message.callInfo && (
            <div className="flex items-center space-x-2.5 py-1 min-w-[180px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.callInfo.type === 'missed' || message.callInfo.type === 'declined'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-[#00ff73]/20 text-[#00ff73]'
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
                <span className="text-[10px] text-gray-400 block font-mono">
                  {message.callInfo.duration
                    ? `${Math.floor(message.callInfo.duration / 60)}:${(message.callInfo.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : 'Voice call'}
                </span>
              </div>
            </div>
          )}

          {/* Text & Inline Telegram Timestamp */}
          {message.text && !message.callInfo && (
            <span className="break-words select-text mr-1.5">{message.text}</span>
          )}

          {/* Telegram Inline Time + Checkmark Footer */}
          <span className="inline-flex items-center float-right ml-2 mt-1 space-x-1 select-none text-[11px] text-gray-400 font-mono">
            {message.isEdited && <span className="text-[10px] italic mr-0.5">edited</span>}
            <span>{timeString}</span>
            {isMe && (
              <span className="text-[#00ff73] flex items-center ml-0.5">
                <CheckCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </span>
        </div>

        {/* Telegram Reaction Badges below Bubble */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(message.reactions).map(([emoji, users]) => {
              const hasReacted =
                currentUserHandle && users.includes(normalizeHandle(currentUserHandle));
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction && onToggleReaction(message.id, emoji)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                    hasReacted
                      ? 'bg-[#00ff73]/20 border border-[#00ff73]/60 text-white font-bold'
                      : 'bg-[#1e2026] border border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-mono text-gray-400">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Image Preview Modal */}
      {showFullImage && message.attachment && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none"
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-5 right-5 text-gray-300 hover:text-white p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={message.attachment.url}
              alt={message.attachment.name}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
