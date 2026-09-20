import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Bell,
  BellOff,
  FileText,
  UserMinus,
  UserPlus,
  Download,
  Ban,
  Share2,
  Check,
  Pencil,
  Play,
  Music,
} from 'lucide-react';
import { User, Message, Attachment } from '../../types/chat';
import { useTranslation } from '../../context/LanguageContext';
import { ConfirmModal } from '../Common/ConfirmModal';
import { EditContactNameModal } from './EditContactNameModal';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  isOnline?: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  messages?: Message[];
  onClose: () => void;
  onStartCall: () => void;
  onToggleNotifications: () => void;
  onToggleBlock?: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
  currentAlias?: string;
  originalName?: string;
  onEditAlias?: () => void;
  onSaveAlias?: (newAlias: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  isOnline = false,
  isMuted = false,
  isFriend = true,
  isBlocked = false,
  messages = [],
  onClose,
  onStartCall,
  onToggleNotifications,
  onToggleBlock,
  onRemoveFriend,
  onAddFriend,
  currentAlias,
  originalName,
  onEditAlias,
  onSaveAlias,
}) => {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<'block' | 'unblock' | 'remove_friend' | null>(null);
  const { t, language } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
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
  }, [isOpen, previewAttachment, onClose]);

  const isUserOnline = Boolean(!isBlocked && isOnline);

  if (!isOpen) return null;

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/${language}/@${user.handle.replace('@', '')}`;

    const copyToClipboard = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    };

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: `EzTalk Profile - ${user.name}`,
          url: profileUrl
        });
      } catch {
        await copyToClipboard(profileUrl);
      }
    } else {
      await copyToClipboard(profileUrl);
    }
  };

  const sharedAttachments: Attachment[] = messages
    .filter((m) => m.attachment)
    .map((m) => m.attachment as Attachment);

  const bannerStyle = user.banner || 'linear-gradient(135deg, #050505 0%, #121214 50%, #0B0B0C 100%)';
  const isImageBanner = user.banner && (user.banner.startsWith('http') || user.banner.startsWith('data:image'));

  const handleExportChat = () => {
    if (messages.length === 0) {
      alert(t.chat?.noMessagesToExport || 'No messages to export.');
      return;
    }

    const lines = [
      `=== EzTalk Chat History: ${user.name || user.handle} (${user.handle}) ===`,
      `Exported at: ${new Date().toLocaleString()}`,
      `Total Messages: ${messages.length}`,
      '-------------------------------------------------------',
      '',
    ];

    messages.forEach((m) => {
      const time = m.createdAt ? new Date(m.createdAt).toLocaleString() : m.timestamp || 'Just now';
      const sender = m.senderHandle || 'User';
      const text = m.text || '';
      const att = m.attachment ? ` [Attachment: ${m.attachment.name} (${m.attachment.type})]` : '';
      const reply = m.replyTo ? ` (Replying to: "${m.replyTo.text}")` : '';
      lines.push(`[${time}] ${sender}${reply}: ${text}${att}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eztalk_chat_${user.handle.replace('@', '')}_${Date.now()}.txt`;
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
          aria-label={t.common.close}
          className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all duration-150 cursor-pointer shadow-glass border border-white/10 hover:scale-105"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          {/* Banner */}
          <div
            className={`h-28 sm:h-32 w-full shrink-0 relative bg-cover bg-center overflow-hidden ${isImageBanner ? 'cursor-pointer group' : ''}`}
            onClick={() => {
              if (isImageBanner && user.banner) {
                setPreviewAttachment({
                  id: 'banner-preview',
                  name: `${user.name || user.handle}'s Background`,
                  url: user.banner,
                  type: 'image',
                  size: '',
                });
              }
            }}
            style={
              isImageBanner
                ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: bannerStyle }
            }
            title={isImageBanner ? t.profile.viewBackground : undefined}
          >
            {/* Ambient radial glow — only shown when user has no custom banner */}
            {!user.banner && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--ez-accent-glow),transparent_70%)]" />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              </>
            )}
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
                    if (user.avatar) {
                      setPreviewAttachment({
                        id: 'avatar-preview',
                        name: `${user.name || user.handle}'s Avatar`,
                        url: user.avatar,
                        type: 'image',
                        size: '',
                      });
                    }
                  }}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] rounded-full overflow-hidden bg-ez-surface shadow-neon-sm shrink-0 cursor-pointer hover:scale-105 transition-transform duration-150"
                  title={t.profile.viewAvatar}
                >
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                </div>
                <div
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-ez-elevated z-30 ${isBlocked
                    ? 'bg-rose-500'
                    : isUserOnline
                      ? 'bg-neon-green-glow shadow-neon-dot'
                      : 'bg-ez-muted'
                    }`}
                  title={isBlocked ? t.chat.blocked : isUserOnline ? t.chat.online : t.chat.offline}
                />
              </div>

              {/* Name row */}
              <div className="flex items-center justify-center gap-2 mb-0.5 w-full max-w-full px-10 relative">
                {user.statusEmoji && (
                  <span className="text-xl leading-none shrink-0 opacity-0 pointer-events-none select-none" aria-hidden="true">
                    {user.statusEmoji}
                  </span>
                )}
                <h3 className="text-xl font-bold text-white tracking-tight leading-tight truncate text-center">
                  {user.name || user.handle}
                </h3>
                {user.statusEmoji && (
                  <span className="text-xl leading-none shrink-0">{user.statusEmoji}</span>
                )}
                {isFriend && (onEditAlias || onSaveAlias) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSaveAlias) {
                        setIsEditNameOpen(true);
                      } else if (onEditAlias) {
                        onEditAlias();
                      }
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={t.profile?.editName || 'Edit Contact Name'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Handle */}
              <p className="text-xs font-mono font-bold text-[var(--ez-accent)] mt-0.5 tracking-wide">{user.handle}</p>

              {/* Custom status */}
              {user.customStatusText && (
                <p className="text-[13px] text-gray-200 mt-1.5 font-medium italic">
                  "{user.customStatusText}"
                </p>
              )}

              {/* Online / offline label */}
              <span
                className={`text-[11px] font-mono mt-1 ${isBlocked
                  ? 'text-rose-400 font-semibold'
                  : isUserOnline
                    ? 'text-[var(--ez-accent)] font-medium'
                    : 'text-ez-muted'
                  }`}
              >
                {isBlocked ? t.chat.blocked : isUserOnline ? t.chat.online : t.chat.offline}
              </span>

              {/* Bio */}
              {user.bio && (
                <div className="mt-3 w-full max-w-xs">
                  <p className="text-[13px] text-gray-300 px-4 py-2.5 bg-white/5 rounded-2xl border-l-2 border-[var(--ez-accent)] border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5 leading-relaxed text-left">
                    {user.bio}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`grid ${user.handle !== '@ai' ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-5`}>
              {user.handle !== '@ai' && (
                <button
                  type="button"
                  onClick={onStartCall}
                  className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <Phone className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                  <span className="text-[10px] font-semibold text-gray-200">{t.chat.call}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleNotifications}
                className={`group flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all duration-150 active:scale-95 cursor-pointer ${isMuted
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-gray-200'
                  }`}
              >
                {isMuted ? <BellOff className="w-5 h-5 mb-1.5" /> : <Bell className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />}
                <span className="text-[10px] font-semibold">{isMuted ? t.chat.muted : t.chat.mute}</span>
              </button>

              <button
                type="button"
                onClick={handleShareProfile}
                className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                title={t.profile?.shareProfile || 'Share Profile'}
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                ) : (
                  <Share2 className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                )}
                <span className="text-[10px] font-semibold text-gray-200">{isCopied ? (t.profile?.linkCopied || 'Copied!') : (t.profile?.shareProfile || 'Share')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportChat}
                className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-95 cursor-pointer"
                title={t.chat.exportChatHistory}
              >
                <Download className="w-5 h-5 text-[var(--ez-accent)] mb-1.5" />
                <span className="text-[10px] font-semibold text-gray-200">{t.chat.export}</span>
              </button>
            </div>

            {/* Shared Media */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ez-muted uppercase tracking-wider">{t.chat.sharedMedia}</span>
                  <span className="text-[10px] font-mono text-ez-muted">({sharedAttachments.length})</span>
                </div>
                {sharedAttachments.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMedia((prev) => !prev)}
                    className="text-[11px] font-semibold text-[var(--ez-accent)] hover:brightness-125 transition-all duration-150 cursor-pointer"
                  >
                    {showAllMedia
                      ? ((t.chat as any)?.showLess || 'Show less')
                      : ((t.chat as any)?.seeAll || `See all (${sharedAttachments.length})`)}
                  </button>
                )}
              </div>

              {sharedAttachments.length === 0 ? (
                <div className="p-3 bg-ez-surface rounded-xl text-center text-xs text-ez-muted border border-ez-border/30">
                  {t.chat.noMediaShared}
                </div>
              ) : (
                <div className={`grid grid-cols-4 gap-2 transition-all ${showAllMedia ? 'max-h-64 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                  {(showAllMedia ? sharedAttachments : sharedAttachments.slice(0, 8)).map((att, idx) => {
                    const isLastHiddenSlot = !showAllMedia && idx === 7 && sharedAttachments.length > 8;
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
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        ) : att.type === 'video' ? (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <video src={att.url} className="w-full h-full object-cover opacity-80" />
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
                            <span className="text-[9px] font-normal text-gray-300">{(t.chat as any)?.more || 'more'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Danger / Relationship Actions */}
            <div className="mt-auto space-y-2 pt-3 border-t border-ez-border/40">
              {onToggleBlock && (
                <button
                  type="button"
                  onClick={() => setActionToConfirm(isBlocked ? 'unblock' : 'block')}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${isBlocked
                    ? 'bg-[var(--ez-accent)]/10 text-[var(--ez-accent)] border border-[var(--ez-accent)]/25 hover:bg-[var(--ez-accent)]/20'
                    : 'bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/5 hover:border-rose-500/25'
                    }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>{isBlocked ? t.chat.unblockUser : t.chat.blockUser}</span>
                </button>
              )}

              {isFriend ? (
                onRemoveFriend && (
                  <button
                    type="button"
                    onClick={() => setActionToConfirm('remove_friend')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-rose-400 text-sm font-semibold border border-white/5 hover:border-rose-500/25 transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>{t.chat.removeFriend}</span>
                  </button>
                )
              ) : (
                onAddFriend && (
                  <button
                    type="button"
                    onClick={onAddFriend}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--ez-accent)] hover:brightness-110 text-black text-sm font-bold shadow-neon-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t.chat.addToFriends}</span>
                  </button>
                )
              )}
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
            <div className="relative max-w-2xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
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
                <span className="text-xs font-medium text-white truncate max-w-xs">{previewAttachment.name}</span>
                <button
                  type="button"
                  onClick={() => handleDirectDownload(previewAttachment.url, previewAttachment.name)}
                  className="flex items-center space-x-1 text-xs text-neon-green font-bold hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.chat?.download || "Download"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!actionToConfirm}
          title={
            actionToConfirm === 'block'
              ? (t as any).chat?.blockUser || 'Block User'
              : actionToConfirm === 'remove_friend'
                ? (t as any).chat?.removeFriend || 'Remove Friend'
                : (t as any).chat?.unblockUser || 'Unblock User'
          }
          message={
            actionToConfirm === 'block'
              ? ((t as any).chat?.blockConfirm || `Are you sure you want to block {user}?`).replace('{user}', user.name || user.handle)
              : actionToConfirm === 'remove_friend'
                ? ((t as any).chat?.removeFriendConfirm || `Are you sure you want to remove {user} from your friends list?`).replace('{user}', user.name || user.handle)
                : ((t as any).chat?.unblockConfirm || `Are you sure you want to unblock {user}?`).replace('{user}', user.name || user.handle)
          }
          confirmText={
            actionToConfirm === 'block'
              ? (t as any).chat?.blockUser || 'Block User'
              : actionToConfirm === 'remove_friend'
                ? (t as any).chat?.removeFriend || 'Remove Friend'
                : (t as any).chat?.unblockUser || 'Unblock User'
          }
          cancelText={(t as any).chat?.cancel || "Cancel"}
          onConfirm={() => {
            if (actionToConfirm === 'block' || actionToConfirm === 'unblock') {
              if (onToggleBlock) onToggleBlock();
            } else if (actionToConfirm === 'remove_friend') {
              if (onRemoveFriend) onRemoveFriend();
            }
            setActionToConfirm(null);
          }}
          onCancel={() => setActionToConfirm(null)}
        />

        {/* Edit Contact Name Modal */}
        {isEditNameOpen && onSaveAlias && (
          <EditContactNameModal
            isOpen={isEditNameOpen}
            user={user}
            currentAlias={currentAlias}
            originalName={originalName}
            onClose={() => setIsEditNameOpen(false)}
            onSave={(newAlias) => {
              onSaveAlias(newAlias);
            }}
          />
        )}
      </div>
    </div>
  );
};