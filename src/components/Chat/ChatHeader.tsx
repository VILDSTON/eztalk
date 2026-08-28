import React, { useState } from 'react';
import { Phone, MoreVertical, Search, BellOff, Users, Trash2 } from 'lucide-react';
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
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#17181c] select-none relative z-20 font-sans">
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="relative">
            <img
              src={group.avatar}
              alt={group.name}
              className="w-10 h-10 rounded-full object-cover border border-white/10 bg-gray-800"
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#17181c]">
              <Users className="w-2 h-2" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-tight">{group.name}</span>
            <span className="text-xs text-gray-400 font-mono">
              {group.memberHandles.length} members
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 text-gray-400">
          {onDeleteGroup && (
            <button
              type="button"
              onClick={onDeleteGroup}
              className="p-2 rounded-full hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#17181c] select-none relative z-20 font-sans">
        {/* Left: Avatar + Title + Status */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-3 cursor-pointer group"
          title="Click to view profile"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-[#00ff73] transition-colors bg-gray-800">
              <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#17181c] ${
                user.status === 'Online'
                  ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]'
                  : user.status === 'Away'
                  ? 'bg-amber-400'
                  : user.status === 'Busy'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-[#00ff73] transition-colors truncate">
                {user.name || user.handle}
              </span>
              {isMuted && (
                <span title="Notifications muted">
                  <BellOff className="w-3.5 h-3.5 text-gray-500" />
                </span>
              )}
            </div>
            <span
              className={`text-xs font-mono leading-tight ${
                user.status === 'Online' ? 'text-[#00ff73] font-medium' : 'text-gray-400'
              }`}
            >
              {user.status === 'Online' ? 'online' : `last seen recently • ${user.status.toLowerCase()}`}
            </span>
          </div>
        </div>

        {/* Right: Phone, Search, Menu */}
        <div className="flex items-center space-x-1">
          {/* Call button */}
          <button
            type="button"
            onClick={() => {
              if (onStartCall) onStartCall();
            }}
            className="p-2 rounded-full text-gray-400 hover:text-[#00ff73] hover:bg-white/10 transition-colors cursor-pointer"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* More options menu button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown Menu */}
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
