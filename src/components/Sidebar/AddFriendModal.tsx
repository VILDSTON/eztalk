import React, { useState, useMemo } from 'react';
import { X, Sparkles, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { User } from '../../types/chat';
import { ApiService, CURATED_AVATARS } from '../../services/api';
import { normalizeHandle } from '../../utils/chatStorage';

interface AddFriendModalProps {
  isOpen: boolean;
  currentUser?: User | null;
  existingUsers?: User[];
  onClose: () => void;
  onAddFriend: (newFriend: User) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  currentUser,
  existingUsers = [],
  onClose,
  onAddFriend,
}) => {
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Live auto-suggestions capped strictly to maximum 3 results
  const suggestedUsers = useMemo(() => {
    const clean = handle.trim().toLowerCase().replace('@', '');
    if (!clean) return [];
    const myHandle = normalizeHandle(currentUser?.handle || '').toLowerCase();
    return existingUsers
      .filter(
        (u) =>
          normalizeHandle(u.handle).toLowerCase() !== myHandle &&
          (u.handle.toLowerCase().includes(clean) || (u.name && u.name.toLowerCase().includes(clean)))
      )
      .slice(0, 3); // Maximum 3 results
  }, [handle, existingUsers, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    const formattedHandle = normalizeHandle(handle);

    if (currentUser && normalizeHandle(currentUser.handle) === formattedHandle) {
      setErrorMessage('You cannot start a chat with yourself.');
      return;
    }

    const existing = existingUsers.find((u) => normalizeHandle(u.handle) === formattedHandle);
    if (existing) {
      onAddFriend(existing);
      onClose();
      return;
    }

    setLoading(true);

    try {
      const remoteUser = await ApiService.getUserByHandle(formattedHandle);
      if (remoteUser) {
        onAddFriend(remoteUser);
        setHandle('');
        setName('');
        setErrorMessage('');
        onClose();
        return;
      }

      const randomAvatar = CURATED_AVATARS[Math.floor(Math.random() * CURATED_AVATARS.length)];
      const createdUser = await ApiService.register({
        name: name.trim() || formattedHandle.replace('@', ''),
        handle: formattedHandle,
        avatar: randomAvatar,
        status: 'Online',
        bio: 'New contact on EzTalk.',
      });

      onAddFriend(createdUser);
      setHandle('');
      setName('');
      setErrorMessage('');
      onClose();
    } catch {
      const fallbackUser: User = {
        id: `user_${Date.now()}`,
        name: name.trim() || formattedHandle.replace('@', ''),
        handle: formattedHandle,
        avatar: CURATED_AVATARS[0],
        status: 'Online',
        bio: 'New contact on EzTalk.',
      };
      onAddFriend(fallbackUser);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center glass-overlay animate-fade-in select-none p-0 sm:p-4">
      <div className="bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-md p-4 sm:p-6 shadow-none sm:shadow-glass-lg relative flex flex-col justify-between overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ez-border/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Find Users & New Chat</h3>
              <p className="text-[11px] text-ez-muted">Search by username to start a conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ez-muted hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/25 p-2.5 rounded-xl text-red-400 text-xs animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Username Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="@username (e.g. @test3 or @test4)"
                  className="w-full bg-ez-base border border-ez-border focus:border-neon-green rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
                />
              </div>
            </div>

            {/* Quick matching search suggestions */}
            {suggestedUsers.length > 0 && (
              <div className="space-y-1.5 bg-ez-base p-2.5 rounded-2xl border border-ez-border/50">
                <span className="text-[10px] uppercase font-bold text-ez-muted px-1.5">
                  Matching Users
                </span>
                {suggestedUsers.map((su) => (
                  <div
                    key={su.id}
                    onClick={() => {
                      onAddFriend(su);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors duration-150 group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img src={su.avatar} alt={su.handle} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-neon-green transition-colors duration-150 truncate">
                          {su.name || su.handle}
                        </span>
                        <span className="text-[10px] text-ez-muted font-mono truncate">{su.handle}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-lg border border-neon-green/20">
                      Chat
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''))}
                placeholder="Full Name"
                className="w-full bg-ez-base border border-ez-border focus:border-neon-green rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
              />
            </div>
          </div>

          <div className="pt-6 mt-auto flex space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-ez-hover hover:bg-ez-border text-gray-300 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-neon-green hover:bg-neon-green-light text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Start Chat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
