import React, { useState } from 'react';
import { X, Users, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface CreateGroupModalProps {
  isOpen: boolean;
  friends?: User[];
  existingUsers?: User[];
  currentUserHandle?: string;
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
  friends = [],
  existingUsers = [],
  currentUserHandle,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GROUP_AVATAR_PRESETS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const rawList = existingUsers.length > 0 ? existingUsers : friends;
  const myHandle = normalizeHandle(currentUserHandle || '').toLowerCase();

  const memberCandidates = rawList.filter(
    (u) => normalizeHandle(u.handle).toLowerCase() !== myHandle
  );

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
      setError('Please select at least 1 member to join the group.');
      return;
    }

    onCreateGroup(name.trim(), selectedAvatar, selectedMembers);
    setName('');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

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
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Create Telegram Group</h3>
              <p className="text-xs text-gray-400">Add friends and collaborate</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Project Devs, Family, Gaming..."
              className="w-full bg-[#23242c] focus:bg-[#282a33] border border-transparent focus:border-[#00ff73]/40 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Group Avatar Presets */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Group Avatar
            </label>
            <div className="flex items-center space-x-2.5 overflow-x-auto pb-1">
              {GROUP_AVATAR_PRESETS.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAvatar(url)}
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden border-2 cursor-pointer transition-all relative shrink-0 ${
                    selectedAvatar === url
                      ? 'border-[#00ff73] scale-105 shadow-[0_0_10px_#00ff73]'
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

          {/* Member Selection Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Select Members
              </label>
              <span className="text-xs font-mono text-[#00ff73] font-bold">
                {selectedMembers.length} selected
              </span>
            </div>

            {memberCandidates.length === 0 ? (
              <div className="text-xs text-gray-500 p-4 bg-[#23242c] rounded-2xl text-center">
                No other contacts available. Add contacts to add them to this group.
              </div>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {memberCandidates.map((user) => {
                  const isSelected = selectedMembers.includes(user.handle);
                  return (
                    <div
                      key={user.id || user.handle}
                      onClick={() => toggleMember(user.handle)}
                      className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00ff73]/15 border border-[#00ff73]/40'
                          : 'bg-[#23242c] hover:bg-[#282a33] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full overflow-hidden border border-white/10 shrink-0">
                          <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{user.name || user.handle}</span>
                          <span className="text-[10px] text-gray-400 font-mono truncate">{user.handle}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
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
          <div className="pt-3 border-t border-white/5 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00ff73] hover:bg-[#1aff85] text-black text-xs font-bold shadow-[0_0_15px_rgba(0,255,115,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
