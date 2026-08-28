import React, { useState } from 'react';
import { LogOut, ChevronUp, UserCog, UserPlus, Sparkles, X, Shield } from 'lucide-react';
import { User } from '../../types/chat';
import { AddFriendModal } from './AddFriendModal';
import { EditProfileModal } from '../Profile/EditProfileModal';
import { normalizeHandle } from '../../utils/chatStorage';

interface LeftSidebarProps {
  currentUser?: User | null;
  existingUsers?: User[];
  myAccounts?: User[];
  onSelectUserByHandle?: (handle: string) => void;
  onAddNewFriend?: (user: User) => void;
  onUpdateCurrentUser?: (user: User) => void;
  onSwitchUser?: (user: User) => void;
  onRemoveAccount?: (user: User) => void;
  onAddAccount?: () => void;
  onLogout?: () => void;
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

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentUser,
  existingUsers = [],
  myAccounts = [],
  onSelectUserByHandle,
  onAddNewFriend,
  onUpdateCurrentUser,
  onSwitchUser,
  onRemoveAccount,
  onAddAccount,
  onLogout,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleAddFriend = (newFriend: User) => {
    if (onAddNewFriend) {
      onAddNewFriend(newFriend);
    }
  };

  const handleStatusChange = (status: User['status']) => {
    if (!currentUser || !onUpdateCurrentUser) return;
    onUpdateCurrentUser({
      ...currentUser,
      status,
    });
    setShowUserMenu(false);
  };

  const otherAccounts = myAccounts.filter(
    (acc) => normalizeHandle(acc.handle) !== normalizeHandle(currentUser?.handle || '')
  );

