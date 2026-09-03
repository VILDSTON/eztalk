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
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Create Group</h3>
              <p className="text-xs text-ez-muted">Add friends and collaborate</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center space-x-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Group Name */}
            <div>
              <label className="block text-[11px] font-bold text-ez-muted uppercase tracking-wider mb-1.5">
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
                className="w-full bg-ez-base border border-ez-border focus:border-neon-green rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
              />
            </div>

            {/* Group Avatar Previews */}
            <div>
              <label className="block text-[11px] font-bold text-ez-muted uppercase tracking-wider mb-1.5">
                Group Avatar
              </label>
              <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-1">
                {GROUP_AVATAR_PRESETS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-transform duration-150 shrink-0 cursor-pointer ${selectedAvatar === avatar
                      ? 'border-neon-green scale-105 shadow-neon-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Member Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-ez-muted uppercase tracking-wider">
                  Select Members
                </label>
                <span className="text-xs font-mono font-bold text-neon-green">
                  {selectedMembers.length} selected
                </span>
              </div>

              {memberCandidates.length === 0 ? (
                <div className="p-4 bg-ez-base/50 rounded-2xl border border-ez-border/40 text-center text-xs text-ez-muted">
                  No friends available to add yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
                  {memberCandidates.map((user) => {
                    const isSelected = selectedMembers.includes(normalizeHandle(user.handle));
                    return (
                      <div
                        key={user.id || user.handle}
                        onClick={() => toggleMember(user.handle)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition-colors duration-150 ${isSelected
                          ? 'bg-neon-green/10 border-neon-green/40 text-white'
                          : 'bg-ez-base/60 border-ez-border/40 text-gray-300 hover:bg-white/5'
                          }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.handle}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate leading-tight">
                              {user.name || user.handle}
                            </span>
                            <span className="text-[10px] text-ez-muted font-mono truncate">{user.handle}</span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors duration-150 shrink-0 ${isSelected ? 'bg-neon-green border-neon-green text-black' : 'border-gray-600 bg-transparent'
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
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 px-4 sm:px-5 border-t border-ez-border/50 bg-ez-surface flex items-center justify-end space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ez-muted hover:text-white hover:bg-white/5 cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-bold shadow-neon-sm transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
