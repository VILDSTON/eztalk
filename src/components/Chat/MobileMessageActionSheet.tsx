import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CornerUpLeft,
  CornerUpRight,
  Copy,
  Check,
  Edit2,
  Trash2,
  Lock,
  Mic,
  Image as ImageIcon,
  FileText,
  Phone,
} from 'lucide-react';
import { Message } from '../../types/chat';

export interface MobileMessageActionSheetProps {
  isOpen: boolean;
  message: Message | null;
  isMe: boolean;
  copied: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward?: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleReaction?: (emoji: string) => void;
}

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '🔥', '😮', '👏', '🚀'];

export const MobileMessageActionSheet: React.FC<MobileMessageActionSheetProps> = ({
  isOpen,
  message,
  isMe,
  copied,
  onClose,
  onReply,
  onForward,
  onCopy,
  onEdit,
  onDelete,
  onToggleReaction,
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      onClose();
    }, 200);
  }, [onClose]);

  // Lock body scroll and handle Escape + Hardware Back button
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsClosing(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Android hardware back button handling via history popstate
    const stateObj = { eztalkBottomSheet: true };
    window.history.pushState(stateObj, '');

    const handlePopState = () => {
      handleClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, handleClose]);

  // Drag-to-dismiss touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    if (deltaY > 0) {
      // Downward drag with slight friction dampening
      setDragY(deltaY);
    } else {
      // Upward drag resistance
      setDragY(deltaY * 0.15);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const elapsedTime = Date.now() - touchStartTimeRef.current;
    const isFlick = elapsedTime < 250 && dragY > 40;

    if (dragY > 80 || isFlick) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen || !message || typeof document === 'undefined') return null;

  const hasCopyableContent = Boolean(message.text || message.attachment?.url || message.attachment?.name);
  const canEdit = isMe && Boolean(message.text);
  const canForward = !message.forwardRestricted && !message.isSecret;

  const handleEmojiClick = (emoji: string) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    if (onToggleReaction) {
      onToggleReaction(emoji);
    }
    handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative z-50 w-full max-w-lg mx-auto bg-ez-elevated border-t border-white/10 rounded-t-3xl shadow-2xl pb-safe pb-6 select-none overflow-hidden ${
          isDragging ? '' : 'transition-transform duration-200 ease-out'
        } ${!isDragging && !isClosing && dragY === 0 ? 'animate-slide-up-sheet' : ''}`}
        style={{
          transform: isClosing
            ? 'translateY(100%)'
            : dragY > 0
            ? `translateY(${dragY}px)`
            : 'translateY(0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber Handle */}
        <div className="pt-2.5 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Message Snippet Card Preview */}
        <div className="mx-4 mb-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-2.5 text-xs text-gray-300">
          <div className="w-6 h-6 rounded-full bg-neon-green/15 flex items-center justify-center text-neon-green shrink-0">
            {message.attachment?.type === 'audio' ? (
              <Mic className="w-3.5 h-3.5" />
            ) : message.attachment?.type === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5" />
            ) : message.attachment?.type === 'file' ? (
              <FileText className="w-3.5 h-3.5" />
            ) : message.callInfo ? (
              <Phone className="w-3.5 h-3.5" />
            ) : (
              <span className="text-[11px] font-bold">{(message.senderHandle || 'U')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold block truncate text-neon-green text-[11px]">
              {message.senderHandle || (isMe ? 'You' : 'Friend')}
            </span>
            <span className="text-gray-300 truncate block text-xs">
              {message.text ||
                (message.attachment?.type === 'audio'
                  ? 'Voice message'
                  : message.attachment?.name || 'Media attachment')}
            </span>
          </div>
          {(message.forwardRestricted || message.isSecret) && (
            <Lock className="w-3.5 h-3.5 text-neon-green/70 shrink-0" />
          )}
        </div>

        {/* Top Reactions Row */}
        <div className="mx-4 mb-3 p-1.5 bg-white/[0.04] rounded-2xl border border-white/5 flex items-center justify-around space-x-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="p-2 text-2xl hover:scale-125 active:scale-130 transition-transform duration-150 cursor-pointer rounded-xl active:bg-white/10"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Action Items List (Minimum 48px Touch Targets) */}
        <div className="px-2 space-y-0.5">
          {/* Reply */}
          <button
            type="button"
            onClick={() => {
              onReply();
              handleClose();
            }}
            className="w-full min-h-[48px] flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green shrink-0">
              <CornerUpLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Reply</span>
          </button>

          {/* Forward */}
          {canForward && onForward && (
            <button
              type="button"
              onClick={() => {
                onForward();
                handleClose();
              }}
              className="w-full min-h-[48px] flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green shrink-0">
                <CornerUpRight className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Forward</span>
            </button>
          )}

          {/* Copy Text */}
          {hasCopyableContent && (
            <button
              type="button"
              onClick={() => {
                onCopy();
                setTimeout(() => {
                  handleClose();
                }, 400);
              }}
              className="w-full min-h-[48px] flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-300 shrink-0">
                {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium">{copied ? 'Copied to clipboard!' : 'Copy Text'}</span>
            </button>
          )}

          {/* Edit Message */}
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit();
                handleClose();
              }}
              className="w-full min-h-[48px] flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                <Edit2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Edit Message</span>
            </button>
          )}

          {/* Delete Message */}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                handleClose();
              }}
              className="w-full min-h-[48px] flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Delete Message</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
