import React, { useState, useRef } from 'react';
import { X, Users, Check, AlertCircle, Camera, Search } from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';
import { ApiService } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';

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
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GROUP_AVATAR_PRESETS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const rawList = existingUsers.length > 0 ? existingUsers : friends;
  const myHandle = normalizeHandle(currentUserHandle || '').toLowerCase();

  const memberCandidates = rawList
    .filter((u) => normalizeHandle(u.handle).toLowerCase() !== myHandle)
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return (u.name || '').toLowerCase().includes(q) || u.handle.toLowerCase().includes(q);
    });

  const toggleMember = (handle: string) => {
    if (selectedMembers.includes(handle)) {
      setSelectedMembers((prev) => prev.filter((h) => h !== handle));
    } else {
      setSelectedMembers((prev) => [...prev, handle]);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t.groups?.validationError || 'Please select an image file.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      const uploaded = await ApiService.uploadFile(file);
      setSelectedAvatar(uploaded.url);
    } catch (err) {
      setError(t.groups?.uploadError || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.groups?.nameRequired || 'Please enter a group name.');
      return;
    }
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setError(t.groups?.nameLengthError || 'Group name must be between 3 and 50 characters.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError(t.groups?.memberRequired || 'Please select at least 1 member to join the group.');
      return;
    }

    onCreateGroup(trimmedName, selectedAvatar, selectedMembers);
    setName('');
    setSelectedMembers([]);
    setSearchQuery('');
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
              <h3 className="text-base font-bold text-white tracking-tight">{t.groups?.createGroup || 'Create Group'}</h3>
              <p className="text-xs text-ez-muted">{t.groups?.addMembers || 'Add friends and collaborate'}</p>
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
                {t.groups?.groupName || 'Group Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder={t.groups?.groupNamePlaceholder || 'e.g. Project Devs, Family, Gaming...'}
                className="w-full bg-ez-base border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
              />
            </div>

            {/* Group Avatar Previews */}
            <div>
              <label className="block text-[11px] font-bold text-ez-muted uppercase tracking-wider mb-1.5">
                {t.groups?.groupAvatar || 'Group Avatar'}
              </label>
              <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-1">
                {/* Custom Avatar Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`relative w-12 h-12 rounded-full overflow-hidden border-2 border-dashed border-ez-border flex items-center justify-center bg-ez-base/50 text-ez-muted hover:text-white hover:border-ez-muted transition-colors shrink-0 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Presets and Selected Custom */}
                {(!GROUP_AVATAR_PRESETS.includes(selectedAvatar) && selectedAvatar) && (
                  <button
                    type="button"
                    className="relative w-12 h-12 rounded-full overflow-hidden border-2 transition-transform duration-150 shrink-0 cursor-pointer border-neon-green scale-105 shadow-neon-sm"
                  >
                    <img src={selectedAvatar} alt="Custom Avatar" className="w-full h-full object-cover" />
                  </button>
                )}

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-ez-muted uppercase tracking-wider">
                  {t.groups?.selectMembers || 'Select Members'}
                </label>
                <span className="text-xs font-mono font-bold text-neon-green">
                  {selectedMembers.length} {t.groups?.membersCount || 'members'}
                </span>
              </div>

              {/* Selected Chips */}
              {selectedMembers.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {selectedMembers.map(handle => {
                    const user = rawList.find(u => normalizeHandle(u.handle) === handle);
                    if (!user) return null;
                    return (
                      <div key={handle} className="flex items-center gap-1.5 bg-neon-green/10 border border-neon-green/20 rounded-full pl-1.5 pr-2.5 py-1 shrink-0">
                        <img src={user.avatar} alt={user.handle} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-[11px] font-medium text-neon-green">{user.name || user.handle}</span>
                        <X 
                          className="w-3 h-3 text-neon-green/70 hover:text-neon-green cursor-pointer ml-0.5" 
                          onClick={() => toggleMember(handle)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ez-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.groups?.searchMembers || 'Search members...'}
                  className="w-full bg-ez-base border border-ez-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-ez-muted outline-none focus:border-[var(--ez-accent)]"
                />
              </div>

              {memberCandidates.length === 0 ? (
                <div className="p-4 bg-ez-base/50 rounded-2xl border border-ez-border/40 text-center text-xs text-ez-muted">
                  {t.groups?.noMembersAvailable || 'No friends available to add yet.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {memberCandidates.map((user) => {
                    const isSelected = selectedMembers.includes(normalizeHandle(user.handle));
                    return (
                      <div
                        key={user.id || user.handle}
                        onClick={() => toggleMember(normalizeHandle(user.handle))}
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
              {t.groups?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || selectedMembers.length === 0 || isUploading}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                !name.trim() || selectedMembers.length === 0 || isUploading
                  ? 'bg-neon-green/40 text-black/50 cursor-not-allowed opacity-40'
                  : 'bg-neon-green hover:bg-neon-green-light focus:ring-2 focus:ring-[var(--ez-accent)] focus:outline-none text-black shadow-neon-sm hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {t.groups?.createGroup || 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
