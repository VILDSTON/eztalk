import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  Bookmark,
  Settings,
  UserPlus,
  LogOut,
  ChevronUp,
  UserCog,
  X,
} from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface LeftSidebarProps {
  currentUser?: User | null;
  existingUsers?: User[];
  myAccounts?: User[];
  activeSection?: 'chats' | 'contacts' | 'groups' | 'saved';
  onSelectSection?: (section: 'chats' | 'contacts' | 'groups' | 'saved') => void;
  onOpenAddFriend?: () => void;
  onOpenSettings?: () => void;
  onOpenEditProfile?: () => void;
  onSelectSavedMessages?: () => void;
  onSwitchUser?: (user: User) => void;
  onRemoveAccount?: (user: User) => void;
  onAddAccount?: () => void;
  onLogout?: () => void;
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'Online':
      return 'bg-neon-green shadow-neon-dot';
    case 'Away':
      return 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
    case 'Busy':
      return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
    case 'Offline':
    default:
      return 'bg-slate-500';
  }
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer group ${
      isActive
        ? 'bg-ez-accent/15 text-neon-green'
        : 'text-ez-muted hover:text-white hover:bg-white/5'
    }`}
  >
    {/* Active indicator bar */}
    {isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px] w-[3px] h-5 rounded-r-full bg-neon-green shadow-neon-dot" />
    )}
    {icon}
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-green text-black text-[9px] font-black flex items-center justify-center shadow-neon-sm">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {/* Tooltip */}
    <div className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-ez-elevated text-white text-[11px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-glass z-50 border border-ez-border">
      {label}
    </div>
  </button>
);

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentUser,
  myAccounts = [],
  activeSection = 'chats',
  onSelectSection,
  onOpenAddFriend,
  onOpenSettings,
  onOpenEditProfile,
  onSelectSavedMessages,
  onSwitchUser,
  onRemoveAccount,
  onAddAccount,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const otherAccounts = myAccounts.filter(
    (acc) => normalizeHandle(acc.handle) !== normalizeHandle(currentUser?.handle || '')
  );

  return (
    <aside className="w-16 h-full bg-ez-base border-r border-ez-border/50 flex flex-col items-center justify-between py-3 select-none shrink-0 font-sans">
      {/* ─── Top: Brand Icon ─── */}
      <div className="flex flex-col items-center space-y-1 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green/20 to-neon-green/5 border border-neon-green/30 flex items-center justify-center text-neon-green font-black text-sm shadow-neon-sm cursor-default select-none">
          Ez
        </div>
      </div>

      {/* ─── Middle: Navigation Icons ─── */}
      <div className="flex-1 flex flex-col items-center space-y-1">
        <NavItem
          icon={<UserPlus className="w-5 h-5" />}
          label="Add Friend"
          onClick={onOpenAddFriend}
        />
        <NavItem
          icon={<Bookmark className="w-5 h-5" />}
          label="Saved Messages"
          isActive={activeSection === 'saved'}
          onClick={() => {
            onSelectSection?.('saved');
            onSelectSavedMessages?.();
          }}
        />

        <div className="w-6 h-px bg-ez-border/50 my-1" />

        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>

      {/* ─── Bottom: User Avatar ─── */}
      {currentUser && (
        <div className="relative flex flex-col items-center">
          {/* User menu popup */}
          {showUserMenu && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-52 bg-ez-elevated border border-ez-border rounded-2xl p-2 shadow-glass-lg z-50 animate-scale-up text-xs space-y-1">
              {/* Customize profile -> Open Settings directly */}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenSettings ? onOpenSettings() : onOpenEditProfile?.();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-neon-green bg-neon-green/10 hover:bg-neon-green/20 text-left transition-colors font-semibold cursor-pointer border border-neon-green/20"
              >
                <UserCog className="w-4 h-4" />
                <span>Customize Profile</span>
              </button>

              {/* Switch Accounts */}
              {otherAccounts.length > 0 && (
                <>
                  <div className="h-px bg-ez-border/50 my-1" />
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-ez-muted tracking-wider">Accounts</div>
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
                          <span className="text-[10px] text-ez-muted font-mono truncate">{acc.handle}</span>
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
                          title="Remove account"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              <div className="h-px bg-ez-border/50 my-1" />

              {/* Add account */}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  if (onAddAccount) onAddAccount();
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-neon-green" />
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

          {/* Avatar button */}
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="relative w-9 h-9 cursor-pointer group"
            title={currentUser.name || currentUser.handle}
          >
            <img src={currentUser.avatar} alt={currentUser.handle} className="w-full h-full rounded-full object-cover border-2 border-ez-border group-hover:border-neon-green/60 transition-colors" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-ez-base ${getStatusDotColor(
                currentUser.status
              )}`}
            />
          </button>
        </div>
      )}
    </aside>
  );
};
