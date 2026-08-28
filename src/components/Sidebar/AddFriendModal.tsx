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

    // Disallow adding oneself
    if (currentUser && normalizeHandle(currentUser.handle) === formattedHandle) {
      setErrorMessage('You cannot start a chat with yourself.');
      return;
    }

    // Check if already in current list
    const existing = existingUsers.find((u) => normalizeHandle(u.handle) === formattedHandle);
    if (existing) {
      onAddFriend(existing);
      onClose();
      return;
    }

    setLoading(true);

    try {
      // 1. Try to fetch the real registered user from the backend database
      const remoteUser = await ApiService.getUserByHandle(formattedHandle);
      if (remoteUser) {
        onAddFriend(remoteUser);
        setHandle('');
        setName('');
        setErrorMessage('');
        onClose();
        return;
      }

      // 2. If not found on backend, register new user with clean curated avatar
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in select-none p-4">
      <div className="bg-[#18191d] border border-[#2b2d35] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282a32]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#00ff73]/10 text-[#00ff73] border border-[#00ff73]/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Find Users & New Chat</h3>
              <p className="text-[11px] text-gray-400">Search by username to start a conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-[#25272f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-red-400 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                className="w-full bg-[#121316] border border-[#2e3038] focus:border-[#00ff73] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Quick matching search suggestions (capped to max 3) */}
          {suggestedUsers.length > 0 && (
            <div className="space-y-1.5 bg-[#121316] p-2.5 rounded-2xl border border-[#252731]">
              <span className="text-[10px] uppercase font-bold text-gray-500 px-1.5">
                Matching Users
              </span>
              {suggestedUsers.map((su) => (
                <div
                  key={su.id}
                  onClick={() => {
                    onAddFriend(su);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img src={su.avatar} alt={su.handle} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white group-hover:text-[#00ff73] transition-colors truncate">
                        {su.name || su.handle}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono truncate">{su.handle}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#00ff73] bg-[#00ff73]/10 px-2 py-0.5 rounded-lg border border-[#00ff73]/20">
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
              className="w-full bg-[#121316] border border-[#2e3038] focus:border-[#00ff73] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#25272e] hover:bg-[#2e313b] text-gray-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
