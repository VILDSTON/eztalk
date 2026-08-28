import React, { useState } from 'react';
import { X, Search, MessageSquarePlus } from 'lucide-react';
import { User } from '../../types/chat';

interface ComposeModalProps {
  isOpen: boolean;
  users: User[];
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  users,
  onClose,
  onSelectUser,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const cleanSearch = search.trim().toLowerCase();
  const matched = users.filter(
    (u) =>
      u.handle.toLowerCase().includes(cleanSearch) ||
      (u.name && u.name.toLowerCase().includes(cleanSearch))
  );
  const filtered = cleanSearch ? matched.slice(0, 3) : matched;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#15161b] border border-[#2b2d36] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#282a32]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#00ff73]/10 text-[#00ff73]">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">New Conversation</h3>
              <p className="text-xs text-gray-400">Select a friend to start chatting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#25272f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="my-4 relative flex items-center">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends by name or @handle..."
            className="w-full bg-[#111215] border border-[#272932] focus:border-[#00ff73] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        {/* Contact list */}
        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                onSelectUser(user);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#22242c] cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-700">
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00ff73] border-2 border-[#15161b]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{user.name || user.handle}</span>
                  <span className="text-xs text-gray-400">{user.handle}</span>
                </div>
              </div>
              <span className="text-xs font-mono text-[#00ff73] bg-[#00ff73]/10 px-2.5 py-1 rounded-lg">
                Chat
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-500">
              No contacts found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
