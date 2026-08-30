import React, { useState, useRef, useEffect } from 'react';
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
  HardDrive,
  Sparkles,
  Sliders,
  CheckCircle2,
  Trash2,
  Play,
  Radio,
  Lock,
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
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

const PRESET_BANNERS = [
  { id: 'dark', label: 'Obsidian Night', gradient: 'linear-gradient(135deg, #0B0E14 0%, #1A1F2C 50%, #12161F 100%)' },
  { id: 'green', label: 'Neon Cyber', gradient: 'linear-gradient(135deg, #05140b 0%, #004d25 50%, #00ff73 100%)' },
  { id: 'purple', label: 'Deep Cosmos', gradient: 'linear-gradient(135deg, #1f102e 0%, #4a154b 50%, #a855f7 100%)' },
  { id: 'blue', label: 'Ocean Matrix', gradient: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #38bdf8 100%)' },
];

const STATUS_EMOJIS = ['🚀', '⚡', '💻', '🎧', '☕', '🔥', '🌙', '🎮', '💡', '✨'];

const THEME_ACCENTS = [
  { id: 'neon', name: 'Neon Green', color: '#00ff73', glow: 'shadow-[0_0_12px_rgba(0,255,115,0.4)]' },
  { id: 'cyan', name: 'Cyber Blue', color: '#38bdf8', glow: 'shadow-[0_0_12px_rgba(56,189,248,0.4)]' },
  { id: 'purple', name: 'Purple Night', color: '#c084fc', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.4)]' },
  { id: 'amber', name: 'Sunset Amber', color: '#fbbf24', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.4)]' },
  { id: 'rose', name: 'Ruby Glow', color: '#fb7185', glow: 'shadow-[0_0_12px_rgba(251,113,133,0.4)]' },
];

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'storage';

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile Form state
  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0]);
  const [banner, setBanner] = useState(currentUser.banner || PRESET_BANNERS[0].gradient);
  const [status, setStatus] = useState<User['status']>(currentUser.status || 'Online');
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '🚀');
  const [customStatusText, setCustomStatusText] = useState(currentUser.customStatusText || '');

  // Notifications State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [callRingtoneEnabled, setCallRingtoneEnabled] = useState(true);

  // Appearance
  const [selectedAccent, setSelectedAccent] = useState('neon');
  const [compactMode, setCompactMode] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);

  // Storage & Cache
  const [cacheCleared, setCacheCleared] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || PRESET_AVATARS[0]);
      setBanner(currentUser.banner || PRESET_BANNERS[0].gradient);
      setStatus(currentUser.status || 'Online');
      setStatusEmoji(currentUser.statusEmoji || '🚀');
      setCustomStatusText(currentUser.customStatusText || '');
      setSavedSuccess(false);
    }
  }, [isOpen, currentUser]);

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
    const selectedColor = THEME_ACCENTS.find((a) => a.id === selectedAccent)?.color || '#00ff73';
    const updated: User = {
      ...currentUser,
      name: name.trim() || currentUser.handle,
      bio: bio.trim(),
      avatar,
      banner,
      status,
      statusEmoji,
      customStatusText: customStatusText.trim(),
      accentColor: selectedColor,
      soundNotifications: soundEnabled,
      theme: selectedAccent,
    };
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const playTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // ignore
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const TABS = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'storage' as const, label: 'Storage', icon: HardDrive },
  ];

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 md:p-6 select-none font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fade-in transition-opacity duration-200"
      />

      {/* Settings Window Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-ez-surface/95 border-0 sm:border border-ez-border/80 rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col animate-scale-up backdrop-blur-2xl"
      >
        {/* ─── Window Header (Titlebar) ─── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-ez-border/50 bg-ez-elevated/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/25">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">Settings & Preferences</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Horizontal Sidebar / Tab Bar ─── */}
        <div className="border-b border-ez-border/50 bg-ez-elevated/40 px-4 sm:px-6 py-2 sm:py-2.5 shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-colors duration-150 cursor-pointer whitespace-nowrap text-xs ${
                    isActive
                      ? 'bg-neon-green text-black font-extrabold shadow-neon-sm'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-ez-muted'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Window Content Body ─── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* TAB 1: Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-5 sm:space-y-6 animate-fade-in">
              {/* Profile Card Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-ez-border shadow-glass bg-ez-elevated">
                {/* Banner Preview */}
                <div
                  className="h-20 sm:h-24 w-full transition-all duration-200 relative"
                  style={{ background: banner }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-ez-elevated via-transparent to-transparent opacity-80" />
                </div>

                <div className="px-4 sm:px-5 pb-4 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-8 sm:-mt-10">
                  <div className="flex items-end space-x-3 min-w-0">
                    <div
                      className="relative group cursor-pointer shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-ez-elevated shadow-glass bg-ez-surface">
                        <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-neon-green transition-opacity duration-150">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div
                        className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-ez-elevated z-10 ${
                          status === 'Online'
                            ? 'bg-neon-green shadow-neon-dot'
                            : status === 'Away'
                            ? 'bg-amber-400'
                            : status === 'Busy'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div className="mb-0.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">{name || currentUser.handle}</h3>
                        <span className="text-sm shrink-0">{statusEmoji}</span>
                      </div>
                      <p className="text-xs text-neon-green font-mono truncate">{currentUser.handle}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-colors duration-150 cursor-pointer flex items-center space-x-1.5 shrink-0 border border-white/10"
                  >
                    <Camera className="w-3.5 h-3.5 text-neon-green" />
                    <span>Upload Photo</span>
                  </button>
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
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1">
                  Choose from Curated Avatars
                </label>
                <div className="flex items-center space-x-3 overflow-x-auto py-2.5 px-1 custom-scrollbar">
                  {PRESET_AVATARS.map((avUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(avUrl)}
                      className={`relative w-12 h-12 rounded-full shrink-0 transition-all duration-150 cursor-pointer ${
                        avatar === avUrl ? 'scale-105' : 'opacity-65 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={avUrl}
                        alt="preset"
                        className={`w-full h-full rounded-full object-cover border-2 ${
                          avatar === avUrl ? 'border-neon-green shadow-neon-sm' : 'border-ez-border'
                        }`}
                      />
                      {avatar === avUrl && (
                        <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-neon-green text-black flex items-center justify-center shadow-sm border-2 border-ez-surface">
                          <Check className="w-2.5 h-2.5 font-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Banners */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                  Profile Banner Gradient
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
                  {PRESET_BANNERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBanner(b.gradient)}
                      className={`p-2 rounded-2xl border flex flex-col items-start space-y-1.5 transition-all duration-150 cursor-pointer ${
                        banner === b.gradient
                          ? 'border-neon-green bg-neon-green/10 shadow-neon-sm'
                          : 'border-ez-border bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="w-full h-6 rounded-lg" style={{ background: b.gradient }} />
                      <span className="text-[11px] font-bold text-gray-200 truncate">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Custom Status Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Display Name"
                    className="w-full bg-ez-elevated border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                    Status Tagline
                  </label>
                  <input
                    type="text"
                    value={customStatusText}
                    onChange={(e) => setCustomStatusText(e.target.value)}
                    placeholder="e.g. Building cool apps"
                    className="w-full bg-ez-elevated border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors duration-150"
                  />
                </div>
              </div>

              {/* Status Emoji Picker */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1">
                  Status Emoji Icon
                </label>
                <div className="flex items-center space-x-2.5 overflow-x-auto py-2.5 px-1.5 custom-scrollbar">
                  {STATUS_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setStatusEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl text-lg shrink-0 flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        statusEmoji === emoji
                          ? 'bg-neon-green/20 border-2 border-neon-green scale-105 shadow-neon-sm'
                          : 'bg-white/5 border border-ez-border/60 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1.5">
                  About / Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a little bit about yourself..."
                  className="w-full bg-ez-elevated border border-ez-border focus:border-neon-green rounded-xl px-3.5 py-2.5 text-xs text-white outline-none resize-none transition-colors duration-150"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-neon-green/10 text-neon-green">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Audible Notification Chimes</h4>
                    <p className="text-xs text-ez-muted">Play a signature sound chime when messages arrive</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={playTestChime}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neon-green font-bold transition-colors duration-150 cursor-pointer flex items-center space-x-1"
                    title="Preview Chime"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
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
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-neon-green/10 text-neon-green">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Browser Desktop Notifications</h4>
                    <p className="text-xs text-ez-muted">Display system toasts when EzTalk is in the background</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer ${
                    notificationsEnabled
                      ? 'bg-neon-green/15 text-neon-green border border-neon-green/30'
                      : 'bg-neon-green text-black shadow-neon-sm'
                  }`}
                >
                  {notificationsEnabled ? 'Active' : 'Enable'}
                </button>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-neon-green/10 text-neon-green">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">In-App Floating Toasts</h4>
                    <p className="text-xs text-ez-muted">Show banner alert at top of screen for incoming chats</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewEnabled(!previewEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    previewEnabled ? 'bg-neon-green' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      previewEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-neon-green/10 text-neon-green">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Call Ringtones & Vibrations</h4>
                    <p className="text-xs text-ez-muted">Play acoustic ringers for incoming audio/video calls</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCallRingtoneEnabled(!callRingtoneEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    callRingtoneEnabled ? 'bg-neon-green' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      callRingtoneEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-2.5">
                  Vibrant Accent Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {THEME_ACCENTS.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setSelectedAccent(th.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center space-y-2 transition-all duration-150 cursor-pointer ${
                        selectedAccent === th.id
                          ? 'border-white/40 bg-white/10 shadow-glass'
                          : 'border-ez-border bg-ez-elevated hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full ${th.glow}`} style={{ backgroundColor: th.color }} />
                      <span className="text-xs font-bold text-white truncate">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Press Enter to Send</h4>
                  <p className="text-xs text-ez-muted">Send message with Enter key, Shift+Enter for new line</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnterToSend(!enterToSend)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    enterToSend ? 'bg-neon-green' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      enterToSend ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Compact Density Mode</h4>
                  <p className="text-xs text-ez-muted">Tighten padding and avatars for high-density chat browsing</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompactMode(!compactMode)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    compactMode ? 'bg-neon-green' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      compactMode ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Privacy & Security */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="w-5 h-5 text-neon-green" />
                  <h4 className="text-sm font-bold text-white">Session & Identity Encryption</h4>
                </div>
                <p className="text-xs text-ez-muted leading-relaxed">
                  You are authenticated securely as <strong className="text-white font-mono">{currentUser.handle}</strong>.
                  All WebRTC live peer connections are end-to-end negotiated.
                </p>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-neon-green" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Direct Message Privacy</h4>
                    <p className="text-xs text-ez-muted">Allow incoming direct chats from any username</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-neon-green bg-neon-green/10 px-2.5 py-1 rounded-xl">
                  Public
                </span>
              </div>

              {onLogout && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-extrabold transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out of EzTalk Session</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Storage & Cache */}
          {activeTab === 'storage' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <HardDrive className="w-5 h-5 text-neon-green" />
                    <h4 className="text-sm font-bold text-white">Local Storage & Media Cache</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-neon-green">Healthy</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-neon-green to-emerald-400 h-full w-[28%] rounded-full shadow-neon-dot" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-ez-muted mt-2">
                  <span>Used: ~2.4 MB</span>
                  <span>Available: Unlimited Web Storage</span>
                </div>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Purge Temporary Media Cache</h4>
                  <p className="text-xs text-ez-muted">Free up memory by purging temporary voice and image blobs</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                    cacheCleared
                      ? 'bg-neon-green text-black shadow-neon-sm'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {cacheCleared ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Purged!</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-neon-green" />
                      <span>Clear Cache</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Window Footer Actions ─── */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-ez-border/50 bg-ez-elevated/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-ez-muted flex items-center space-x-1.5">
            {savedSuccess && (
              <span className="text-neon-green flex items-center space-x-1 font-bold animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-ez-muted hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 sm:px-5 py-2 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold shadow-neon-sm transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

