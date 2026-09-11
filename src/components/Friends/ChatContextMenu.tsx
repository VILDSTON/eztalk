import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pin, BellOff, Eraser, Trash2, Volume2 } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export interface ChatContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  isMuted: boolean;
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
  onTogglePin,
  onToggleMute,
  onClearHistory,
  onDeleteChat,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Protect against going off screen
  let finalX = x;
  let finalY = y;
  const menuWidth = 220; // approximate width
  const menuHeight = 200; // approximate height

  if (finalX + menuWidth > window.innerWidth) {
    finalX = window.innerWidth - menuWidth - 10;
  }
  if (finalY + menuHeight > window.innerHeight) {
    finalY = window.innerHeight - menuHeight - 10;
  }
  
  // ensure it doesn't go off top/left
  if (finalX < 10) finalX = 10;
  if (finalY < 10) finalY = 10;

  const content = (
    <>
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        style={{ top: finalY, left: finalX }}
        className="fixed z-[9999] w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={() => {
            onTogglePin();
            onClose();
          }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-gray-200 hover:bg-neutral-800/60 hover:text-white flex items-center transition-colors cursor-pointer"
        >
          <Pin className={`w-4 h-4 mr-3 ${isPinned ? 'text-neon-green' : 'text-gray-400'}`} />
          {isPinned ? t.contextMenu?.unpin || 'Unpin' : t.contextMenu?.pin || 'Pin to top'}
        </button>

        <button
          onClick={() => {
            onToggleMute();
            onClose();
          }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-gray-200 hover:bg-neutral-800/60 hover:text-white flex items-center transition-colors cursor-pointer"
        >
          {isMuted ? (
            <Volume2 className="w-4 h-4 mr-3 text-neon-green" />
          ) : (
            <BellOff className="w-4 h-4 mr-3 text-gray-400" />
          )}
          {isMuted ? t.contextMenu?.unmute || 'Unmute notifications' : t.contextMenu?.mute || 'Mute notifications'}
        </button>

        <div className="h-px bg-neutral-800 my-1.5" />

        <button
          onClick={() => {
            if (window.confirm(t.contextMenu?.clearHistoryConfirm || 'Are you sure you want to clear history?')) {
              onClearHistory();
            }
            onClose();
          }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-gray-200 hover:bg-neutral-800/60 hover:text-white flex items-center transition-colors cursor-pointer"
        >
          <Eraser className="w-4 h-4 mr-3 text-gray-400" />
          {t.contextMenu?.clearHistory || 'Clear history'}
        </button>

        <button
          onClick={() => {
            if (window.confirm(t.contextMenu?.deleteChatConfirm || 'Are you sure you want to delete this chat?')) {
              onDeleteChat();
            }
            onClose();
          }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 flex items-center transition-colors cursor-pointer group"
        >
          <Trash2 className="w-4 h-4 mr-3 group-hover:text-red-400" />
          {t.contextMenu?.deleteChat || 'Delete chat'}
        </button>
      </div>
    </>
  );

  return createPortal(content, document.body);
};
