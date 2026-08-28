import React, { useState } from 'react';
import { X, Users, Check, CheckCircle2 } from 'lucide-react';
import { User } from '../../types/chat';

interface CreateGroupModalProps {
  isOpen: boolean;
  friends: User[];
  onClose: () => void;
  onCreateGroup: (name: string, avatar: string, memberHandles: string[]) => void;
}

const GROUP_AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  friends,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GROUP_AVATAR_PRESETS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleMember = (handle: string) => {
    if (selectedMembers.includes(handle)) {
      setSelectedMembers((prev) => prev.filter((h) => h !== handle));
    } else {
      setSelectedMembers((prev) => [...prev, handle]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least 1 friend to join the group.');
      return;
    }

    onCreateGroup(name.trim(), selectedAvatar, selectedMembers);
    setName('');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in select-none p-4">
      <div className="bg-[#15161b] border border-[#2b2d36] rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2.5 pb-4 border-b border-[#252731]">
          <div className="p-2.5 rounded-xl bg-[#00ff73]/10 text-[#00ff73]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Create Group Chat</h3>
            <p className="text-xs text-gray-400">Start a group conversation with multiple friends</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar py-4 space-y-4 pr-1">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Dream Team 🚀"
              className="w-full bg-[#1b1d24] border border-[#2e313c] focus:border-[#00ff73] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>

          {/* Group Icon Preset Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Group Avatar
            </label>
            <div className="flex items-center space-x-2.5">
              {GROUP_AVATAR_PRESETS.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedAvatar === url
                      ? 'border-[#00ff73] scale-110 shadow-neon-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="group preset" className="w-full h-full object-cover" />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 bg-[#00ff73]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff73]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Friends Checklist */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Select Friends ({selectedMembers.length} selected)
            </label>
            {friends.length === 0 ? (
              <div className="text-xs text-gray-500 italic p-3 bg-[#1b1d24] rounded-xl">
                You have not added any friends yet. Add friends first to create a group.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {friends.map((friend) => {
                  const isSelected = selectedMembers.includes(friend.handle);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleMember(friend.handle)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#00ff73]/15 border border-[#00ff73]/40' : 'bg-[#1b1d24] hover:bg-[#22242d] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={friend.avatar}
                          alt={friend.handle}
                          className="w-7 h-7 rounded-full object-cover border border-gray-700"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{friend.name || friend.handle}</span>
                          <span className="text-[10px] text-gray-400 font-mono truncate">{friend.handle}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected ? 'bg-[#00ff73] border-[#00ff73] text-black' : 'border-gray-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#252731] flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#25272e] hover:bg-[#2e313b] text-gray-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={friends.length === 0}
              className="flex-1 px-4 py-2.5 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
