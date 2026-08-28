import React, { useState } from 'react';
import { X, Phone, MessageSquare, Bell, BellOff, FileText, Globe, UserMinus, UserPlus, ExternalLink } from 'lucide-react';
import { User, Message, Attachment } from '../../types/chat';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  messages?: Message[];
  onClose: () => void;
  onStartCall: () => void;
  onToggleNotifications: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  isMuted = false,
  isFriend = true,
  messages = [],
  onClose,
  onStartCall,
  onToggleNotifications,
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
  const accentColor = user.accentColor || '#00ff73';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in select-none p-4">
      <div className="bg-[#15161b] border border-[#2b2d36] rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-xl bg-black/50 hover:bg-black/70 transition-colors z-30 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container with Banner and Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          {/* Top Banner Header */}
          <div className="h-28 w-full shrink-0 relative" style={{ background: bannerStyle }} />

          {/* Profile Card Body */}
          <div className="px-6 pb-6 pt-0 flex-1 flex flex-col">
            {/* Avatar & Identity Header */}
            <div className="flex flex-col items-center text-center -mt-12 mb-4 relative z-20">
              <div className="relative mb-2 shrink-0">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#15161b] bg-[#1d1f27] shadow-xl shrink-0"
                  style={{ width: '80px', height: '80px' }}
                >
                  <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                </div>

                {/* Dynamic Status Dot Indicator on Avatar */}
                <div
                  className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#15161b] z-30 ${
                    user.status === 'Online'
                      ? 'bg-[#00ff73] shadow-[0_0_8px_#00ff73]'
                      : user.status === 'Away'
                      ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                      : user.status === 'Busy'
                      ? 'bg-red-400 shadow-[0_0_8px_#f87171]'
                      : 'bg-gray-400 shadow-[0_0_6px_rgba(156,163,175,0.5)]'
                  }`}
                  title={user.status}
                />
              </div>

              {/* Name & Status Emoji */}
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">{user.name || user.handle}</h3>
                {user.statusEmoji && <span className="text-base">{user.statusEmoji}</span>}
              </div>

              {/* Handle */}
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: accentColor }}>
                {user.handle}
              </p>

              {/* Custom Status Message if present */}
              {user.customStatusText && (
                <p className="text-xs text-gray-300 italic mt-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 max-w-xs truncate">
                  {user.customStatusText}
                </p>
              )}

              {/* Prominent Website / Social Link if present */}
              {user.website && (
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1b1e26] border border-[#2d313e] hover:border-[#00ff73] text-xs font-medium text-[#00ff73] transition-colors shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{user.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              )}
            </div>

            {/* Quick Actions Row: Voice Call, Message, and Notifications */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => {
                  onClose();
                  onStartCall();
                }}
                className="py-2.5 text-black font-bold text-xs rounded-xl shadow-neon-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </button>

              <button
                onClick={onClose}
                className="py-2.5 bg-[#23252d] hover:bg-[#2c2f3a] text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#00ff73]" />
                <span>Message</span>
              </button>

              <button
                onClick={onToggleNotifications}
                className={`py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                    : 'bg-[#23252d] hover:bg-[#2c2f3a] text-gray-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
              >
                {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5 text-[#00ff73]" />}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>
            </div>

            {/* Bio & Details Section */}
            <div className="space-y-3 bg-[#111216] p-4 rounded-2xl border border-[#252731] text-xs">
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">About</span>
                <p className="text-gray-200 leading-relaxed">{user.bio || 'Hey there! I am using EzTalk.'}</p>
              </div>
            </div>

            {/* Shared Media Section */}
            {sharedAttachments.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-bold text-gray-300 block mb-2 px-1">
                  Shared Files & Media ({sharedAttachments.length})
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {sharedAttachments.slice(0, 8).map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setPreviewAttachment(att)}
                      className="h-16 rounded-xl overflow-hidden bg-[#1f2129] border border-[#2d303b] hover:border-[#00ff73] cursor-pointer flex items-center justify-center transition-all group relative"
                    >
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#00ff73]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend Status Action Button (Add to Friends or Remove from Friends) */}
            {isFriend ? (
              onRemoveFriend && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveFriend();
                    onClose();
                  }}
                  className="w-full mt-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>Remove from Friends</span>
                </button>
              )
            ) : (
              onAddFriend && (
                <button
                  type="button"
                  onClick={() => {
                    onAddFriend();
                    onClose();
                  }}
                  className="w-full mt-4 py-2.5 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-xs rounded-xl shadow-neon-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add to Friends</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Shared Attachment Lightbox */}
      {previewAttachment && (
        <div
          onClick={() => setPreviewAttachment(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="relative max-w-xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            {previewAttachment.type === 'image' ? (
              <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-[75vh] max-w-full rounded-2xl object-contain" />
            ) : (
              <div className="bg-[#1b1d24] p-6 rounded-2xl border border-gray-700 text-white flex flex-col items-center">
                <FileText className="w-12 h-12 text-[#00ff73] mb-2" />
                <p className="text-sm font-bold">{previewAttachment.name}</p>
                <a href={previewAttachment.url} download={previewAttachment.name} className="mt-3 px-4 py-2 bg-[#00ff73] text-black font-bold text-xs rounded-xl">Download File</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
