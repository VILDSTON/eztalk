import React, { useState } from 'react';
import { Phone, MoreHorizontal, BellOff, Users, Trash2 } from 'lucide-react';
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
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#26282f] bg-[#16171b] select-none relative">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <img src={group.avatar} alt={group.name} className="w-10 h-10 rounded-full object-cover border border-gray-700 bg-gray-800" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#16171b]">
              <Users className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white tracking-tight">{group.name}</span>
            <span className="text-xs text-gray-400 font-mono">
              {group.memberHandles.length} members ({group.memberHandles.join(', ')})
            </span>
          </div>
        </div>

        {/* Delete Group Action */}
        {onDeleteGroup && (
          <button
            type="button"
            onClick={onDeleteGroup}
            className="text-gray-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer flex items-center space-x-1.5"
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
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#26282f] bg-[#16171b] select-none relative">
        {/* Left: Contact Info */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-3.5 cursor-pointer group"
          title="Click to view full profile"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-[#00ff73] transition-colors">
              <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
            </div>
            {/* Dynamic dot badge on bottom right */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16171b] ${
                user.status === 'Online'
                  ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]'
                  : user.status === 'Away'
                  ? 'bg-yellow-400 shadow-[0_0_6px_#facc15]'
                  : user.status === 'Busy'
                  ? 'bg-red-400 shadow-[0_0_6px_#f87171]'
                  : 'bg-gray-400 shadow-[0_0_6px_rgba(156,163,175,0.5)]'
              }`}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-[#00ff73] transition-colors truncate">
                {user.name || user.handle}
              </span>
              {user.statusEmoji && <span className="text-xs shrink-0">{user.statusEmoji}</span>}
              {isMuted && (
                <span title="Notifications muted" className="text-gray-400 shrink-0">
                  <BellOff className="w-3.5 h-3.5 text-red-400/80" />
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-400">
              <span className="font-mono text-gray-400 truncate">{user.handle}</span>
              <span>•</span>
              <span className="text-gray-300 font-medium">{user.status}</span>
            </div>
          </div>
        </div>

        {/* Right: Phone & Menu Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (onStartCall) onStartCall();
            }}
            className="text-[#00ff73] hover:text-[#39ff8e] p-2 rounded-xl hover:bg-[#252830] transition-colors cursor-pointer"
            title="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#252830] transition-colors cursor-pointer"
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
