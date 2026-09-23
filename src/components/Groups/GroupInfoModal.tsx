import React, { useState } from 'react';
import { X, Users, Trash2, LogOut, Shield, Search } from 'lucide-react';
import { Group, User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';

interface GroupInfoModalProps {
  isOpen: boolean;
  group: Group;
  currentUserHandle?: string;
  allUsers?: User[];
  onlineHandles?: string[];
  onClose: () => void;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  group,
  currentUserHandle,
  allUsers = [],
  onlineHandles = [],
  onClose,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const myHandle = normalizeHandle(currentUserHandle || '').toLowerCase();
  const creatorHandle = normalizeHandle(group.creatorHandle || '').toLowerCase();
  const isCreator = myHandle === creatorHandle;

  const membersList = (group.memberHandles || []).map((handle) => {
    const clean = normalizeHandle(handle);
    const userObj = allUsers.find(
      (u) => normalizeHandle(u.handle).toLowerCase() === clean.toLowerCase()
    );
    const isOnline = onlineHandles.some(
      (h) => normalizeHandle(h).toLowerCase() === clean.toLowerCase()
    );
    return {
      handle: clean,
      name: userObj?.name || clean.replace('@', ''),
      avatar: userObj?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${clean.replace('@', '')}`,
      isAdmin: clean.toLowerCase() === creatorHandle,
      isOnline,
      isMe: clean.toLowerCase() === myHandle,
    };
  });

  const filteredMembers = membersList.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 select-none font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 glass-overlay animate-fade-in" />

      {/* Modal Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ez-border/50 bg-ez-surface shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white tracking-tight truncate">
                {(t as any)?.groups?.groupInfo || 'Group Info'}
              </h3>
              <p className="text-xs text-ez-muted font-mono">
                {group.memberHandles.length} {(t as any)?.groups?.membersCount || 'members'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Profile Banner */}
        <div className="p-5 flex flex-col items-center border-b border-ez-border/40 bg-ez-base/40 text-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-neon-green/40 shadow-neon-sm mb-3">
            <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-neon-green text-black flex items-center justify-center text-[9px] font-bold border-2 border-ez-surface shadow-sm">
              <Users className="w-2.5 h-2.5" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{group.name}</h2>
          <p className="text-xs text-ez-muted mt-0.5 font-mono">
            {(t as any)?.groups?.createdLabel || 'Created by'} <span className="text-neon-green font-semibold">{group.creatorHandle}</span>
          </p>
        </div>

        {/* Member Search */}
        <div className="px-5 py-3 border-b border-ez-border/30 bg-ez-elevated">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-ez-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={(t as any)?.groups?.searchMembers || 'Search members...'}
              className="w-full pl-9 pr-4 py-2 bg-ez-base border border-ez-border rounded-xl text-xs text-white placeholder-ez-muted outline-none focus:border-neon-green transition-colors"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-1">
          {filteredMembers.map((member) => (
            <div
              key={member.handle}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-ez-border shrink-0">
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  {member.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-ez-surface shadow-xs" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {member.name}
                    </span>
                    {member.isMe && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300 font-medium">
                        {(t as any)?.groups?.you || 'You'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ez-muted font-mono block truncate">
                    {member.handle}
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div>
                {member.isAdmin ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon-green/15 text-neon-green border border-neon-green/30">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{(t as any)?.groups?.admin || 'Admin'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-ez-muted/60 font-mono">
                    {(t as any)?.groups?.member || 'Member'}
                  </span>
                )}
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <p className="text-center text-xs text-ez-muted py-6">
              {(t as any)?.groups?.noMembersFound || 'No members found'}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-ez-border/50 bg-ez-surface shrink-0 flex items-center justify-between gap-3">
          {isCreator ? (
            onDeleteGroup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteGroup();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{(t as any)?.groups?.deleteGroup || 'Delete Group'}</span>
              </button>
            )
          ) : (
            onLeaveGroup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLeaveGroup();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{(t as any)?.groups?.leaveGroup || 'Leave Group'}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
