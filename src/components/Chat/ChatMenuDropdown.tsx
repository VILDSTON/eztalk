import React, { useRef, useEffect } from 'react';
import { User as UserIcon, Bell, BellOff, Trash2, ShieldAlert, Download, UserMinus, UserPlus } from 'lucide-react';

interface ChatMenuDropdownProps {
  isOpen: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onToggleMute?: () => void;
  onClearChat: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
}

export const ChatMenuDropdown: React.FC<ChatMenuDropdownProps> = ({
  isOpen,
  isMuted = false,
  isFriend = true,
  onClose,
  onViewProfile,
  onToggleMute,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

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
      className="absolute top-14 right-6 w-52 bg-[#181920] border border-[#2b2d38] rounded-2xl shadow-2xl p-1.5 z-40 animate-fade-in text-xs select-none"
    >
      <button
        type="button"
        onClick={() => {
          onViewProfile();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.07] transition-colors text-left cursor-pointer"
      >
        <UserIcon className="w-4 h-4 text-[#00ff73]" />
        <span>View Profile</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (onToggleMute) onToggleMute();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.07] transition-colors text-left cursor-pointer"
      >
        {isMuted ? (
          <>
            <Bell className="w-4 h-4 text-[#00ff73]" />
            <span>Unmute Notifications</span>
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 text-red-400" />
            <span>Mute Notifications</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.07] transition-colors text-left cursor-pointer"
      >
        <Download className="w-4 h-4 text-gray-400" />
        <span>Export Chat History</span>
      </button>

      <div className="h-px bg-[#262830] my-1" />

      <button
        type="button"
        onClick={() => {
          onClearChat();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>Clear Messages</span>
      </button>

      {/* Show Remove Friend ONLY if isFriend, otherwise show Add to Friends */}
      {isFriend ? (
        onRemoveFriend && (
          <button
            type="button"
            onClick={() => {
              onRemoveFriend();
              onClose();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            <span>Remove Friend</span>
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
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#00ff73] hover:bg-[#00ff73]/10 transition-colors text-left cursor-pointer font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add to Friends</span>
          </button>
        )
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
      >
        <ShieldAlert className="w-4 h-4" />
        <span>Block User</span>
      </button>
    </div>
  );
};
