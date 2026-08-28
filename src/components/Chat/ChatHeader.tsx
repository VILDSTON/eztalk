import React, { useState } from 'react';
import { Phone, MoreHorizontal, BellOff, Users, Trash2, ShieldCheck } from 'lucide-react';
import { User, Group, Message } from '../../types/chat';
import { ChatMenuDropdown } from './ChatMenuDropdown';
import { UserProfileModal } from './UserProfileModal';

interface ChatHeaderProps {
  user?: User | null;
  group?: Group | null;
  messages?: Message[];
  isMuted?: boolean;
  isFriend?: boolean;
  onToggleMute?: () => void;
  onClearChat?: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
  onDeleteGroup?: () => void;
  onStartCall?: () => void;
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'Online':
      return 'bg-[#00ff73] shadow-[0_0_8px_#00ff73]';
    case 'Away':
      return 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
    case 'Busy':
      return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
    case 'Offline':
    default:
      return 'bg-slate-500 shadow-[0_0_6px_rgba(148,163,184,0.4)]';
  }
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  group,
  messages = [],
  isMuted = false,
  isFriend = true,
  onToggleMute,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
  onDeleteGroup,
  onStartCall,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (group) {
    return (
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#101116]/90 backdrop-blur-md select-none relative z-20 font-sans">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <img src={group.avatar} alt={group.name} className="w-10 h-10 rounded-full object-cover border border-white/10 bg-gray-800" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#101116]">
              <Users className="w-2 h-2" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight">{group.name}</span>
            <span className="text-[11px] text-gray-400 font-mono">
              {group.memberHandles.length} members ({group.memberHandles.slice(0, 3).join(', ')}{group.memberHandles.length > 3 ? '...' : ''})
            </span>
          </div>
        </div>

        {/* Delete Group Action */}
        {onDeleteGroup && (
          <button
            type="button"
            onClick={onDeleteGroup}
            className="text-gray-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer flex items-center space-x-1.5"
            title="Delete group chat for everyone"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Delete Group</span>
          </button>
        )}
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#101116]/90 backdrop-blur-md select-none relative z-20 font-sans">
        {/* Left: Contact Info */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-3.5 cursor-pointer group"
          title="Click to view full profile"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-[#00ff73] transition-all bg-gray-800 shadow-sm">
              <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
            </div>
            {/* Dynamic dot badge on bottom right */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#101116] ${getStatusDotColor(
                user.status
              )}`}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-[#00ff73] transition-colors truncate">
                {user.name || user.handle}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#00ff73]" />
              {user.statusEmoji && <span className="text-xs shrink-0">{user.statusEmoji}</span>}
              {isMuted && (
                <span title="Notifications muted" className="text-gray-400 shrink-0">
                  <BellOff className="w-3.5 h-3.5 text-rose-400" />
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="font-mono text-gray-400 truncate">{user.handle}</span>
              <span className="text-gray-600">•</span>
              <span className={`font-semibold ${user.status === 'Online' ? 'text-[#00ff73]' : 'text-gray-400'}`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Phone & Menu Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              if (onStartCall) onStartCall();
            }}
            className="text-black bg-[#00ff73] hover:bg-[#1aff85] p-2.5 rounded-xl shadow-[0_0_15px_rgba(0,255,115,0.35)] hover:shadow-[0_0_25px_rgba(0,255,115,0.55)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5 font-bold text-xs"
            title="Start voice call"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Top Right Actions Dropdown Menu */}
        {isMenuOpen && (
          <ChatMenuDropdown
            isOpen={isMenuOpen}
            isMuted={isMuted}
            isFriend={isFriend}
            onToggleMute={() => {
              if (onToggleMute) onToggleMute();
              setIsMenuOpen(false);
            }}
            onClearChat={() => {
              if (onClearChat) onClearChat();
              setIsMenuOpen(false);
            }}
            onRemoveFriend={() => {
              if (onRemoveFriend) onRemoveFriend();
              setIsMenuOpen(false);
            }}
            onAddFriend={() => {
              if (onAddFriend) onAddFriend();
              setIsMenuOpen(false);
            }}
            onViewProfile={() => {
              setIsProfileOpen(true);
              setIsMenuOpen(false);
            }}
            onClose={() => setIsMenuOpen(false)}
          />
        )}
      </div>

      {/* Contact Profile Modal */}
      <UserProfileModal
        user={user}
        isOpen={isProfileOpen}
        isMuted={isMuted}
        isFriend={isFriend}
        messages={messages}
        onClose={() => setIsProfileOpen(false)}
        onStartCall={() => {
          setIsProfileOpen(false);
          if (onStartCall) onStartCall();
        }}
        onToggleNotifications={() => {
          if (onToggleMute) onToggleMute();
        }}
        onRemoveFriend={onRemoveFriend}
        onAddFriend={onAddFriend}
      />
    </>
  );
};
