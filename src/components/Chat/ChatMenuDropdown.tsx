import React, { useRef, useEffect } from 'react';
import { User as UserIcon, Bell, BellOff, Trash2, ShieldAlert, Download, UserMinus, UserPlus, Flame } from 'lucide-react';

export interface ChatMenuDropdownProps {
  isOpen: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  activeTtl?: number;
  onClose: () => void;
  onViewProfile: () => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
  onExportChat?: () => void;
  onSetTtl?: (ttl: number | undefined) => void;
  onClearChat: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
}

const TTL_OPTIONS = [
  { label: 'Off', val: undefined },
  { label: '5s', val: 5 },
  { label: '10s', val: 10 },
  { label: '1m', val: 60 },
  { label: '24h', val: 86400 },
];

export const ChatMenuDropdown: React.FC<ChatMenuDropdownProps> = ({
  isOpen,
  isMuted = false,
  isFriend = true,
  isBlocked = false,
  activeTtl,
  onClose,
  onViewProfile,
  onToggleMute,
  onToggleBlock,
  onExportChat,
  onSetTtl,
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
      className="absolute top-14 right-6 w-56 bg-ez-elevated/95 backdrop-blur-md border border-ez-border rounded-2xl shadow-glass-lg p-1.5 z-40 animate-scale-up text-xs select-none space-y-0.5"
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
        <span>View Profile</span>
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
            <span>Unmute Notifications</span>
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 text-red-400" />
            <span>Mute Notifications</span>
          </>
        )}
      </button>

      {/* Auto-Delete / TTL Timer Selector */}
      {onSetTtl && (
        <div className="px-3 py-2 bg-white/[0.02] rounded-xl border border-ez-border/40 my-1">
          <div className="flex items-center justify-between text-gray-300 mb-1.5">
            <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Burn Timer (TTL)</span>
            </div>
            {activeTtl ? (
              <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/15 px-1.5 py-0.5 rounded">
                {activeTtl >= 60 ? `${activeTtl / 60}m` : `${activeTtl}s`}
              </span>
            ) : (
              <span className="text-[10px] text-ez-muted font-mono">Off</span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {TTL_OPTIONS.map((opt) => {
              const isSelected = activeTtl === opt.val;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    onSetTtl(opt.val);
                  }}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-black shadow-[0_0_8px_#f59e0b]'
                      : 'bg-ez-surface hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <span>Export Chat History</span>
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
        <span>Clear Messages</span>
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
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-neon-green hover:bg-neon-green/10 transition-colors duration-150 text-left cursor-pointer font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add to Friends</span>
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
          <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
        </button>
      )}
    </div>
  );
};
