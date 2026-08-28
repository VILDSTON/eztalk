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
  PlusCircle,
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
        className="fixed inset-0 bg-black/65 backdrop-blur-sm animate-fade-in transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#17181c] border-r border-white/10 shadow-2xl flex flex-col z-10 animate-slide-right overflow-hidden">
        {/* User Profile Header Banner */}
        <div className="p-5 bg-gradient-to-b from-[#1c1e24] to-[#17181c] border-b border-white/5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Avatar with Status */}
          <div className="relative inline-block mb-3">
            <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full overflow-hidden border-2 border-[#00ff73] shadow-[0_0_15px_rgba(0,255,115,0.3)] bg-gray-800">
              <img src={currentUser.avatar} alt={currentUser.handle} className="w-full h-full object-cover" />
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#17181c] ${
                currentUser.status === 'Online'
                  ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]'
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
          <p className="text-xs text-[#00ff73] font-mono mt-0.5">{currentUser.handle}</p>

          {/* Status Switcher Pills */}
          <div className="flex items-center space-x-1.5 mt-3 pt-2 border-t border-white/5">
            {(['Online', 'Away', 'Busy', 'Offline'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onUpdateStatus(st)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  currentUser.status === st
                    ? 'bg-[#00ff73] text-black shadow-xs'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation List Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 text-sm">
          {/* Settings / My Profile */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-[#00ff73] transition-colors" />
              <span className="font-semibold">Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </button>

          {/* New Group */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Users className="w-5 h-5 text-gray-400 group-hover:text-[#00ff73] transition-colors" />
              <span className="font-semibold">New Group</span>
            </div>
            <PlusCircle className="w-4 h-4 text-gray-500 group-hover:text-[#00ff73] transition-colors" />
          </button>

          {/* Saved Messages */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectSavedMessages();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <Bookmark className="w-5 h-5 text-gray-400 group-hover:text-[#00ff73] transition-colors" />
              <span className="font-semibold">Saved Messages</span>
            </div>
            <span className="text-[10px] text-[#00ff73] font-mono font-bold bg-[#00ff73]/10 px-2 py-0.5 rounded-full">
              Cloud
            </span>
          </button>

          {/* Friends & Contacts */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddFriend();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-gray-200 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <UserPlus className="w-5 h-5 text-gray-400 group-hover:text-[#00ff73] transition-colors" />
              <span className="font-semibold">Contacts & Friends</span>
            </div>
            <span className="text-xs text-gray-500 font-mono font-bold">{friendsCount}</span>
          </button>

          {/* Switch Accounts Section */}
          {otherAccounts.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Switch Accounts
              </div>
              {otherAccounts.map((acc) => (
                <div
                  key={acc.id || acc.handle}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-all group/acc"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSwitchAccount) onSwitchAccount(acc);
                    }}
                    className="flex items-center space-x-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full overflow-hidden border border-white/10">
                      <img src={acc.avatar} alt={acc.handle} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{acc.name || acc.handle}</span>
                      <span className="text-[10px] text-gray-400 font-mono truncate">{acc.handle}</span>
                    </div>
                  </button>
                  {onRemoveAccount && (
                    <button
                      type="button"
                      onClick={() => onRemoveAccount(acc)}
                      className="opacity-0 group-hover/acc:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded-lg cursor-pointer transition-opacity"
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
              className="w-full flex items-center space-x-3.5 p-3 rounded-2xl text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
            >
              <Layers className="w-5 h-5 text-[#00ff73]" />
              <span className="font-semibold text-xs">+ Add Account</span>
            </button>
          )}

          <div className="h-px bg-white/5 my-2" />

          {/* Log Out */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center space-x-3.5 p-3 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Footer Brand Info */}
        <div className="p-4 bg-[#141519] border-t border-white/5 text-center">
          <div className="inline-flex items-center space-x-1.5 text-xs text-gray-400 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#00ff73]" />
            <span className="text-[#00ff73]">EzTalk</span>
            <span>Web 2.0</span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">Telegram Inspired • 24/7 Live</p>
        </div>
      </div>
    </div>
  );
};
