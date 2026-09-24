import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Bell,
  BellOff,
  Share2,
  Check,
  Download,
  Settings,
  LogOut,
  Shield,
  Search,
  FileText,
  Play,
  Music,
} from 'lucide-react';
import { Group, User, Message, Attachment } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';
import { ConfirmModal } from '../Common/ConfirmModal';
import { ManageGroupModal } from './ManageGroupModal';

interface GroupInfoModalProps {
  isOpen: boolean;
  group: Group;
  currentUser?: User | null;
  currentUserHandle?: string;
  allUsers?: User[];
  onlineHandles?: string[];
  messages?: Message[];
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClose: () => void;
  onUpdateGroup?: (
    groupId: string,
    payload: { name: string; avatar: string; memberHandles: string[] }
  ) => Promise<void>;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  group,
  currentUser,
  currentUserHandle,
  allUsers = [],
  onlineHandles = [],
  messages = [],
  isMuted = false,
  onToggleMute,
  onClose,
  onUpdateGroup,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
        } else if (isManageOpen) {
          setIsManageOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, previewAttachment, isManageOpen, onClose]);

  if (!isOpen) return null;

  const myHandle = normalizeHandle(currentUser?.handle || currentUserHandle || '').toLowerCase();
  const creatorHandle = normalizeHandle(group.creatorHandle || '').toLowerCase();
  const isCreator = myHandle === creatorHandle;

  const resolvedCurrentUser: User = currentUser || {
    id: myHandle,
    handle: myHandle,
    name: myHandle.replace('@', ''),
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${myHandle.replace('@', '')}`,
    status: 'Online',
  };

  // Build members list with full profiles and presence
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
      avatar:
        userObj?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${clean.replace('@', '')}`,
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

  // Extract shared media attachments from group messages
  const sharedAttachments: Attachment[] = messages
    .filter((m) => m.attachment)
    .map((m) => m.attachment as Attachment);

  // Invite link handler
  const handleShareInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/${language}/join/group/${group.id}`;

    const copyToClipboard = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite link', err);
      }
    };

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: `EzTalk Group - ${group.name}`,
          text: `Join "${group.name}" group on EzTalk!`,
          url: inviteUrl,
        });
      } catch {
        await copyToClipboard(inviteUrl);
      }
    } else {
      await copyToClipboard(inviteUrl);
    }
  };

  // Chat export handler
  const handleExportChat = () => {
    if (messages.length === 0) {
      alert(t.chat?.noMessagesToExport || 'No messages to export.');
      return;
    }

    const lines = [
      `=== EzTalk Group Chat History: ${group.name} ===`,
      `Group ID: ${group.id}`,
      `Created by: ${group.creatorHandle}`,
      `Members Count: ${group.memberHandles.length}`,
      `Exported at: ${new Date().toLocaleString()}`,
      `Total Messages: ${messages.length}`,
      '-------------------------------------------------------',
      '',
    ];

    messages.forEach((m) => {
      const time = m.createdAt
        ? new Date(m.createdAt).toLocaleString()
        : m.timestamp || 'Just now';
      const sender = m.senderHandle || 'Member';
      const text = m.text || '';
      const att = m.attachment
        ? ` [Attachment: ${m.attachment.name} (${m.attachment.type})]`
        : '';
      const reply = m.replyTo ? ` (Replying to: "${m.replyTo.text}")` : '';
      lines.push(`[${time}] ${sender}${reply}: ${text}${att}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eztalk_group_${group.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDirectDownload = async (fileUrl: string, fileName?: string) => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/80 backdrop-blur-md animate-fade-in select-none p-0 sm:p-4 font-sans"
        onClick={onClose}
      >
        <div
          className="bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-md shadow-none sm:shadow-glass-lg relative overflow-hidden sm:max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Floating Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common?.close || 'Close'}
            className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all duration-150 cursor-pointer shadow-glass border border-white/10 hover:scale-105"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
            {/* Ambient Banner */}
            <div className="h-28 sm:h-32 w-full shrink-0 relative bg-cover bg-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--ez-accent-glow),transparent_70%)]" />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ez-elevated via-ez-elevated/20 to-transparent pointer-events-none" />
            </div>

            {/* Profile Body */}
            <div className="px-5 pb-6 pt-0 flex-1 flex flex-col">
              <div className="flex flex-col items-center text-center -mt-14 mb-5 relative z-20">
                {/* Avatar with accent glow ring */}
                <div className="relative mb-3 shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-[var(--ez-accent)] opacity-30 blur-md" />
                  <div
                    onClick={() => {
                      if (group.avatar) {
                        setPreviewAttachment({
                          id: 'group-avatar-preview',
                          name: `${group.name}'s Avatar`,
                          url: group.avatar,
                          type: 'image',
                          size: '',
                        });
                      }
                    }}
                    className="relative w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] rounded-full overflow-hidden bg-ez-surface shadow-neon-sm shrink-0 cursor-pointer hover:scale-105 transition-transform duration-150 border-2 border-white/10"
                    title={t.profile?.viewAvatar || 'View Avatar'}
                  >
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-neon-green text-black flex items-center justify-center text-[10px] font-bold border-2 border-ez-elevated shadow-sm">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-center justify-center gap-2 mb-0.5 w-full max-w-full px-6">
                  <h3 className="text-xl font-bold text-white tracking-tight leading-tight truncate text-center">
                    {group.name}
                  </h3>
                </div>

                {/* Creator subtitle */}
                <p className="text-xs font-mono font-bold text-[var(--ez-accent)] mt-0.5 tracking-wide">
                  {(t as any)?.groups?.createdLabel || 'Created by'}{' '}
                  <span className="text-white">{group.creatorHandle}</span>
                </p>

                {/* Members count label */}
                <span className="text-[11px] font-mono mt-1 text-ez-muted">
                  {group.memberHandles.length} {(t as any)?.groups?.membersCount || 'members'}
                </span>
              </div>

              {/* Action Buttons Grid (4 for creator, 3 for members) */}
              <div className={`grid ${isCreator ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-5`}>
                {/* 1. Mute / Unmute */}
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`group flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all duration-150 active:scale-95 cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-gray-200'
                  }`}
                  title={isMuted ? t.chat?.unmute || 'Unmute' : t.chat?.mute || 'Mute'}
                >
                  {isMuted ? (
                    <BellOff className="w-5 h-5 mb-1.5" />
                  ) : (
                    <Bell className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                  )}
                  <span className="text-[10px] font-semibold">
                    {isMuted ? t.chat?.muted || 'Muted' : t.chat?.mute || 'Mute'}
                  </span>
                </button>

                {/* 2. Invite Link */}
                <button
                  type="button"
                  onClick={handleShareInviteLink}
                  className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                  title={(t as any)?.groups?.inviteLink || 'Invite Link'}
                >
                  {isCopied ? (
                    <Check className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                  ) : (
                    <Share2 className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                  )}
                  <span className="text-[10px] font-semibold text-gray-200">
                    {isCopied
                      ? t.profile?.linkCopied || 'Copied!'
                      : (t as any)?.groups?.inviteLink || 'Invite'}
                  </span>
                </button>

                {/* 3. Export Chat */}
                <button
                  type="button"
                  onClick={handleExportChat}
                  className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                  title={t.chat?.exportChatHistory || 'Export Chat History'}
                >
                  <Download className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                  <span className="text-[10px] font-semibold text-gray-200">
                    {t.chat?.export || 'Export'}
                  </span>
                </button>

                {/* 4. Manage (Creator Only) */}
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => setIsManageOpen(true)}
                    className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                    title={(t as any)?.groups?.manageGroup || 'Manage Group'}
                  >
                    <Settings className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                    <span className="text-[10px] font-semibold text-gray-200">
                      {(t as any)?.groups?.manage || 'Manage'}
                    </span>
                  </button>
                )}
              </div>

              {/* Shared Media Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ez-muted uppercase tracking-wider">
                      {t.chat?.sharedMedia || 'Shared Media'}
                    </span>
                    <span className="text-[10px] font-mono text-ez-muted">
                      ({sharedAttachments.length})
                    </span>
                  </div>
                  {sharedAttachments.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMedia((prev) => !prev)}
                      className="text-[11px] font-semibold text-[var(--ez-accent)] hover:brightness-125 transition-all duration-150 cursor-pointer"
                    >
                      {showAllMedia
                        ? (t.chat as any)?.showLess || 'Show less'
                        : (t.chat as any)?.seeAll || `See all (${sharedAttachments.length})`}
                    </button>
                  )}
                </div>

                {sharedAttachments.length === 0 ? (
                  <div className="p-3 bg-ez-surface rounded-xl text-center text-xs text-ez-muted border border-ez-border/30">
                    {t.chat?.noMediaShared || 'No media shared yet'}
                  </div>
                ) : (
                  <div
                    className={`grid grid-cols-4 gap-2 transition-all ${
                      showAllMedia ? 'max-h-64 overflow-y-auto custom-scrollbar pr-1' : ''
                    }`}
                  >
                    {(showAllMedia ? sharedAttachments : sharedAttachments.slice(0, 8)).map(
                      (att, idx) => {
                        const isLastHiddenSlot =
                          !showAllMedia && idx === 7 && sharedAttachments.length > 8;
                        const remainingCount = sharedAttachments.length - 7;

                        return (
                          <div
                            key={att.id || idx}
                            onClick={() => {
                              if (isLastHiddenSlot) {
                                setShowAllMedia(true);
                                return;
                              }
                              if (att.type === 'image' || att.type === 'video') {
                                setPreviewAttachment(att);
                              } else {
                                handleDirectDownload(att.url, att.name);
                              }
                            }}
                            className="relative h-16 rounded-xl overflow-hidden bg-black/30 border border-ez-border/30 flex items-center justify-center cursor-pointer hover:opacity-90 hover:border-white/20 transition-all duration-150 group"
                            title={att.name}
                          >
                            {att.type === 'image' ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover"
                              />
                            ) : att.type === 'video' ? (
                              <div className="relative w-full h-full bg-black flex items-center justify-center">
                                <video
                                  src={att.url}
                                  className="w-full h-full object-cover opacity-80"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="w-5 h-5 text-white fill-white/80" />
                                </div>
                              </div>
                            ) : att.type === 'audio' ? (
                              <Music className="w-5 h-5 text-[var(--ez-accent)]" />
                            ) : (
                              <FileText className="w-6 h-6 text-neon-green" />
                            )}

                            {/* Overlay on 8th item when more than 8 exist */}
                            {isLastHiddenSlot && (
                              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold text-sm tracking-wide z-10 hover:bg-black/65 transition-colors">
                                <span>+{remainingCount}</span>
                                <span className="text-[9px] font-normal text-gray-300">
                                  {(t.chat as any)?.more || 'more'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* Members Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ez-muted uppercase tracking-wider">
                    {(t as any)?.groups?.members || 'Members'} ({membersList.length})
                  </span>
                </div>

                {/* Member Search */}
                <div className="relative flex items-center mb-2">
                  <Search className="w-3.5 h-3.5 text-ez-muted absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={(t as any)?.groups?.searchMembers || 'Search members...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-ez-base border border-ez-border/60 rounded-xl text-xs text-white placeholder-ez-muted outline-none focus:border-neon-green transition-colors"
                  />
                </div>

                {/* Members List */}
                <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.handle}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-ez-border shrink-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                          {member.isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-ez-surface shadow-xs" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[150px]">
                              {member.name}
                            </span>
                            {member.isMe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300 font-medium">
                                {(t as any)?.groups?.you || 'You'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ez-muted font-mono block truncate">
                            {member.handle}
                          </span>
                        </div>
                      </div>

                      {/* Admin / Member Badge */}
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
                    <p className="text-center text-xs text-ez-muted py-4">
                      {(t as any)?.groups?.noMembersFound || 'No members found'}
                    </p>
                  )}
                </div>
              </div>

              {/* Danger / Leave Group Action */}
              <div className="mt-auto pt-3 border-t border-ez-border/40">
                {onLeaveGroup && (
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-rose-400 text-sm font-semibold border border-white/5 hover:border-rose-500/25 transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{(t as any)?.groups?.leaveGroup || 'Leave Group'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewAttachment(null);
          }}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {previewAttachment.type === 'video' ? (
              <video
                src={previewAttachment.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-ez-border"
              />
            ) : (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-ez-border"
              />
            )}
            <div className="mt-3 flex items-center space-x-3 bg-ez-surface/90 px-4 py-2 rounded-xl border border-ez-border/50">
              <span className="text-xs font-medium text-white truncate max-w-xs">
                {previewAttachment.name}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleDirectDownload(previewAttachment.url, previewAttachment.name)
                }
                className="flex items-center space-x-1 text-xs text-neon-green font-bold hover:underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.chat?.download || 'Download'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title={(t as any)?.groups?.leaveGroup || 'Leave Group'}
        message={
          isCreator
            ? ((t as any)?.groups?.leaveGroupCreatorConfirm ||
                `Are you sure you want to leave "${group.name}"? As the creator, ownership will be transferred to another member.`)
            : ((t as any)?.groups?.leaveGroupConfirm ||
                `Are you sure you want to leave "${group.name}"?`)
        }
        confirmText={(t as any)?.groups?.leaveGroup || 'Leave Group'}
        isDanger={true}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          onClose();
          if (onLeaveGroup) onLeaveGroup();
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Manage Group Modal (for Creator) */}
      {isManageOpen && onUpdateGroup && onDeleteGroup && (
        <ManageGroupModal
          isOpen={isManageOpen}
          group={group}
          currentUser={resolvedCurrentUser}
          allUsers={allUsers}
          onClose={() => setIsManageOpen(false)}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={() => {
            setIsManageOpen(false);
            onClose();
            onDeleteGroup();
          }}
        />
      )}
    </>
  );
};
