import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Bell,
  BellOff,
  FileText,
  Globe,
  UserMinus,
  UserPlus,
  ExternalLink,
  Download,
  Ban,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { User, Message, Attachment } from '../../types/chat';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
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

  if (!isOpen) return null;

  // Extract shared media & files from actual conversation messages
  const sharedAttachments: Attachment[] = messages
    .filter((m) => m.attachment)
    .map((m) => m.attachment as Attachment);

  const bannerStyle = user.banner || 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in select-none p-4 font-sans">
      <div className="bg-[#15161b] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-30 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container with Banner and Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          {/* Top Banner Header */}
          <div
            className="h-28 w-full shrink-0 relative bg-cover bg-center"
            style={
              isImageBanner
                ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: bannerStyle }
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#15161b] to-transparent opacity-80" />
          </div>

          {/* Profile Card Body */}
          <div className="px-6 pb-6 pt-0 flex-1 flex flex-col">
            {/* Avatar & Identity Header */}
            <div className="flex flex-col items-center text-center -mt-12 mb-4 relative z-20">
              <div className="relative mb-2 shrink-0">
                <div className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full overflow-hidden border-4 border-[#15161b] bg-[#1d1f27] shadow-xl shrink-0">
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                </div>

                {/* Dynamic Status Dot Indicator on Avatar */}
                <div
                  className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#15161b] z-30 ${
                    user.status === 'Online'
                      ? 'bg-[#00ff73] shadow-[0_0_8px_#00ff73]'
                      : 'bg-gray-400'
                  }`}
                  title={user.status}
                />
              </div>

              {/* Name & Status */}
              <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{user.name || user.handle}</h3>
              <p className="text-xs font-mono font-bold text-[#00ff73] mt-0.5">{user.handle}</p>

              {/* Bio */}
              {user.bio && (
                <p className="text-xs text-gray-300 mt-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 max-w-xs leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Quick Actions Row: Voice Call, Notifications, Export Chat */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={onStartCall}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1b1e26] hover:bg-[#252934] border border-white/5 hover:border-[#00ff73]/40 transition-colors cursor-pointer"
              >
                <Phone className="w-5 h-5 text-[#00ff73] mb-1" />
                <span className="text-[11px] font-semibold text-gray-200">Call</span>
              </button>

              <button
                type="button"
                onClick={onToggleNotifications}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-[#1b1e26] hover:bg-[#252934] border-white/5 text-gray-200'
                }`}
              >
                {isMuted ? <BellOff className="w-5 h-5 mb-1" /> : <Bell className="w-5 h-5 text-[#00ff73] mb-1" />}
                <span className="text-[11px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportChat}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1b1e26] hover:bg-[#252934] border border-white/5 hover:border-[#00ff73]/40 transition-colors cursor-pointer"
                title="Export Chat History"
              >
                <Download className="w-5 h-5 text-[#00ff73] mb-1" />
                <span className="text-[11px] font-semibold text-gray-200">Export</span>
              </button>
            </div>

            {/* Shared Media Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shared Media</span>
                <span className="text-[10px] font-mono text-gray-500">{sharedAttachments.length} items</span>
              </div>

              {sharedAttachments.length === 0 ? (
                <div className="p-3 bg-[#1b1e26] rounded-xl text-center text-xs text-gray-500">
                  No photos or files shared yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {sharedAttachments.slice(0, 8).map((att, idx) => (
                    <div
                      key={idx}
                      onClick={() => att.type === 'image' && setPreviewAttachment(att)}
                      className="h-16 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#00ff73]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger / Manage Section: Block & Remove Friend */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              {onToggleBlock && (
                <button
                  type="button"
                  onClick={onToggleBlock}
                  className={`w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isBlocked
                      ? 'bg-[#00ff73]/15 text-[#00ff73] border border-[#00ff73]/30'
                      : 'bg-white/5 hover:bg-rose-500/15 text-rose-400 border border-transparent hover:border-rose-500/30'
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
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/15 text-rose-400 text-xs font-bold border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
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
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-[#00ff73] hover:bg-[#1aff85] text-black text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add to Friends</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
