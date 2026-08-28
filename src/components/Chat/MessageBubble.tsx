import React, { useState, useRef, useEffect } from 'react';
import { Message, QuotedMessage } from '../../types/chat';
import {
  FileText,
  CheckCheck,
  Download,
  X,
  ExternalLink,
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

function formatMessageTime(createdAt?: string, fallbackText?: string): string {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch {
      // ignore
    }
  }
  if (fallbackText && (fallbackText.includes('AM') || fallbackText.includes('PM') || fallbackText.includes(':'))) {
    return fallbackText;
  }
  return 'Just now';
}

const EMOJI_OPTIONS = ['❤️', '🔥', '👍', '😂', '🚀', '👏', '😮'];

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

  const timeString = formatMessageTime(message.createdAt, message.timestamp);

  // Audio Playback
  useEffect(() => {
    if (message.attachment?.type === 'audio') {
      const audio = new Audio(message.attachment.url);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
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
      audioRef.current.play();
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
        className={`group/bubble relative flex flex-col mb-3.5 ${
          isMe ? 'items-end' : 'items-start'
        } animate-fade-in font-sans`}
      >
        {/* Group Sender Handle Tag */}
        {isGroupChat && !isMe && message.senderHandle && (
          <span className="text-[11px] font-bold text-[#00ff73] mb-1 px-1 font-mono">
            {message.senderHandle}
          </span>
        )}

        {/* Hover Quick Action Toolbar */}
        <div
          className={`absolute -top-7 ${
            isMe ? 'right-1' : 'left-1'
          } hidden group-hover/bubble:flex items-center space-x-1 bg-[#15161c]/95 border border-white/10 p-1 rounded-xl shadow-xl z-20 animate-fade-in backdrop-blur-md`}
        >
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiMenu(!showEmojiMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Quick Emoji Reaction Popup */}
            {showEmojiMenu && (
              <div className="absolute bottom-8 left-0 flex items-center space-x-1.5 bg-[#171821] border border-white/15 p-1.5 rounded-2xl shadow-2xl z-30 animate-fade-in backdrop-blur-xl">
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

          {/* Reply Button */}
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
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#00ff73] hover:bg-white/10 transition-all cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>

          {/* Edit Button (Own messages only) */}
          {isMe && (
            <button
              type="button"
              onClick={() => {
                if (onEdit) onEdit(message);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Button (Own messages only) */}
          {isMe && (
            <button
              type="button"
              onClick={() => {
                if (onDelete) onDelete(message.id);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bubble Container with Elevated Aesthetics */}
        <div
          className={`px-4 py-2.5 rounded-2xl max-w-lg text-sm leading-relaxed transition-all ${
            isMe
              ? 'bg-gradient-to-br from-[#0c2a1c] via-[#091f15] to-[#10141a] text-white border border-[#00ff73]/35 rounded-br-xs shadow-[0_4px_20px_rgba(0,255,115,0.08)]'
              : 'bg-[#181a22]/95 text-slate-100 border border-white/10 rounded-bl-xs shadow-md backdrop-blur-md'
          }`}
        >
          {/* Quoted Message Preview inside bubble */}
          {message.replyTo && (
            <div
              className={`mb-2 px-3 py-1.5 rounded-xl border-l-2 text-xs truncate ${
                isMe
                  ? 'bg-black/30 border-[#00ff73] text-gray-200'
                  : 'bg-black/40 border-[#00ff73] text-gray-300'
              }`}
            >
              <span className="font-bold block text-[11px] text-[#00ff73]">{message.replyTo.senderHandle}</span>
              <span className="italic text-gray-400 truncate block text-[11px]">{message.replyTo.text}</span>
            </div>
          )}

          {/* Voice Audio Message Player */}
          {message.attachment?.type === 'audio' && (
            <div className="flex items-center space-x-3 p-2 rounded-xl mb-1 min-w-[220px] bg-black/30 border border-white/5">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#00ff73] text-black hover:scale-105 shadow-[0_0_12px_rgba(0,255,115,0.4)] transition-all cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                {/* Visual Audio Progress Waveform */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden w-full">
                  <div
                    className="h-full bg-[#00ff73] transition-all duration-100 rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400 font-mono">
                  <span>Voice Note</span>
                  <span>{message.attachment.duration ? `0:0${message.attachment.duration}` : '0:05'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Image preview */}
          {message.attachment && message.attachment.type === 'image' && (
            <div className="mb-2 rounded-xl overflow-hidden">
              <div
                onClick={() => setShowFullImage(true)}
                className="relative group/img cursor-pointer rounded-xl overflow-hidden bg-black/40 border border-white/5"
              >
                <img
                  src={message.attachment.url}
                  alt={message.attachment.name}
                  className="max-h-64 max-w-full rounded-xl object-contain hover:scale-[1.02] transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center space-x-2 text-white transition-opacity">
                  <span className="text-xs font-semibold bg-black/70 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-white/10">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Full Size</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Document / File preview */}
          {message.attachment && message.attachment.type === 'file' && (
            <div
              onClick={handleDownloadFile}
              className="flex items-center justify-between space-x-3 p-2.5 rounded-xl cursor-pointer transition-all mb-1 bg-black/30 hover:bg-black/50 border border-white/5"
              title="Click to download file"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-[#00ff73]/15 text-[#00ff73] border border-[#00ff73]/20">
                  <FileText className="w-5 h-5 shrink-0" />
                </div>
                <div className="text-xs truncate min-w-0">
                  <span className="font-bold block truncate text-white">{message.attachment.name}</span>
                  <span className="text-gray-400 text-[10px]">{message.attachment.size}</span>
                </div>
              </div>
              <Download className="w-4 h-4 shrink-0 text-gray-400 hover:text-white ml-2" />
            </div>
          )}

          {/* Call Event Bubble */}
          {message.callInfo && (
            <div className="flex items-center space-x-3 py-1 min-w-[210px]">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  message.callInfo.type === 'missed' || message.callInfo.type === 'declined'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : message.callInfo.type === 'canceled'
                    ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    : 'bg-[#00ff73]/20 text-[#00ff73] border border-[#00ff73]/30'
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
                <span className="font-bold text-xs block truncate text-white">
                  {message.callInfo.type === 'missed'
                    ? isMe
                      ? 'Canceled Call'
                      : 'Missed Voice Call'
                    : message.callInfo.type === 'declined'
                    ? isMe
                      ? 'Call Declined'
                      : 'Declined Voice Call'
                    : message.callInfo.type === 'canceled'
                    ? 'Canceled Voice Call'
                    : isMe
                    ? 'Outgoing Voice Call'
                    : 'Incoming Voice Call'}
                </span>
                <span className="text-[11px] text-gray-400 block font-mono">
                  {message.callInfo.duration
                    ? `${Math.floor(message.callInfo.duration / 60)}:${(message.callInfo.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : message.callInfo.type === 'missed' || message.callInfo.type === 'declined'
                    ? 'No answer'
                    : 'Voice call'}
                </span>
              </div>
            </div>
          )}

          {message.text && !message.callInfo && <p className="break-words select-text">{message.text}</p>}
        </div>

        {/* Reaction Badges Pill Row below Bubble */}
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
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                    hasReacted
                      ? 'bg-[#00ff73]/20 border border-[#00ff73]/60 text-white font-bold shadow-[0_0_8px_rgba(0,255,115,0.2)]'
                      : 'bg-[#15161c] border border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                  title={`Reacted: ${users.join(', ')}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp, Edited Tag & Delivery State */}
        <div
          className={`flex items-center space-x-1.5 text-[11px] text-gray-400 mt-1 px-1 select-none ${
            isMe ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.isEdited && <span className="italic text-[10px] text-gray-400">(edited)</span>}
          <span>{timeString}</span>
          {isMe && (
            <span className="text-[#00ff73] flex items-center" title="Delivered">
              <CheckCheck className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Full Image Preview Lightbox Modal */}
      {showFullImage && message.attachment && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in select-none"
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-5 right-5 text-gray-300 hover:text-white p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer z-10"
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
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="mt-4 flex items-center space-x-3">
              <span className="text-xs text-gray-300 font-mono">{message.attachment.name}</span>
              <button
                onClick={handleDownloadFile}
                className="px-4 py-2 rounded-xl bg-[#00ff73] hover:bg-[#1aff85] text-black text-xs font-bold flex items-center space-x-1.5 shadow-[0_0_20px_rgba(0,255,115,0.4)] cursor-pointer transition-all hover:scale-105"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
