import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pin, BellOff, Eraser, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export interface ChatContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  isMuted: boolean;
  targetName?: string;
  targetAvatar?: string;
  isGroup?: boolean;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onClearHistory: () => void;
  onDeleteChat: () => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  isPinned,
  isMuted,
  targetName,
  targetAvatar,
  isGroup = false,
  onTogglePin,
  onToggleMute,
  onClearHistory,
  onDeleteChat,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef(Date.now());
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (isOpen) {
      mountedAtRef.current = Date.now();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Desktop coordinate boundary protections
  let finalX = x;
  let finalY = y;
  const menuWidth = 230;
  const menuHeight = 220;

  if (typeof window !== 'undefined') {
    if (finalX + menuWidth > window.innerWidth) {
      finalX = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (finalY + menuHeight > window.innerHeight) {
      finalY = Math.max(12, window.innerHeight - menuHeight - 12);
    }
    if (finalX < 12) finalX = 12;
    if (finalY < 12) finalY = 12;
  }

  const content = (
    <>
      {/* Blurred Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] transition-opacity duration-200 ${isMobileView ? 'bg-black/70' : 'bg-black/20'
          }`}
        onClick={(e) => {
          e.stopPropagation();
          if (Date.now() - mountedAtRef.current < 400) return;
          onClose();
        }}
        onTouchEnd={(e) => {
          if (Date.now() - mountedAtRef.current < 400) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {isMobileView ? (
        /* Mobile: Native-style Action Sheet Drawer */
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-x-0 bottom-0 z-[9999] max-w-lg mx-auto bg-[#141518]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[26px] shadow-[0_-10px_40px_rgba(0,0,0,0.7)] p-4 pb-8 animate-in slide-in-from-bottom duration-200 select-none"
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Pull handle indicator */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

          {/* Chat Header info */}
          {targetName && (
            <div className="flex items-center pb-3.5 mb-2 border-b border-white/10">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {targetAvatar ? (
                  <img
                    src={targetAvatar}
                    alt={targetName}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 bg-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
                    {targetName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-[15px] font-bold text-white truncate leading-tight">{targetName}</h4>
                  <p className="text-[11px] text-ez-muted font-medium mt-0.5">
                    {isGroup ? (t.friends?.groups || 'Group Chat') : (t.chat?.directChat || 'Direct Chat')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action options */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onTogglePin();
                onClose();
              }}
              className="w-full text-left px-3.5 py-3 text-[14px] font-medium text-gray-200 active:bg-white/10 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Pin className={`w-4 h-4 ${isPinned ? 'text-[var(--ez-accent)] fill-[var(--ez-accent)]' : 'text-gray-400'}`} />
                <span>{isPinned ? t.contextMenu?.unpin || 'Unpin' : t.contextMenu?.pin || 'Pin to top'}</span>
              </div>
              {isPinned && (
                <span className="text-[11px] font-semibold text-[var(--ez-accent)] bg-[var(--ez-accent)]/15 px-2 py-0.5 rounded-md">
                  {t.contextMenu?.pinned || 'Pinned'}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleMute();
                onClose();
              }}
              className="w-full text-left px-3.5 py-3 text-[14px] font-medium text-gray-200 active:bg-white/10 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                {isMuted ? (
                  <BellOff className="w-4 h-4 text-rose-500" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
                <span>
                  {isMuted ? t.contextMenu?.unmute || 'Unmute notifications' : t.contextMenu?.mute || 'Mute notifications'}
                </span>
              </div>
            </button>

            <div className="h-px bg-white/5 my-1" />

            <button
              type="button"
              onClick={() => {
                onClearHistory();
                onClose();
              }}
              className="w-full text-left px-3.5 py-3 text-[14px] font-medium text-gray-200 active:bg-white/10 rounded-xl flex items-center space-x-3 transition-colors cursor-pointer"
            >
              <Eraser className="w-4 h-4 text-gray-400" />
              <span>{t.contextMenu?.clearHistory || 'Clear history'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDeleteChat();
                onClose();
              }}
              className="w-full text-left px-3.5 py-3 text-[14px] font-medium text-rose-400 active:bg-rose-500/15 rounded-xl flex items-center space-x-3 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{t.contextMenu?.deleteChat || 'Delete chat'}</span>
            </button>
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 py-3 rounded-xl bg-white/[0.06] active:bg-white/[0.12] text-sm font-semibold text-gray-300 transition-colors text-center cursor-pointer"
          >
            {t.common?.cancel || 'Cancel'}
          </button>
        </div>
      ) : (
        /* Desktop: Floating Glassmorphic Context Menu */
        <div
          ref={menuRef}
          style={{ top: finalY, left: finalX }}
          className="fixed z-[9999] w-56 bg-[#141518]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {targetName && (
            <div className="flex items-center space-x-2 px-2.5 py-1.5 mb-1 border-b border-white/5">
              {targetAvatar && (
                <img
                  src={targetAvatar}
                  alt={targetName}
                  className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0"
                />
              )}
              <div className="text-[11px] font-semibold text-white/90 truncate flex-1">{targetName}</div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onTogglePin();
              onClose();
            }}
            className="w-full text-left px-2.5 py-2 text-xs font-medium text-gray-200 hover:bg-white/[0.08] hover:text-white rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <Pin className={`w-3.5 h-3.5 transition-colors ${isPinned ? 'text-[var(--ez-accent)] fill-[var(--ez-accent)]' : 'text-gray-400 group-hover:text-white'}`} />
              <span>{isPinned ? t.contextMenu?.unpin || 'Unpin' : t.contextMenu?.pin || 'Pin to top'}</span>
            </div>
            {isPinned && (
              <span className="text-[10px] font-semibold text-[var(--ez-accent)] bg-[var(--ez-accent)]/15 px-1.5 py-0.5 rounded">
                {t.contextMenu?.pinned || 'Pinned'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleMute();
              onClose();
            }}
            className="w-full text-left px-2.5 py-2 text-xs font-medium text-gray-200 hover:bg-white/[0.08] hover:text-white rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              {isMuted ? (
                <BellOff className="w-3.5 h-3.5 text-rose-500 transition-colors" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
              )}
              <span>
                {isMuted ? t.contextMenu?.unmute || 'Unmute notifications' : t.contextMenu?.mute || 'Mute notifications'}
              </span>
            </div>
          </button>

          <div className="h-px bg-white/5 my-1" />

          <button
            type="button"
            onClick={() => {
              onClearHistory();
              onClose();
            }}
            className="w-full text-left px-2.5 py-2 text-xs font-medium text-gray-200 hover:bg-white/[0.08] hover:text-white rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer group"
          >
            <Eraser className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
            <span>{t.contextMenu?.clearHistory || 'Clear history'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeleteChat();
              onClose();
            }}
            className="w-full text-left px-2.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer group"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-colors" />
            <span>{t.contextMenu?.deleteChat || 'Delete chat'}</span>
          </button>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
};
