import React, { useRef, useEffect } from 'react';
import { User as UserIcon, Bell, BellOff, Trash2, ShieldAlert, Download, UserMinus, UserPlus } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export interface ChatMenuDropdownProps {
  isOpen: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
  onExportChat?: () => void;
  onClearChat: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
}

export const ChatMenuDropdown: React.FC<ChatMenuDropdownProps> = ({
  isOpen,
  isMuted = false,
  isFriend = true,
  isBlocked = false,
  onClose,
  onViewProfile,
  onToggleMute,
  onToggleBlock,
  onExportChat,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-14 right-6 w-52 bg-ez-elevated/95 backdrop-blur-md border border-ez-border rounded-2xl shadow-glass-lg p-1.5 z-40 animate-scale-up text-xs select-none space-y-0.5"
    >
      <button
        type="button"
        onClick={() => {
          onViewProfile();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.05] transition-colors duration-150 text-left cursor-pointer"
      >
        <UserIcon className="w-4 h-4 text-neon-green" />
        <span>{t.chat.viewProfile}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (onToggleMute) onToggleMute();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.05] transition-colors duration-150 text-left cursor-pointer"
      >
        {isMuted ? (
          <>
            <Bell className="w-4 h-4 text-neon-green" />
            <span>{t.chat.unmuteNotifications}</span>
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 text-red-400" />
            <span>{t.chat.muteNotifications}</span>
          </>
        )}
      </button>

      {onExportChat && (
        <button
          type="button"
          onClick={() => {
            onExportChat();
            onClose();
          }}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.05] transition-colors duration-150 text-left cursor-pointer"
        >
          <Download className="w-4 h-4 text-neon-green" />
          <span>{t.chat.exportChatHistory}</span>
        </button>
      )}

      <div className="h-px bg-ez-border/50 my-1" />

      <button
        type="button"
        onClick={() => {
          onClearChat();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors duration-150 text-left cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>{t.chat.clearMessages}</span>
      </button>

      {isFriend ? (
        onRemoveFriend && (
          <button
            type="button"
            onClick={() => {
              onRemoveFriend();
              onClose();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors duration-150 text-left cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            <span>{t.chat.removeFriend}</span>
          </button>
        )
      ) : (
        onAddFriend && (
          <button
            type="button"
            onClick={() => {
              onAddFriend();
              onClose();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-neon-green hover:bg-neon-green/10 transition-colors duration-150 text-left cursor-pointer font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.chat.addToFriends}</span>
          </button>
        )
      )}

      {onToggleBlock && (
        <button
          type="button"
          onClick={() => {
            onToggleBlock();
            onClose();
          }}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-colors duration-150 text-left cursor-pointer ${
            isBlocked ? 'text-neon-green hover:bg-neon-green/10' : 'text-red-400 hover:bg-red-500/10'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isBlocked ? t.chat.unblockUser : t.chat.blockUser}</span>
        </button>
      )}
    </div>
  );
};
