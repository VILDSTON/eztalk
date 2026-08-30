import React, { useState } from 'react';
import { X, Search, MessageSquare, Users } from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface ComposeModalProps {
  isOpen: boolean;
  users?: User[];
  existingUsers?: User[];
  currentUserHandle?: string;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  users = [],
  existingUsers = [],
  currentUserHandle,
  onClose,
  onSelectUser,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const rawList = existingUsers.length > 0 ? existingUsers : users;
  const myHandle = normalizeHandle(currentUserHandle || '').toLowerCase();

  const availableUsers = rawList.filter(
    (u) => normalizeHandle(u.handle).toLowerCase() !== myHandle
  );

  const cleanSearch = search.trim().toLowerCase().replace('@', '');
  const filtered = cleanSearch
    ? availableUsers.filter(
        (u) =>
          u.handle.toLowerCase().replace('@', '').includes(cleanSearch) ||
          (u.name && u.name.toLowerCase().includes(cleanSearch)) ||
          (u.bio && u.bio.toLowerCase().includes(cleanSearch))
      )
    : availableUsers;

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 select-none font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 glass-overlay animate-fade-in" />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-ez-border/50 bg-ez-surface shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">New Direct Message</h3>
              <p className="text-xs text-ez-muted">Select a contact to start chatting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-ez-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or @handle..."
              className="w-full bg-ez-hover focus:bg-ez-border border border-transparent focus:border-neon-green/30 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-ez-muted outline-none transition-colors duration-150"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 text-ez-muted hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {filtered.map((user) => (
            <div
              key={user.id || user.handle}
              onClick={() => {
                onSelectUser(user);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-colors duration-150 group"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="relative w-11 h-11 min-w-[44px] min-h-[44px] shrink-0">
                  <img src={user.avatar} alt={user.handle} className="w-full h-full rounded-full object-cover border border-ez-border group-hover:border-neon-green/50 transition-colors duration-150 bg-ez-elevated" />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-ez-elevated ${
                      user.status === 'Online'
                        ? 'bg-neon-green-glow shadow-neon-dot'
                        : user.status === 'Away'
                        ? 'bg-amber-400'
                        : user.status === 'Busy'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors duration-150 truncate">
                    {user.name || user.handle}
                  </span>
                  <span className="text-[11px] text-ez-muted font-mono truncate">{user.handle}</span>
                </div>
              </div>

              <span className="px-3 py-1 bg-neon-green/10 text-neon-green text-xs font-bold rounded-xl shrink-0 group-hover:bg-neon-green group-hover:text-black transition-colors duration-150">
                Chat
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 px-4 text-xs text-ez-muted">
              <Users className="w-8 h-8 mx-auto text-ez-border mb-2" />
              <p className="font-semibold text-gray-400">No contacts found</p>
              <p className="mt-0.5 text-ez-muted">Try searching for another handle or name.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
