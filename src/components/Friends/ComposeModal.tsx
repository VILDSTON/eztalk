import React, { useState } from 'react';
import { X, Search, MessageSquare, UserPlus, Users } from 'lucide-react';
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

  // Exclude current user from the list
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#18191e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#1f2026]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#00ff73]/15 text-[#00ff73]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">New Direct Message</h3>
              <p className="text-xs text-gray-400">Select a contact to start chatting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 pb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or @handle..."
              className="w-full bg-[#23242c] focus:bg-[#282a33] border border-transparent focus:border-[#00ff73]/40 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
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
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="relative w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-full overflow-hidden border border-white/10 group-hover:border-[#00ff73] transition-colors shrink-0">
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#18191e] ${
                      user.status === 'Online'
                        ? 'bg-[#00ff73]'
                        : user.status === 'Away'
                        ? 'bg-amber-400'
                        : user.status === 'Busy'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white group-hover:text-[#00ff73] transition-colors truncate">
                    {user.name || user.handle}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono truncate">{user.handle}</span>
                </div>
              </div>

              <span className="px-3 py-1 bg-[#00ff73]/15 text-[#00ff73] text-xs font-bold rounded-xl shrink-0 group-hover:bg-[#00ff73] group-hover:text-black transition-colors">
                Chat
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 px-4 text-xs text-gray-500">
              <Users className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="font-semibold text-gray-400">No contacts found</p>
              <p className="mt-0.5 text-gray-500">Try searching for another handle or name.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
