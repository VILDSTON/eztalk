import React, { useState, useRef } from 'react';
import { X, Users, RefreshCw, Trash2, UserPlus, UserMinus, Shield, Check, Camera, Upload, Loader2 } from 'lucide-react';
import { Group, User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';
import { ConfirmModal } from '../Common/ConfirmModal';
import { ApiService } from '../../services/api';
import { compressAvatar } from '../../utils/imageCompressor';

interface ManageGroupModalProps {
  isOpen: boolean;
  group: Group;
  currentUser: User;
  allUsers?: User[];
  onClose: () => void;
  onUpdateGroup: (groupId: string, payload: { name: string; avatar: string; memberHandles: string[] }) => Promise<void>;
  onDeleteGroup: () => void;
}

export const ManageGroupModal: React.FC<ManageGroupModalProps> = ({
  isOpen,
  group,
  currentUser,
  allUsers = [],
  onClose,
  onUpdateGroup,
  onDeleteGroup,
}) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState(group.name);
  const [groupAvatar, setGroupAvatar] = useState(group.avatar);
  const [memberHandles, setMemberHandles] = useState<string[]>(group.memberHandles || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const myHandle = normalizeHandle(currentUser.handle).toLowerCase();
  const creatorHandle = normalizeHandle(group.creatorHandle).toLowerCase();

  // Friends of the current user who are NOT yet in the group
  const availableFriends = allUsers.filter((u) => {
    const clean = normalizeHandle(u.handle).toLowerCase();
    const isFriend = (currentUser.friends || []).map((f) => normalizeHandle(f).toLowerCase()).includes(clean);
    const alreadyInGroup = memberHandles.map((m) => normalizeHandle(m).toLowerCase()).includes(clean);
    return isFriend && !alreadyInGroup && clean !== myHandle;
  });

  const handleRandomizeAvatar = () => {
    const seed = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setGroupAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=0B0E14,1A1F2C`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploaded = await ApiService.uploadFile(file);
      if (uploaded && uploaded.url) {
        setGroupAvatar(uploaded.url);
      } else {
        throw new Error('No URL returned');
      }
    } catch {
      try {
        const compressed = await compressAvatar(file);
        setGroupAvatar(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setGroupAvatar(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveMember = (handle: string) => {
    const clean = normalizeHandle(handle);
    setMemberHandles((prev) => prev.filter((h) => normalizeHandle(h).toLowerCase() !== clean.toLowerCase()));
    setMemberToRemove(null);
  };

  const handleAddMember = (handle: string) => {
    const clean = normalizeHandle(handle);
    if (!memberHandles.some((h) => normalizeHandle(h).toLowerCase() === clean.toLowerCase())) {
      setMemberHandles((prev) => [...prev, clean]);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateGroup(group.id, {
        name: groupName.trim(),
        avatar: groupAvatar,
        memberHandles,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex sm:items-center sm:justify-center p-0 sm:p-4 select-none font-sans">
        {/* Backdrop */}
        <div onClick={onClose} className="fixed inset-0 glass-overlay animate-fade-in" />

        {/* Modal Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-ez-border/50 bg-ez-surface shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {(t as any)?.groups?.manageGroup || 'Manage Group'}
                </h3>
                <p className="text-xs text-ez-muted font-mono">{group.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-6 flex-1">
            {/* 1. Name & Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-ez-surface/60 border border-ez-border/50">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-neon-green/40 shadow-neon-sm bg-black/40 cursor-pointer hover:border-neon-green transition-all"
                  title={(t.groups as any)?.changePhoto || 'Click to change photo'}
                >
                  <img src={groupAvatar} alt="Group Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="w-5 h-5 text-neon-green mb-0.5" />
                    <span className="text-[9px] font-bold">Change</span>
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-neon-green animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title={(t.groups as any)?.uploadPhoto || 'Upload custom photo'}
                  >
                    <Upload className="w-3 h-3 text-neon-green" />
                    <span>{(t.groups as any)?.upload || 'Upload'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRandomizeAvatar}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title={(t.groups as any)?.randomizeAvatar || 'Generate random avatar'}
                  >
                    <RefreshCw className="w-3 h-3 text-neon-green" />
                    <span>{(t.groups as any)?.random || 'Random'}</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex-1 w-full space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">
                  {(t as any)?.groups?.groupName || 'Group Name'}
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group Name"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 bg-ez-base border border-ez-border rounded-xl text-sm text-white placeholder-ez-muted outline-none focus:border-neon-green transition-colors"
                />
              </div>
            </div>

            {/* 2. Members List & Kick */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ez-muted">
                  {(t as any)?.groups?.members || 'Members'} ({memberHandles.length})
                </h4>
              </div>

              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {memberHandles.map((handle) => {
                  const clean = normalizeHandle(handle);
                  const isCreator = clean.toLowerCase() === creatorHandle;
                  const isMe = clean.toLowerCase() === myHandle;
                  const userObj = allUsers.find(
                    (u) => normalizeHandle(u.handle).toLowerCase() === clean.toLowerCase()
                  );
                  const displayName = userObj?.name || clean.replace('@', '');
                  const avatar = userObj?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${clean.replace('@', '')}`;

                  return (
                    <div
                      key={clean}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-ez-surface/40 border border-ez-border/30 hover:border-ez-border/60 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[140px]">
                              {displayName}
                            </span>
                            {isCreator && (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-neon-green/15 text-neon-green border border-neon-green/30">
                                <Shield className="w-2.5 h-2.5" />
                                <span>Admin</span>
                              </span>
                            )}
                            {isMe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ez-muted font-mono block truncate">{clean}</span>
                        </div>
                      </div>

                      {/* Remove button (Only creator can remove other members, cannot remove themselves) */}
                      {!isCreator && (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(clean)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Add Friends to Group */}
            {availableFriends.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ez-muted">
                  {(t as any)?.groups?.addFriends || 'Add Friends to Group'}
                </h4>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {availableFriends.map((friend) => {
                    const clean = normalizeHandle(friend.handle);
                    return (
                      <div
                        key={clean}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-ez-surface/40 border border-ez-border/30 hover:border-ez-border/60 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white truncate block">{friend.name}</span>
                            <span className="text-[10px] text-ez-muted font-mono block truncate">{clean}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddMember(clean)}
                          className="px-2.5 py-1 rounded-lg bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-xs font-bold flex items-center space-x-1 border border-neon-green/30 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Danger Zone: Delete Group */}
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {(t as any)?.groups?.dangerZone || 'Danger Zone'}
              </h4>
              <p className="text-[11px] text-ez-muted">
                {(t as any)?.groups?.deleteWarning || 'Deleting this group will remove it permanently for all members. This action cannot be undone.'}
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                <span>{(t as any)?.groups?.deleteGroup || 'Delete Group'}</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-ez-border/50 bg-ez-surface shrink-0 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t.common?.cancel || 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isSubmitting || !groupName.trim()}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-neon-green hover:brightness-110 text-black font-bold text-xs shadow-neon-sm transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? ((t.common as any)?.saving || 'Saving...') : (t.common?.save || 'Save Changes')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Group Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={(t as any)?.groups?.deleteGroup || 'Delete Group'}
        message={(t as any)?.groups?.deleteGroupConfirm?.replace('{name}', group.name) || `Are you sure you want to delete group "${group.name}"? This action cannot be undone.`}
        confirmText={(t as any)?.groups?.deleteGroup || 'Delete Group'}
        isDanger={true}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onClose();
          onDeleteGroup();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Confirm Kick Member Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove} from the group?`}
        confirmText="Remove"
        isDanger={true}
        onConfirm={() => memberToRemove && handleRemoveMember(memberToRemove)}
        onCancel={() => setMemberToRemove(null)}
      />
    </>
  );
};
