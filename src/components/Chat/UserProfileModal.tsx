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
} from 'lucide-react';
import { User, Message, Attachment } from '../../types/chat';

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
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

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

  const sharedAttachments: Attachment[] = messages
    .filter((m) => m.attachment)
    .map((m) => m.attachment as Attachment);

  const bannerStyle = user.banner || 'linear-gradient(135deg, #0B0E14 0%, #1A1F2C 50%, #12161F 100%)';
  const isImageBanner = user.banner && (user.banner.startsWith('http') || user.banner.startsWith('data:image'));

  const handleExportChat = () => {
    if (messages.length === 0) {
      alert('No messages to export.');
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
          aria-label="Close user profile"
          className="absolute top-3 right-3 z-30 text-white/80 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all duration-150 cursor-pointer shadow-glass border border-white/10 hover:scale-105"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          {/* Banner */}
          <div
            className="h-24 sm:h-28 w-full shrink-0 relative bg-cover bg-center"
            style={
              isImageBanner
                ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: bannerStyle }
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-ez-elevated to-transparent opacity-80" />
          </div>

          {/* Profile Body */}
          <div className="px-6 pb-6 pt-0 flex-1 flex flex-col">
            <div className="flex flex-col items-center text-center -mt-12 mb-4 relative z-20">
              <div className="relative mb-2 shrink-0">
                <div className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full overflow-hidden border-4 border-ez-elevated bg-ez-surface shadow-glass shrink-0">
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                </div>
                <div
                  className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-ez-elevated z-30 ${
                    isBlocked
                      ? 'bg-rose-500'
                      : isUserOnline
                      ? 'bg-neon-green-glow shadow-neon-dot'
                      : 'bg-ez-muted'
                  }`}
                  title={isBlocked ? 'Blocked' : isUserOnline ? 'Online' : 'Offline'}
                />
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{user.name || user.handle}</h3>
              <p className="text-xs font-mono font-bold text-neon-green mt-0.5">{user.handle}</p>

              <span
                className={`text-[11px] font-mono mt-1 ${
                  isBlocked
                    ? 'text-rose-400 font-semibold'
                    : isUserOnline
                    ? 'text-neon-green font-medium'
                    : 'text-ez-muted'
                }`}
              >
                {isBlocked ? 'blocked' : isUserOnline ? 'online' : 'offline'}
              </span>

              {user.bio && (
                <p className="text-xs text-gray-300 mt-2 px-3 py-1.5 bg-white/5 rounded-xl border border-ez-border/50 max-w-xs leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={onStartCall}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-ez-surface hover:bg-ez-hover border border-ez-border/50 hover:border-neon-green/30 transition-colors duration-150 cursor-pointer"
              >
                <Phone className="w-5 h-5 text-neon-green mb-1" />
                <span className="text-[11px] font-semibold text-gray-200">Call</span>
              </button>

              <button
                type="button"
                onClick={onToggleNotifications}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors duration-150 cursor-pointer ${isMuted
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  : 'bg-ez-surface hover:bg-ez-hover border-ez-border/50 text-gray-200'
                  }`}
              >
                {isMuted ? <BellOff className="w-5 h-5 mb-1" /> : <Bell className="w-5 h-5 text-neon-green mb-1" />}
                <span className="text-[11px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportChat}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-ez-surface hover:bg-ez-hover border border-ez-border/50 hover:border-neon-green/30 transition-colors duration-150 cursor-pointer"
                title="Export Chat History"
              >
                <Download className="w-5 h-5 text-neon-green mb-1" />
                <span className="text-[11px] font-semibold text-gray-200">Export</span>
              </button>
            </div>

            {/* Shared Media */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ez-muted uppercase tracking-wider">Shared Media</span>
                <span className="text-[10px] font-mono text-ez-muted">{sharedAttachments.length} items</span>
              </div>

              {sharedAttachments.length === 0 ? (
                <div className="p-3 bg-ez-surface rounded-xl text-center text-xs text-ez-muted border border-ez-border/30">
                  No photos or files shared yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {sharedAttachments.slice(0, 8).map((att, idx) => (
                    <div
                      key={idx}
                      onClick={() => att.type === 'image' && setPreviewAttachment(att)}
                      className="h-16 rounded-xl overflow-hidden bg-black/30 border border-ez-border/30 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-150"
                    >
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-neon-green" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Actions */}
            <div className="space-y-2 pt-2 border-t border-ez-border/50">
              {onToggleBlock && (
                <button
                  type="button"
                  onClick={onToggleBlock}
                  className={`w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer ${isBlocked
                    ? 'bg-neon-green/10 text-neon-green border border-neon-green/25'
                    : 'bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/25'
                    }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
              )}

              {isFriend ? (
                onRemoveFriend && (
                  <button
                    type="button"
                    onClick={onRemoveFriend}
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-rose-400 text-xs font-bold border border-transparent hover:border-rose-500/25 transition-colors duration-150 cursor-pointer"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Remove from Friends</span>
                  </button>
                )
              ) : (
                onAddFriend && (
                  <button
                    type="button"
                    onClick={onAddFriend}
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-bold shadow-neon-sm transition-colors duration-150 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add to Friends</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Lightbox Modal */}
        {previewAttachment && (
          <div
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewAttachment(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-ez-border"
              />
              <div className="mt-3 flex items-center space-x-3 bg-ez-surface/90 px-4 py-2 rounded-xl border border-ez-border/50">
                <span className="text-xs font-medium text-white truncate max-w-xs">{previewAttachment.name}</span>
                <button
                  type="button"
                  onClick={() => handleDirectDownload(previewAttachment.url, previewAttachment.name)}
                  className="flex items-center space-x-1 text-xs text-neon-green font-bold hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};