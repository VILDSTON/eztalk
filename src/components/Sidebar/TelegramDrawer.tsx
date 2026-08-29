import React from 'react';
import {
  X,
  Settings,
  Bookmark,
  Users,
  UserPlus,
  LogOut,
  Sparkles,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface TelegramDrawerProps {
  isOpen: boolean;
  currentUser: User;
  myAccounts?: User[];
  friendsCount?: number;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriend: () => void;
  onSelectSavedMessages: () => void;
  onUpdateStatus: (status: User['status']) => void;
  onSwitchAccount?: (user: User) => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (user: User) => void;
  onLogout?: () => void;
}

export const TelegramDrawer: React.FC<TelegramDrawerProps> = ({
  isOpen,
  currentUser,
  myAccounts = [],
  friendsCount = 0,
  onClose,
  onOpenSettings,
  onOpenCreateGroup,
  onOpenAddFriend,
  onSelectSavedMessages,
  onUpdateStatus,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
  onLogout,
}) => {
  if (!isOpen) return null;

  const otherAccounts = myAccounts.filter(
    (acc) => normalizeHandle(acc.handle) !== normalizeHandle(currentUser.handle)
  );

  return (
    <div className="fixed inset-0 z-50 flex select-none font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 glass-overlay animate-fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full glass-panel border-r border-ez-border/50 shadow-glass-lg flex flex-col z-10 animate-slide-in-right overflow-hidden">
        {/* User Profile Header */}
        <div className="p-5 bg-gradient-to-b from-ez-elevated to-ez-surface border-b border-ez-border/50 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="relative inline-block mb-3">
            <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full overflow-hidden border-2 border-neon-green shadow-neon-md bg-ez-elevated">
              <img src={currentUser.avatar} alt={currentUser.handle} className="w-full h-full object-cover" />
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-ez-surface ${
                currentUser.status === 'Online'
                  ? 'bg-neon-green-glow shadow-neon-dot'
                  : currentUser.status === 'Away'
                  ? 'bg-amber-400'
                  : currentUser.status === 'Busy'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>

          <h3 className="text-base font-bold text-white tracking-tight leading-snug truncate">
            {currentUser.name || currentUser.handle}
          </h3>
          <p className="text-xs text-neon-green font-mono mt-0.5">{currentUser.handle}</p>

          {currentUser.bio && (
            <p className="text-xs text-ez-muted mt-2 line-clamp-2 leading-relaxed">
              {currentUser.bio}
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-0.5 text-sm">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Settings className="w-5 h-5 text-ez-muted group-hover:text-neon-green transition-colors duration-150" />
              <span className="font-semibold">Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-ez-muted group-hover:text-white transition-colors duration-150" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Users className="w-5 h-5 text-ez-muted group-hover:text-neon-green transition-colors duration-150" />
              <span className="font-semibold">New Group</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectSavedMessages();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Bookmark className="w-5 h-5 text-ez-muted group-hover:text-neon-green transition-colors duration-150" />
              <span className="font-semibold">Saved Messages</span>
            </div>
            <span className="text-[10px] text-neon-green font-mono font-bold bg-neon-green/10 px-2 py-0.5 rounded-full">
              Cloud
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddFriend();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <UserPlus className="w-5 h-5 text-ez-muted group-hover:text-neon-green transition-colors duration-150" />
              <span className="font-semibold">Contacts & Friends</span>
            </div>
            <span className="text-xs text-ez-muted font-mono font-bold">{friendsCount}</span>
          </button>

          {/* Switch Accounts */}
          {otherAccounts.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-ez-muted uppercase tracking-wider">
                Switch Accounts
              </div>
              {otherAccounts.map((acc) => (
                <div
                  key={acc.id || acc.handle}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors duration-150 group/acc"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSwitchAccount) onSwitchAccount(acc);
                    }}
                    className="flex items-center space-x-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full overflow-hidden border border-ez-border">
                      <img src={acc.avatar} alt={acc.handle} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{acc.name || acc.handle}</span>
                      <span className="text-[10px] text-ez-muted font-mono truncate">{acc.handle}</span>
                    </div>
                  </button>
                  {onRemoveAccount && (
                    <button
                      type="button"
                      onClick={() => onRemoveAccount(acc)}
                      className="opacity-0 group-hover/acc:opacity-100 p-1 text-ez-muted hover:text-red-400 rounded-lg cursor-pointer transition-opacity duration-150"
                      title="Remove from device"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Account */}
          {onAddAccount && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddAccount();
              }}
              className="w-full flex items-center space-x-3.5 p-3 rounded-2xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
            >
              <Layers className="w-5 h-5 text-neon-green" />
              <span className="font-semibold text-xs">Add Account</span>
            </button>
          )}

          <div className="h-px bg-ez-border/50 my-2" />

          {/* Log Out */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center space-x-3.5 p-3 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-colors duration-150 cursor-pointer font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-ez-base/80 border-t border-ez-border/50 text-center">
          <div className="inline-flex items-center space-x-1.5 text-xs text-ez-muted font-bold">
            <Sparkles className="w-3.5 h-3.5 text-neon-green" />
            <span className="text-neon-green">EzTalk</span>
            <span>Web 2.0</span>
          </div>
          <p className="text-[10px] text-ez-muted font-mono mt-0.5">Real-time Messenger • 24/7 Live</p>
        </div>
      </div>
    </div>
  );
};
