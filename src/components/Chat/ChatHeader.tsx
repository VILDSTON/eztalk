import React, { useState } from 'react';
import { Phone, MoreVertical, Search, BellOff, Users, Trash2, ArrowLeft, Bookmark, X } from 'lucide-react';
import { User, Group, Message } from '../../types/chat';
import { ChatMenuDropdown } from './ChatMenuDropdown';
import { UserProfileModal } from './UserProfileModal';

interface ChatHeaderProps {
  user?: User | null;
  group?: Group | null;
  messages?: Message[];
  isMuted?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  isOnline?: boolean;
  isSavedMessages?: boolean;
  onBack?: () => void;
  onSearchChange?: (query: string) => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
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
  isBlocked = false,
  isOnline = false,
  isSavedMessages = false,
  onBack,
  onSearchChange,
  onToggleMute,
  onToggleBlock,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
  onDeleteGroup,
  onStartCall,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    if (onSearchChange) onSearchChange('');
  };

  // ─── Group Header ───
  if (group) {
    return (
      <div className="h-14 px-4 flex items-center justify-between border-b border-ez-border/50 bg-ez-elevated/80 backdrop-blur-md select-none relative z-20 font-sans">
        <div className="flex items-center space-x-3 cursor-pointer min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors duration-150 md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative shrink-0">
            <img
              src={group.avatar}
              alt={group.name}
              className="w-9 h-9 rounded-full object-cover border border-ez-border bg-ez-elevated"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-neon-green text-black flex items-center justify-center text-[7px] font-bold border-2 border-ez-elevated z-10">
              <Users className="w-2 h-2" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white tracking-tight leading-tight truncate">{group.name}</span>
            <span className="text-[11px] text-ez-muted font-mono">
              {group.memberHandles.length} members
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-ez-muted">
          {onDeleteGroup && (
            <button
              type="button"
              onClick={onDeleteGroup}
              className="p-2 rounded-full hover:text-red-400 hover:bg-white/10 transition-colors duration-150 cursor-pointer"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Saved Messages Header ───
  if (isSavedMessages) {
    return (
      <div className="h-14 px-4 flex items-center justify-between border-b border-ez-border/50 bg-ez-elevated/80 backdrop-blur-md select-none relative z-20 font-sans">
        <div className="flex items-center space-x-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors duration-150 md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-neon-green/15 border border-neon-green/25 flex items-center justify-center text-neon-green shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Saved Messages</span>
            <span className="text-[11px] text-neon-green font-mono">Your personal cloud notes</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ─── User Chat Header ───
  return (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-ez-border/50 bg-ez-elevated/80 backdrop-blur-md select-none relative z-20 font-sans">
        {showSearch ? (
          <div className="flex-1 flex items-center space-x-2 mr-2 animate-fade-in">
            <Search className="w-4 h-4 text-ez-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search in conversation..."
              className="w-full bg-ez-hover border border-transparent focus:border-neon-green/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-ez-muted outline-none transition-colors duration-150"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCloseSearch}
              className="p-1.5 rounded-full text-ez-muted hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-3 cursor-pointer group min-w-0"
            title="Click to view profile"
          >
            {onBack && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
                className="p-1.5 -ml-1 text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors duration-150 md:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-ez-border group-hover:border-neon-green/50 transition-colors duration-150 bg-ez-elevated">
                <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-ez-elevated z-10 ${
                  isBlocked
                    ? 'bg-rose-500'
                    : isOnline
                    ? 'bg-neon-green-glow shadow-neon-dot'
                    : 'bg-ez-muted'
                }`}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-white tracking-tight group-hover:text-neon-green transition-colors duration-150 truncate">
                  {user.name || user.handle}
                </span>
                {isMuted && (
                  <span title="Notifications muted">
                    <BellOff className="w-3.5 h-3.5 text-ez-muted" />
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-mono leading-tight ${
                  isBlocked
                    ? 'text-rose-400 font-semibold'
                    : isOnline
                    ? 'text-neon-green font-medium'
                    : 'text-ez-muted'
                }`}
              >
                {isBlocked ? 'blocked' : isOnline ? 'online' : 'offline'}
              </span>
            </div>
          </div>
        )}

        {/* Right Actions */}
        {!showSearch && (
          <div className="flex items-center space-x-0.5">
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
              title="Search in Chat"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onStartCall) onStartCall();
              }}
              className="p-2 rounded-full text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors duration-150 cursor-pointer"
              title="Voice Call"
            >
              <Phone className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            >
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <ChatMenuDropdown
            isOpen={isMenuOpen}
            isMuted={isMuted}
            isFriend={isFriend}
            isBlocked={isBlocked}
            onToggleMute={() => {
              if (onToggleMute) onToggleMute();
              setIsMenuOpen(false);
            }}
            onToggleBlock={() => {
              if (onToggleBlock) onToggleBlock();
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
        isBlocked={isBlocked}
        messages={messages}
        onClose={() => setIsProfileOpen(false)}
        onStartCall={() => {
          setIsProfileOpen(false);
          if (onStartCall) onStartCall();
        }}
        onToggleNotifications={() => {
          if (onToggleMute) onToggleMute();
        }}
        onToggleBlock={() => {
          if (onToggleBlock) onToggleBlock();
        }}
        onRemoveFriend={onRemoveFriend}
        onAddFriend={onAddFriend}
      />
    </>
  );
};
