import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Check, AlertCircle, Globe, Palette, Upload } from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface EditProfileModalProps {
  currentUser: User;
  existingUsers?: User[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

const PRESET_BANNERS = [
  'linear-gradient(135deg, #0B0E14 0%, #1A1F2C 50%, #12161F 100%)',
  'linear-gradient(135deg, #05140b 0%, #004d25 50%, #10B981 100%)',
  'linear-gradient(135deg, #1f102e 0%, #4a154b 50%, #a855f7 100%)',
  'linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #2b0b14 0%, #631226 50%, #f43f5e 100%)',
];

const STATUS_EMOJIS = ['🚀', '💻', '🎧', '☕', '⚡', '🌙', '🔥', '🎮', '💡'];

const ACCENT_COLORS = [
  { name: 'Neon Green', hex: '#10B981' },
  { name: 'Cyber Purple', hex: '#a855f7' },
  { name: 'Electric Blue', hex: '#3b82f6' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Ruby Pink', hex: '#f43f5e' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUser,
  existingUsers = [],
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [handle, setHandle] = useState(currentUser.handle.replace('@', ''));
  const [bio, setBio] = useState(currentUser.bio || '');
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '🚀');
  const [customStatusText, setCustomStatusText] = useState(currentUser.customStatusText || '');
  const [banner, setBanner] = useState(currentUser.banner || PRESET_BANNERS[0]);
  const [accentColor, setAccentColor] = useState(currentUser.accentColor || '#10B981');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setHandle(currentUser.handle.replace('@', ''));
      setBio(currentUser.bio || '');
      setStatusEmoji(currentUser.statusEmoji || '🚀');
      setCustomStatusText(currentUser.customStatusText || '');
      setBanner(currentUser.banner || PRESET_BANNERS[0]);
      setAccentColor(currentUser.accentColor || '#10B981');
      setWebsite(currentUser.website || '');
      setAvatar(currentUser.avatar);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const formattedHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
  const cleanInputHandle = normalizeHandle(formattedHandle).toLowerCase();
  const myCurrentHandle = normalizeHandle(currentUser.handle).toLowerCase();

  const isHandleTaken =
    cleanInputHandle !== myCurrentHandle &&
    existingUsers.some(
      (u) =>
        u.id !== currentUser.id &&
        normalizeHandle(u.handle).toLowerCase() !== myCurrentHandle &&
        normalizeHandle(u.handle).toLowerCase() === cleanInputHandle
    );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHandleTaken) return;

    const updated: User = {
      ...currentUser,
      name: name.trim() || 'User',
      handle: formattedHandle || currentUser.handle,
      bio: bio.trim(),
      status: currentUser.status,
      statusEmoji,
      customStatusText: customStatusText.trim(),
      banner,
      accentColor,
      website: website.trim(),
      avatar,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center glass-overlay animate-fade-in select-none p-0 sm:p-4">
      <div className="bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-lg shadow-none sm:shadow-glass-lg relative overflow-hidden flex flex-col sm:max-h-[90vh]">
        {/* Hidden File Input for Avatar */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Modal Top Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-ez-border/50 flex items-center justify-between shrink-0 bg-ez-surface">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Customize Profile</h3>
            <p className="text-[11px] text-ez-muted">Personalize your avatar, banner, and presence</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ez-muted hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Scroll */}
        <form onSubmit={handleSave} className="overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
          {/* Banner & Avatar Preview Card */}
          <div className="rounded-2xl border border-ez-border overflow-hidden bg-ez-base">
            {/* Banner Header */}
            <div className="h-24 w-full relative flex items-end justify-between p-2.5" style={{ background: banner }}>
              <span className="text-[10px] font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                Profile Banner
              </span>
              <div className="flex items-center space-x-1.5 bg-black/50 backdrop-blur-sm p-1 rounded-xl">
                {PRESET_BANNERS.map((grad, i) => (
                  <div
                    key={i}
                    onClick={() => setBanner(grad)}
                    className={`w-4 h-4 rounded-full cursor-pointer border transition-transform duration-150 ${
                      banner === grad ? 'scale-125 border-white shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: grad }}
                    title="Change banner theme"
                  />
                ))}
              </div>
            </div>

            {/* Avatar & Upload Row */}
            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ez-base">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="relative group shrink-0">
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden border-2 border-neon-green bg-ez-surface shadow-neon-sm shrink-0"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer text-white"
                    title="Upload photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{name || 'Your Name'}</h4>
                  <p className="text-xs font-mono text-neon-green truncate">{formattedHandle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-ez-hover hover:bg-ez-border text-gray-200 hover:text-white text-xs font-semibold rounded-xl border border-ez-border transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-neon-green" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>

          {/* Taken Handle Warning */}
          {isHandleTaken && (
            <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/25 p-2.5 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Username {formattedHandle} is already in use by another member.</span>
            </div>
          )}

          {/* Name & Handle Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Display Name (No Emojis)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
                  setName(clean);
                }}
                placeholder="Your Name"
                className="w-full bg-ez-input border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Handle
              </label>
              <div className="relative flex items-center">
                <span className="text-ez-muted absolute left-3 text-sm font-semibold">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className={`w-full bg-ez-input border rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150 ${
                    isHandleTaken ? 'border-red-500 text-red-400' : 'border-ez-border focus:border-neon-green'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Status Emoji Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Status Mood Emoji
            </label>
            <div className="flex items-center space-x-1.5 bg-ez-input border border-ez-border rounded-xl p-1.5">
              {STATUS_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setStatusEmoji(emoji)}
                  className={`flex-1 py-1.5 rounded-lg text-base hover:scale-110 transition-transform duration-100 ${
                    statusEmoji === emoji ? 'bg-white/15 shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Status Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Custom Status Message
            </label>
            <input
              type="text"
              value={customStatusText}
              onChange={(e) => setCustomStatusText(e.target.value)}
              placeholder="e.g. 🚀 Building the future of messaging"
              className="w-full bg-ez-input border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
            />
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-neon-green" />
              <span>Profile Accent Theme</span>
            </label>
            <div className="flex items-center space-x-3 bg-ez-input border border-ez-border p-2 rounded-xl">
              {ACCENT_COLORS.map((col) => (
                <div
                  key={col.hex}
                  onClick={() => setAccentColor(col.hex)}
                  className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-transform duration-150 flex items-center justify-center ${
                    accentColor === col.hex ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {accentColor === col.hex && <Check className="w-3 h-3 text-black stroke-[3]" />}
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Bio / About Me
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends about yourself..."
              className="w-full bg-ez-input border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2 text-sm text-white placeholder-ez-muted outline-none resize-none transition-colors duration-150"
            />
          </div>

          {/* Website / Links */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-ez-muted" />
              <span>Website / Social Link</span>
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://github.com/yourname"
              className="w-full bg-ez-input border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
            />
          </div>

          {/* Preset Avatars Row */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Preset Avatars
            </label>
            <div className="flex items-center space-x-2">
              {PRESET_AVATARS.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setAvatar(url)}
                  className={`relative w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 transition-transform duration-150 ${
                    avatar === url ? 'border-neon-green scale-110 shadow-neon-sm' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="Preset" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-ez-border/50 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-ez-hover hover:bg-ez-border text-gray-300 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isHandleTaken}
              className="flex-1 px-4 py-2.5 bg-neon-green hover:bg-neon-green-light text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
