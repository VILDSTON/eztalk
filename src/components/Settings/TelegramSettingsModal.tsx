import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Check,
  Bell,
  Volume2,
  Shield,
  Palette,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { User } from '../../types/chat';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onSaveProfile: (updated: User) => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'privacy'>('profile');

  // Profile Form state
  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0]);
  const [status, setStatus] = useState<User['status']>(currentUser.status || 'Online');
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '🚀');

  // Notifications State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Appearance
  const [chatTheme, setChatTheme] = useState<'emerald' | 'cyan' | 'purple'>('emerald');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updated: User = {
      ...currentUser,
      name: name.trim() || currentUser.handle,
      bio: bio.trim(),
      avatar,
      status,
      statusEmoji,
    };
    onSaveProfile(updated);
    onClose();
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 glass-overlay animate-fade-in" />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-ez-elevated border border-ez-border rounded-3xl shadow-glass-lg overflow-hidden z-10 flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ez-border/50 bg-ez-surface">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-ez-border/50 bg-ez-surface/80 overflow-x-auto custom-scrollbar">
          {(
            [
              { id: 'profile', label: 'My Profile', icon: UserIcon },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'appearance', label: 'Appearance', icon: Palette },
              { id: 'privacy', label: 'Privacy', icon: Shield },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 flex items-center space-x-2 text-xs font-semibold border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-neon-green text-neon-green'
                    : 'border-transparent text-ez-muted hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* TAB 1: Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Avatar Picker */}
              <div className="flex items-center space-x-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-neon-green shadow-neon-md bg-ez-surface">
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-150">
                    <Camera className="w-6 h-6 text-neon-green" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block truncate">{currentUser.handle}</span>
                  <p className="text-xs text-ez-muted mt-0.5">Click photo to upload custom avatar</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Preset Avatars */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-2">
                  Preset Avatars
                </label>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((avUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(avUrl)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-transform duration-150 shrink-0 cursor-pointer ${
                        avatar === avUrl ? 'border-neon-green scale-110 shadow-neon-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={avUrl} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-ez-hover border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors duration-150"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Hey there! I am using EzTalk."
                  className="w-full bg-ez-hover border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2 text-sm text-white outline-none resize-none transition-colors duration-150"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-ez-hover rounded-2xl border border-ez-border/50">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-neon-green" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Audio Chimes</h4>
                    <p className="text-xs text-ez-muted">Play sound effect on incoming messages</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    soundEnabled ? 'bg-neon-green' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      soundEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-ez-hover rounded-2xl border border-ez-border/50">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-neon-green" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Desktop Notifications</h4>
                    <p className="text-xs text-ez-muted">Receive popup alerts in background</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer ${
                    notificationsEnabled
                      ? 'bg-neon-green/15 text-neon-green border border-neon-green/30'
                      : 'bg-neon-green text-black shadow-neon-sm'
                  }`}
                >
                  {notificationsEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-2">
                  Theme Accent
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setChatTheme('emerald')}
                    className={`p-3 rounded-2xl border flex flex-col items-center space-y-1.5 transition-colors duration-150 cursor-pointer ${
                      chatTheme === 'emerald'
                        ? 'border-neon-green bg-neon-green/10 text-white'
                        : 'border-ez-border bg-white/5 text-ez-muted hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-neon-green shadow-neon-dot" />
                    <span className="text-xs font-bold">Neon Green</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatTheme('cyan')}
                    className={`p-3 rounded-2xl border flex flex-col items-center space-y-1.5 transition-colors duration-150 cursor-pointer ${
                      chatTheme === 'cyan'
                        ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-white'
                        : 'border-ez-border bg-white/5 text-ez-muted hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
                    <span className="text-xs font-bold">Cyber Blue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatTheme('purple')}
                    className={`p-3 rounded-2xl border flex flex-col items-center space-y-1.5 transition-colors duration-150 cursor-pointer ${
                      chatTheme === 'purple'
                        ? 'border-[#c084fc] bg-[#c084fc]/10 text-white'
                        : 'border-ez-border bg-white/5 text-ez-muted hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#c084fc] shadow-[0_0_8px_#c084fc]" />
                    <span className="text-xs font-bold">Purple Night</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-ez-hover rounded-2xl border border-ez-border/50">
                <h4 className="text-sm font-bold text-white mb-1">Chat Wallpaper</h4>
                <p className="text-xs text-ez-muted">
                  Subtle geometric pattern with dark background is active across all chats.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Privacy & Security */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 bg-ez-hover rounded-2xl border border-ez-border/50">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="w-5 h-5 text-neon-green" />
                  <h4 className="text-sm font-bold text-white">Active Session</h4>
                </div>
                <p className="text-xs text-ez-muted">
                  Logged in as <strong className="text-white font-mono">{currentUser.handle}</strong>.
                </p>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 rounded-2xl text-rose-400 text-xs font-bold transition-colors duration-150 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Current Session</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-ez-border/50 bg-ez-surface flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-ez-muted hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-bold shadow-neon-sm transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