  return (
    <aside className="w-68 h-full bg-[#090a0d] border-r border-white/5 flex flex-col justify-between p-3.5 select-none shrink-0 font-sans backdrop-blur-2xl">
      {/* Top Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Logo & Tagline */}
        <div className="p-3 mb-2 flex flex-col items-start border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ff73]/20 to-[#00ff73]/5 border border-[#00ff73]/40 flex items-center justify-center text-[#00ff73] font-black text-base shadow-[0_0_20px_rgba(0,255,115,0.25)]">
              Ez
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-[#00ff73] neon-text-glow">
                EzTalk
              </span>
              <span className="text-[10px] text-gray-400 font-mono -mt-0.5 tracking-wider uppercase">Messenger</span>
            </div>
          </div>

          {/* Badge */}
          <div className="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#00ff73]/10 border border-[#00ff73]/25 text-[10px] font-semibold text-[#00ff73] shadow-xs">
            <Sparkles className="w-3 h-3 text-[#00ff73] animate-pulse shrink-0" />
            <span className="tracking-tight font-mono">Ultra-Fast 24/7 Live</span>
          </div>
        </div>

        {/* Contacts Header */}
        <div className="flex items-center justify-between px-2.5 py-2 text-[11px] text-gray-400 font-bold tracking-wider uppercase">
          <span>Friends ({existingUsers.length})</span>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="text-gray-400 hover:text-[#00ff73] p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            title="Add new friend"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Friends list (ONLY added friends) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-1 pr-1">
          <div className="space-y-1">
            {existingUsers.length === 0 ? (
              <div className="text-center py-8 px-3 text-gray-500 text-xs bg-white/2 rounded-2xl border border-white/5 mt-1">
                <p className="font-medium text-gray-400">No friends added yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-[#00ff73] hover:underline font-semibold text-[11px] block mx-auto cursor-pointer"
                >
                  + Add Friend
                </button>
              </div>
            ) : (
              existingUsers.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => onSelectUserByHandle && onSelectUserByHandle(contact.handle)}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white cursor-pointer transition-all duration-150 border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    {/* User Avatar with Status Ring */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 group-hover:border-[#00ff73]/60 transition-colors bg-black/40">
                        <img
                          src={contact.avatar}
                          alt={contact.handle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#090a0d] ${getStatusDotColor(
                          contact.status
                        )}`}
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
                          {contact.name || contact.handle}
                        </span>
                        {contact.statusEmoji && (
                          <span className="text-[10px] shrink-0">{contact.statusEmoji}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono truncate">
                        {contact.handle}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: New Chat Action + User Profile Bar */}
      <div className="pt-4 px-1 space-y-3 relative border-t border-white/5">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl text-black font-bold text-xs tracking-wide bg-[#00ff73] hover:bg-[#1aff85] flex items-center justify-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(0,255,115,0.35)] hover:shadow-[0_0_30px_rgba(0,255,115,0.55)] transition-all hover:scale-[1.02] active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Logged in User Bar */}
        {currentUser && (
          <div className="relative">
            {/* User status & options popup menu */}
            {showUserMenu && (
              <div className="absolute bottom-14 left-0 right-0 bg-[#14151b] border border-white/10 rounded-2xl p-2.5 shadow-2xl z-40 animate-fade-in text-xs space-y-1 backdrop-blur-2xl">
                {/* Customize profile button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsEditProfileOpen(true);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-[#00ff73] bg-[#00ff73]/10 hover:bg-[#00ff73]/20 text-left transition-colors font-semibold cursor-pointer border border-[#00ff73]/25"
                >
                  <UserCog className="w-4 h-4" />
                  <span>Customize Profile</span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                {/* Set Status - Online, Away, Busy, Offline */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Set Status</div>
                {(['Online', 'Away', 'Busy', 'Offline'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      currentUser.status === st ? 'bg-white/10 text-white font-semibold' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        st === 'Online'
                          ? 'bg-[#00ff73]'
                          : st === 'Away'
                          ? 'bg-amber-400'
                          : st === 'Busy'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{st}</span>
                  </button>
                ))}

                {/* Switch My Accounts */}
                {otherAccounts.length > 0 && (
                  <>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">My Accounts</div>
                    {otherAccounts.map((acc) => (
                      <div
                        key={acc.id || acc.handle}
                        className="group/acc flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            if (onSwitchUser) onSwitchUser(acc);
                          }}
                          className="flex items-center space-x-2 text-left cursor-pointer flex-1 min-w-0"
                        >
                          <img src={acc.avatar} alt={acc.handle} className="w-5 h-5 rounded-full object-cover shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-gray-200 font-medium truncate">{acc.name || acc.handle}</span>
                            <span className="text-[10px] text-gray-400 font-mono truncate">{acc.handle}</span>
                          </div>
                        </button>
                        {onRemoveAccount && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAccount(acc);
                            }}
                            className="opacity-0 group-hover/acc:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded transition-opacity cursor-pointer"
                            title="Remove account from device"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}

                <div className="h-px bg-white/5 my-1" />

                {/* Add new account button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onAddAccount) onAddAccount();
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#00ff73]" />
                  <span>+ Add account</span>
                </button>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Profile pill */}
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-between bg-[#121318]/90 border border-white/10 hover:border-[#00ff73]/40 p-2 rounded-xl cursor-pointer transition-all group backdrop-blur-md hover:bg-[#181920]"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 group-hover:border-[#00ff73] transition-colors bg-gray-800">
                    <img src={currentUser.avatar} alt={currentUser.handle} className="w-full h-full object-cover" />
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121318] ${getStatusDotColor(
                      currentUser.status
                    )}`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-white group-hover:text-[#00ff73] transition-colors truncate">
                      {currentUser.name || currentUser.handle}
                    </span>
                    {currentUser.statusEmoji && (
                      <span className="text-[10px] shrink-0">{currentUser.statusEmoji}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono truncate">{currentUser.handle}</span>
                </div>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={isAddModalOpen}
        currentUser={currentUser}
        existingUsers={existingUsers}
        onClose={() => setIsAddModalOpen(false)}
        onAddFriend={handleAddFriend}
      />

      {/* Customize Profile Modal */}
      {currentUser && (
        <EditProfileModal
          currentUser={currentUser}
          existingUsers={existingUsers}
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={(updated) => {
            if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
          }}
        />
      )}
    </aside>
  );
};
