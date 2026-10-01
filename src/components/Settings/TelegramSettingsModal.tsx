import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Check,
  Bell,
  Volume2,
  Shield,
  ShieldCheck,
  Palette,
  User as UserIcon,
  LogOut,
  Sparkles,
  Sliders,
  CheckCircle2,
  Trash2,
  Play,
  Radio,
  Lock,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  QrCode,
  Laptop,
  Monitor,
  Smartphone,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { User, UserSession } from '../../types/chat';
import { THEME_OPTIONS, THEME_NAMES, WALLPAPER_PRESETS, applyTheme, applyCompactMode, applyChatWallpaper } from '../../utils/theme';
import { compressImage } from '../../utils/imageCompressor';
import { playMessageChime } from '../../utils/callSounds';
import { sanitizeDisplayName } from '../../utils/chatStorage';
import { ApiService } from '../../services/api';
import { QRScannerModal } from './QRScannerModal';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onSaveProfile: (updated: User) => void;
  onLogout?: () => void;
}

import { PRESET_AVATARS } from '../../constants/avatars';
import { useTranslation } from '../../context/LanguageContext';

const BANNER_NAMES: Record<string, { en: string; ru: string; uz: string }> = {
  dark: { en: 'Obsidian Night', ru: 'Обсидиановая ночь', uz: 'Obsidian kechasi' },
  green: { en: 'Neon Cyber', ru: 'Неон Кибер', uz: 'Neon Kiber' },
  purple: { en: 'Deep Cosmos', ru: 'Глубокий космос', uz: 'Chuqur fazo' },
  blue: { en: 'Ocean Matrix', ru: 'Океаническая матрица', uz: 'Okean matritsasi' },
  sunset: { en: 'Sunset Ember', ru: 'Закатный уголь', uz: 'Quyosh botishi' },
  rose: { en: 'Cyber Rose', ru: 'Кибер роза', uz: 'Kiber atirgul' },
  amber: { en: 'Solar Gold', ru: 'Солнечное золото', uz: 'Quyosh oltini' },
  aurora: { en: 'Northern Aurora', ru: 'Северное сияние', uz: 'Shimol yog‘dusi' },
  violet: { en: 'Electric Violet', ru: 'Электро фиолет', uz: 'Elektr binafsha' },
  midnight: { en: 'Midnight Slate', ru: 'Полночный сланец', uz: 'Yarim tun' },
  crimson: { en: 'Blood Matrix', ru: 'Алая матрица', uz: 'Qonli matritsa' },
  emerald: { en: 'Emerald Glow', ru: 'Изумрудное сияние', uz: 'Zumrad nuri' },
};

const PRESET_BANNERS = [
  { id: 'dark', label: 'Obsidian Night', gradient: 'linear-gradient(135deg, #050505 0%, #121214 50%, #0B0B0C 100%)' },
  { id: 'green', label: 'Neon Cyber', gradient: 'linear-gradient(135deg, #05140b 0%, #004d25 50%, #00ff73 100%)' },
  { id: 'purple', label: 'Deep Cosmos', gradient: 'linear-gradient(135deg, #1f102e 0%, #4a154b 50%, #a855f7 100%)' },
  { id: 'blue', label: 'Ocean Matrix', gradient: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #38bdf8 100%)' },
  { id: 'sunset', label: 'Sunset Ember', gradient: 'linear-gradient(135deg, #2b0b0b 0%, #6b1414 50%, #f97316 100%)' },
  { id: 'rose', label: 'Cyber Rose', gradient: 'linear-gradient(135deg, #2a081e 0%, #701a53 50%, #f43f5e 100%)' },
  { id: 'amber', label: 'Solar Gold', gradient: 'linear-gradient(135deg, #261905 0%, #5c3c0a 50%, #f59e0b 100%)' },
  { id: 'aurora', label: 'Northern Aurora', gradient: 'linear-gradient(135deg, #032624 0%, #075e54 50%, #14b8a6 100%)' },
  { id: 'violet', label: 'Electric Violet', gradient: 'linear-gradient(135deg, #1b0c36 0%, #431c77 50%, #8b5cf6 100%)' },
  { id: 'midnight', label: 'Midnight Slate', gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #334155 100%)' },
  { id: 'crimson', label: 'Blood Matrix', gradient: 'linear-gradient(135deg, #1c050a 0%, #500714 50%, #e11d48 100%)' },
  { id: 'emerald', label: 'Emerald Glow', gradient: 'linear-gradient(135deg, #021a11 0%, #064e3b 50%, #10b981 100%)' },
];

const STATUS_EMOJIS = ['🚀', '⚡', '💻', '🎧', '☕', '🔥', '🌙', '🎮', '💡', '✨'];

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'safety';

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile,
  onLogout,
}) => {
  const { t, language } = useTranslation();
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
  const [soundEnabled, setSoundEnabled] = useState(currentUser.settings?.soundNotifications !== false);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && currentUser.settings?.desktopNotifications !== false
  );
  const [floatingToastsEnabled, setFloatingToastsEnabled] = useState(currentUser.settings?.floatingToasts !== false);
  const [callRingtoneEnabled, setCallRingtoneEnabled] = useState(currentUser.settings?.callRingtones !== false);

  // Appearance State
  const [selectedAccent, setSelectedAccent] = useState(currentUser.theme || currentUser.settings?.theme || 'neon');
  const [compactMode, setCompactMode] = useState(Boolean(currentUser.settings?.compactMode));
  const [enterToSend, setEnterToSend] = useState(currentUser.settings?.enterToSend !== false);
  const [chatWallpaper, setChatWallpaper] = useState<string>(
    currentUser.settings?.chatWallpaper || (typeof localStorage !== 'undefined' ? localStorage.getItem('eztalk_chat_wallpaper') || 'default' : 'default')
  );
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Two-Step Verification (2FA / Cloud Password) State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(currentUser.twoFactorEnabled));
  const [twoFactorHint, setTwoFactorHint] = useState(currentUser.twoFactorHint || '');
  const [twoFactorAction, setTwoFactorAction] = useState<'none' | 'enable' | 'disable' | 'change'>('none');
  const [twoFactorPasswordInput, setTwoFactorPasswordInput] = useState('');
  const [twoFactorConfirmInput, setTwoFactorConfirmInput] = useState('');
  const [twoFactorHintInput, setTwoFactorHintInput] = useState('');
  const [twoFactorCurrentInput, setTwoFactorCurrentInput] = useState('');
  const [show2FAPassword, setShow2FAPassword] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState('');

  // Email Linking & Verification State
  const [isAccountVerified, setIsAccountVerified] = useState(Boolean(currentUser.isVerified));
  const [accountEmail, setAccountEmail] = useState(currentUser.email || '');
  const [linkEmailInput, setLinkEmailInput] = useState(currentUser.email || '');
  const [linkOtpCode, setLinkOtpCode] = useState('');
  const [linkEmailStep, setLinkEmailStep] = useState<'idle' | 'code_sent'>('idle');
  const [linkEmailLoading, setLinkEmailLoading] = useState(false);
  const [linkEmailError, setLinkEmailError] = useState('');
  const [linkEmailSuccess, setLinkEmailSuccess] = useState('');
  const [linkDevCode, setLinkDevCode] = useState<string | null>(null);

  const handleSendLinkEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkEmailError('');
    const cleanEmail = linkEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setLinkEmailError('Please enter a valid email address.');
      return;
    }
    setLinkEmailLoading(true);
    try {
      const res = await ApiService.sendVerificationCode(cleanEmail);
      if (res.devCode) {
        setLinkDevCode(res.devCode);
      }
      setLinkOtpCode('');
      setLinkEmailStep('code_sent');
    } catch (err: any) {
      setLinkEmailError(err.message || 'Failed to send verification code.');
    } finally {
      setLinkEmailLoading(false);
    }
  };

  const handleConfirmLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkEmailError('');
    const cleanCode = linkOtpCode.trim();
    if (cleanCode.length !== 6) {
      setLinkEmailError('Please enter the 6-digit confirmation code.');
      return;
    }
    setLinkEmailLoading(true);
    try {
      const cleanEmail = linkEmailInput.trim().toLowerCase();
      const res = await ApiService.linkEmail(cleanEmail, cleanCode);
      setIsAccountVerified(true);
      setAccountEmail(cleanEmail);
      setLinkEmailStep('idle');
      setLinkEmailSuccess(t.settings.emailLinkedSuccess || 'Email linked successfully! Your account is now Verified.');
      if (res && res.user) {
        onSaveProfile(res.user);
      } else {
        onSaveProfile({
          ...currentUser,
          isVerified: true,
          email: cleanEmail,
          emailVerified: true,
        });
      }
      setTimeout(() => setLinkEmailSuccess(''), 5000);
    } catch (err: any) {
      setLinkEmailError(err.message || 'Failed to verify email.');
    } finally {
      setLinkEmailLoading(false);
    }
  };

  // Devices & Active Sessions State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionError(null);
    try {
      const res = await ApiService.getSessions();
      if (Array.isArray(res)) {
        setSessions(res);
      } else if (res && (res as any).sessions) {
        setSessions((res as any).sessions);
      }
    } catch (err: any) {
      console.warn('Failed to fetch sessions:', err);
      setSessions([
        {
          sessionId: 'current',
          device: { os: 'Web Browser', browser: 'Current Device', type: 'desktop' },
          ip: 'Online',
          clientName: 'EzTalk Web',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isCurrent: true,
        },
      ]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm(t.settings.terminateConfirm)) return;
    setTerminatingSessionId(sessionId);
    try {
      await ApiService.terminateSession(sessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate session');
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const handleTerminateOtherSessions = async () => {
    if (!window.confirm(t.settings.terminateAllConfirm)) return;
    setIsTerminatingAll(true);
    try {
      await ApiService.terminateOtherSessions();
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate sessions');
    } finally {
      setIsTerminatingAll(false);
    }
  };

  const getDeviceIcon = (type?: string, os?: string) => {
    const o = (os || '').toLowerCase();
    const tp = (type || '').toLowerCase();
    if (tp === 'mobile' || o.includes('android') || o.includes('ios')) {
      return <Smartphone className="w-5 h-5 text-neon-green" />;
    }
    if (o.includes('mac') || o.includes('win') || o.includes('linux')) {
      return <Laptop className="w-5 h-5 text-neon-green" />;
    }
    return <Monitor className="w-5 h-5 text-neon-green" />;
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSecs < 60) return t.common.online || 'Active';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(sanitizeDisplayName(currentUser.name || ''));
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || PRESET_AVATARS[0]);
      setBanner(currentUser.banner || PRESET_BANNERS[0].gradient);
      setStatus(currentUser.status || 'Online');
      setStatusEmoji(currentUser.statusEmoji || '🚀');
      setCustomStatusText(currentUser.customStatusText || '');

      setSoundEnabled(currentUser.settings?.soundNotifications !== false);
      const isGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
      setDesktopNotificationsEnabled(isGranted && currentUser.settings?.desktopNotifications !== false);
      setFloatingToastsEnabled(currentUser.settings?.floatingToasts !== false);
      setCallRingtoneEnabled(currentUser.settings?.callRingtones !== false);

      const themeId = currentUser.theme || currentUser.settings?.theme || 'neon';
      setSelectedAccent(themeId);
      setCompactMode(Boolean(currentUser.settings?.compactMode));
      setEnterToSend(currentUser.settings?.enterToSend !== false);
      const wp = currentUser.settings?.chatWallpaper || (typeof localStorage !== 'undefined' ? localStorage.getItem('eztalk_chat_wallpaper') || 'default' : 'default');
      setChatWallpaper(wp);

      setTwoFactorEnabled(Boolean(currentUser.twoFactorEnabled));
      setTwoFactorHint(currentUser.twoFactorHint || '');
      setTwoFactorAction('none');
      setTwoFactorPasswordInput('');
      setTwoFactorConfirmInput('');
      setTwoFactorHintInput('');
      setTwoFactorCurrentInput('');
      setTwoFactorError('');
      setTwoFactorSuccessMsg('');

      setIsAccountVerified(Boolean(currentUser.isVerified));
      setAccountEmail(currentUser.email || '');
      setLinkEmailInput(currentUser.email || '');
      setLinkEmailStep('idle');
      setLinkEmailError('');

      setSavedSuccess(false);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isOpen && (activeTab === 'safety' || (activeTab as any) === 'privacy')) {
      fetchSessions();
    }
  }, [isOpen, activeTab, fetchSessions]);

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

  const handleSelectTheme = (themeId: string) => {
    setSelectedAccent(themeId);
    applyTheme(themeId);
    localStorage.setItem('eztalk_theme', themeId);
  };

  const handleToggleCompact = (val: boolean) => {
    setCompactMode(val);
    applyCompactMode(val);
    localStorage.setItem('eztalk_compact_mode', JSON.stringify(val));
  };

  const handleToggleEnterToSend = (val: boolean) => {
    setEnterToSend(val);
    localStorage.setItem('eztalk_enter_to_send', JSON.stringify(val));
  };

  const handleSelectWallpaper = (wpId: string) => {
    setChatWallpaper(wpId);
    applyChatWallpaper(wpId);
  };

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setWallpaperUploading(true);
      const res = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.85, format: 'image/webp' });
      setChatWallpaper(res.dataUrl);
      applyChatWallpaper(res.dataUrl);
    } catch (err) {
      console.error('Failed to compress custom wallpaper:', err);
    } finally {
      setWallpaperUploading(false);
      if (wallpaperInputRef.current) {
        wallpaperInputRef.current.value = '';
      }
    }
  };

  const handleResetWallpaper = () => {
    setChatWallpaper('default');
    applyChatWallpaper('default');
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (!twoFactorPasswordInput || twoFactorPasswordInput.length < 6) {
      setTwoFactorError(t.settings.minSixChars);
      return;
    }
    if (twoFactorPasswordInput !== twoFactorConfirmInput) {
      setTwoFactorError(t.settings.passwordsDontMatch);
      return;
    }
    setTwoFactorLoading(true);
    try {
      await ApiService.enable2FA(twoFactorPasswordInput, twoFactorHintInput.trim() || undefined);
      setTwoFactorEnabled(true);
      setTwoFactorHint(twoFactorHintInput.trim());
      setTwoFactorAction('none');
      setTwoFactorPasswordInput('');
      setTwoFactorConfirmInput('');
      setTwoFactorHintInput('');
      setTwoFactorSuccessMsg(t.settings.twoFactorEnabledSuccess);
      onSaveProfile({
        ...currentUser,
        twoFactorEnabled: true,
        twoFactorHint: twoFactorHintInput.trim() || undefined,
      });
      setTimeout(() => setTwoFactorSuccessMsg(''), 4000);
    } catch (err: any) {
      setTwoFactorError(err.message || 'Failed to enable Two-Step Verification');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (!twoFactorCurrentInput) {
      setTwoFactorError(t.settings.enterTwoFactorPass);
      return;
    }
    setTwoFactorLoading(true);
    try {
      await ApiService.disable2FA(twoFactorCurrentInput);
      setTwoFactorEnabled(false);
      setTwoFactorHint('');
      setTwoFactorAction('none');
      setTwoFactorCurrentInput('');
      setTwoFactorSuccessMsg(t.settings.twoFactorDisabledSuccess);
      onSaveProfile({
        ...currentUser,
        twoFactorEnabled: false,
        twoFactorHint: undefined,
      });
      setTimeout(() => setTwoFactorSuccessMsg(''), 4000);
    } catch (err: any) {
      setTwoFactorError(err.message || 'Failed to disable Two-Step Verification');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChange2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (!twoFactorCurrentInput) {
      setTwoFactorError(t.settings.enterTwoFactorPass);
      return;
    }
    if (!twoFactorPasswordInput || twoFactorPasswordInput.length < 6) {
      setTwoFactorError(t.settings.minSixChars);
      return;
    }
    if (twoFactorPasswordInput !== twoFactorConfirmInput) {
      setTwoFactorError(t.settings.passwordsDontMatch);
      return;
    }
    setTwoFactorLoading(true);
    try {
      await ApiService.change2FAPassword(
        twoFactorCurrentInput,
        twoFactorPasswordInput,
        twoFactorHintInput.trim() || undefined
      );
      setTwoFactorHint(twoFactorHintInput.trim());
      setTwoFactorAction('none');
      setTwoFactorCurrentInput('');
      setTwoFactorPasswordInput('');
      setTwoFactorConfirmInput('');
      setTwoFactorHintInput('');
      setTwoFactorSuccessMsg(t.settings.twoFactorChangedSuccess);
      onSaveProfile({
        ...currentUser,
        twoFactorHint: twoFactorHintInput.trim() || undefined,
      });
      setTimeout(() => setTwoFactorSuccessMsg(''), 4000);
    } catch (err: any) {
      setTwoFactorError(err.message || 'Failed to update Two-Step Verification password');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSave = () => {
    const selectedColor = THEME_OPTIONS.find((a) => a.id === selectedAccent)?.color || '#10B981';
    const cleanName = sanitizeDisplayName(name).trim();

    const updated: User = {
      ...currentUser,
      twoFactorEnabled,
      twoFactorHint: twoFactorHint || undefined,
      name: cleanName || currentUser.handle,
      bio: bio.trim(),
      avatar,
      banner,
      status,
      statusEmoji,
      customStatusText: customStatusText.trim(),
      accentColor: selectedColor,
      theme: selectedAccent,
      settings: {
        soundNotifications: soundEnabled,
        desktopNotifications: desktopNotificationsEnabled,
        floatingToasts: floatingToastsEnabled,
        callRingtones: callRingtoneEnabled,
        theme: selectedAccent,
        accentColor: selectedColor,
        enterToSend,
        compactMode,
        chatWallpaper,
      },
    };

    applyTheme(selectedAccent);
    applyCompactMode(compactMode);
    applyChatWallpaper(chatWallpaper);
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const playTestChime = () => {
    playMessageChime();
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setDesktopNotificationsEnabled(true);
        } else {
          setDesktopNotificationsEnabled(false);
        }
      } catch {
        // ignore
      }
    }
  };

  const TABS = [
    { id: 'profile' as const, label: t.settings.tabs.profile, icon: UserIcon },
    { id: 'notifications' as const, label: t.settings.tabs.notifications, icon: Bell },
    { id: 'appearance' as const, label: t.settings.tabs.appearance, icon: Palette },
    { id: 'safety' as const, label: (t.settings.tabs as any).safety || t.settings.tabs.privacy, icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 md:p-6 select-none font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 animate-fade-in transition-opacity duration-200"
      />

      {/* Settings Window Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-[620px] sm:max-h-[88vh] sm:max-w-2xl bg-ez-surface border-0 sm:border border-ez-border/80 rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col transform-gpu will-change-[transform,opacity]"
      >
        {/* ─── Window Header (Titlebar) ─── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pt-[max(12px,env(safe-area-inset-top))] border-b border-ez-border/50 bg-ez-elevated/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/25">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">{t.settings.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-ez-muted hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer"
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── Horizontal Sidebar / Tab Bar ─── */}
        <div className="border-b border-ez-border/50 bg-ez-elevated/40 px-2 sm:px-6 py-2 sm:py-2.5 shrink-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:custom-scrollbar pb-0.5 w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 rounded-xl transition-colors duration-150 cursor-pointer whitespace-nowrap text-xs select-none ${
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
                            : 'bg-ez-muted'
                        }`}
                      />
                    </div>

                    <div className="mb-0.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">{name || currentUser.handle}</h3>
                        <span className="text-sm shrink-0">{statusEmoji}</span>
                      </div>
                      <p className="text-xs text-[var(--ez-accent)] font-mono truncate">{currentUser.handle}</p>
                      <div className="mt-1">
                        {isAccountVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{t.profile?.verifiedBadge || 'Verified'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('safety')}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 hover:border-zinc-500/80 text-zinc-300 hover:text-white text-[10px] font-medium transition-all cursor-pointer group"
                            title={t.profile?.unverifiedBadge || 'Unverified — Click to verify'}
                          >
                            <Shield className="w-3 h-3 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                            <span>{t.profile?.unverifiedBadge || 'Unverified'}</span>
                            <span className="text-[9px] text-[var(--ez-accent)] underline ml-0.5 font-semibold">Verify</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-colors duration-150 cursor-pointer flex items-center space-x-1.5 shrink-0 border border-white/10"
                  >
                    <Camera className="w-3.5 h-3.5 text-neon-green" />
                    <span>{t.auth.uploadPhoto}</span>
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
                  {t.settings.curatedAvatars}
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
                  {t.settings.bannerGradient}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 py-1">
                  {PRESET_BANNERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBanner(b.gradient)}
                      title={BANNER_NAMES[b.id]?.[language as 'en' | 'ru' | 'uz'] || b.label}
                      className={`group relative h-9 rounded-xl border-2 transition-all duration-150 cursor-pointer overflow-hidden flex items-center justify-center ${
                        banner === b.gradient
                          ? 'border-neon-green scale-[1.03] shadow-neon-sm ring-1 ring-neon-green/50'
                          : 'border-white/10 hover:border-white/30 hover:scale-[1.02] opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: b.gradient }}
                    >
                      {banner === b.gradient && (
                        <div className="w-4 h-4 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-neon-green border border-neon-green/40 shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Custom Status Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block">
                      {t.profile.customNameLabel}
                    </label>
                    <span className="text-[10px] text-ez-muted font-mono">{name.length}/25</span>
                  </div>
                  <input
                    type="text"
                    maxLength={25}
                    value={name}
                    onChange={(e) => setName(sanitizeDisplayName(e.target.value))}
                    placeholder={t.auth.fullName}
                    className="w-full bg-ez-elevated border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors duration-150"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block">
                      {t.settings.statusTagline}
                    </label>
                    <span className="text-[10px] text-ez-muted font-mono">{customStatusText.length}/60</span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={customStatusText}
                    onChange={(e) => setCustomStatusText(e.target.value.slice(0, 60))}
                    placeholder={t.settings.taglinePlaceholder}
                    className="w-full bg-ez-elevated border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors duration-150"
                  />
                </div>
              </div>

              {/* Status Emoji Picker */}
              <div>
                <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block mb-1">
                  {t.settings.statusEmoji}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block">
                    {t.profile.bioAboutMe}
                  </label>
                  <span className="text-[10px] text-ez-muted font-mono">{bio.length}/140</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={140}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 140))}
                  placeholder={t.settings.bioPlaceholder}
                  className="w-full bg-ez-elevated border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none resize-none transition-colors duration-150"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
              {/* 1. Audible Chimes */}
              <div className="p-3.5 sm:p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{t.settings.audibleChimes}</h4>
                    <p className="text-[11px] sm:text-xs text-ez-muted leading-relaxed line-clamp-2 sm:line-clamp-none mt-0.5">{t.settings.audibleChimesDesc}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={playTestChime}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-neon-green/20 text-neon-green transition-colors duration-150 cursor-pointer flex items-center justify-center border border-neon-green/20 shrink-0"
                    title={t.settings.previewChime}
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-11 sm:w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer shrink-0 ${
                      soundEnabled ? 'bg-neon-green' : 'bg-ez-muted'
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

              {/* 2. In-App Floating Toasts */}
              <div className="p-3.5 sm:p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{t.settings.floatingToasts}</h4>
                    <p className="text-[11px] sm:text-xs text-ez-muted leading-relaxed line-clamp-2 sm:line-clamp-none mt-0.5">{t.settings.floatingToastsDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFloatingToastsEnabled(!floatingToastsEnabled)}
                  className={`w-11 sm:w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer shrink-0 ${
                    floatingToastsEnabled ? 'bg-neon-green' : 'bg-ez-muted'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      floatingToastsEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* 3. Desktop Notifications */}
              <div className="p-3.5 sm:p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{t.settings.desktopNotifications}</h4>
                    <p className="text-[11px] sm:text-xs text-ez-muted leading-relaxed line-clamp-2 sm:line-clamp-none mt-0.5">{t.settings.desktopNotificationsDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer shrink-0 ${
                    desktopNotificationsEnabled
                      ? 'bg-neon-green/15 text-neon-green border border-neon-green/30'
                      : 'bg-neon-green text-black shadow-neon-sm hover:scale-105'
                  }`}
                >
                  {desktopNotificationsEnabled ? t.settings.enabled : t.settings.enable}
                </button>
              </div>

              {/* 4. Call Ringtones */}
              <div className="p-3.5 sm:p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-neon-green/10 text-neon-green shrink-0">
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{t.settings.callRingtones}</h4>
                    <p className="text-[11px] sm:text-xs text-ez-muted leading-relaxed line-clamp-2 sm:line-clamp-none mt-0.5">{t.settings.callRingtonesDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCallRingtoneEnabled(!callRingtoneEnabled)}
                  className={`w-11 sm:w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer shrink-0 ${
                    callRingtoneEnabled ? 'bg-neon-green' : 'bg-ez-muted'
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
                  {t.settings.vibrantAccentTheme}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {THEME_OPTIONS.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleSelectTheme(th.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center space-y-2 transition-all duration-150 cursor-pointer ${
                        selectedAccent === th.id
                          ? 'border-white/50 bg-white/10 ring-2 ring-white/30 shadow-glass'
                          : 'border-ez-border bg-ez-elevated hover:bg-white/5'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full transition-transform duration-150" style={{ backgroundColor: th.color, boxShadow: `0 0 12px ${th.glow}70` }} />
                      <span className="text-xs font-bold text-white truncate">{THEME_NAMES[th.id]?.[language as 'en' | 'ru' | 'uz'] || th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{t.settings.enterToSend}</h4>
                  <p className="text-xs text-ez-muted">{t.settings.enterToSendDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEnterToSend(!enterToSend)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    enterToSend ? 'bg-neon-green' : 'bg-ez-muted'
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
                  <h4 className="text-sm font-bold text-white">{t.settings.compactDensity}</h4>
                  <p className="text-xs text-ez-muted">{t.settings.compactDensityDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCompact(!compactMode)}
                  className={`w-12 h-6 rounded-full transition-colors duration-150 relative cursor-pointer ${
                    compactMode ? 'bg-neon-green' : 'bg-ez-muted'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform duration-150 ${
                      compactMode ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Chat Wallpaper Customizer */}
              <div className="pt-2 border-t border-ez-border/60">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block">
                      {t.settings.chatWallpaper || 'Chat Wallpaper'}
                    </label>
                    <p className="text-xs text-ez-muted mt-0.5">
                      {t.settings.chatWallpaperDesc || 'Customize your chat background with presets or upload your own image'}
                    </p>
                  </div>
                  {chatWallpaper !== 'default' && (
                    <button
                      type="button"
                      onClick={handleResetWallpaper}
                      className="inline-flex items-center space-x-1.5 text-xs text-ez-muted hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.settings.removeCustomWallpaper || 'Reset'}</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input for Custom Wallpaper */}
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleCustomWallpaperUpload}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {WALLPAPER_PRESETS.map((wp) => {
                    const isSelected = chatWallpaper === wp.id;
                    const localizedName = wp.name[language as 'en' | 'ru' | 'uz'] || wp.name.en;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => handleSelectWallpaper(wp.id)}
                        className={`group relative p-2.5 rounded-2xl border text-left flex flex-col justify-between h-24 overflow-hidden transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-neon-green ring-2 ring-neon-green/30 shadow-glass'
                            : 'border-ez-border bg-ez-elevated hover:border-white/20'
                        }`}
                      >
                        {/* Background pattern preview */}
                        <div
                          className="absolute inset-0 bg-[#121316] opacity-90 transition-transform group-hover:scale-105 duration-300"
                          style={{
                            backgroundImage: wp.preview,
                            backgroundSize: wp.bgSize || '20px 20px',
                            backgroundPosition: 'center',
                          }}
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                        <div className="relative z-10 flex justify-end">
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-neon-green text-black flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="relative z-10">
                          <span className="text-xs font-bold text-white drop-shadow-md block truncate">
                            {localizedName}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Upload Custom Wallpaper Button */}
                  <button
                    type="button"
                    disabled={wallpaperUploading}
                    onClick={() => wallpaperInputRef.current?.click()}
                    className={`group relative p-2.5 rounded-2xl border text-left flex flex-col justify-between h-24 overflow-hidden transition-all duration-150 cursor-pointer ${
                      chatWallpaper.startsWith('data:image/') || chatWallpaper.startsWith('http')
                        ? 'border-neon-green ring-2 ring-neon-green/30 shadow-glass'
                        : 'border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/40'
                    }`}
                  >
                    {chatWallpaper.startsWith('data:image/') || chatWallpaper.startsWith('http') ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform group-hover:scale-105 duration-300"
                        style={{ backgroundImage: `url("${chatWallpaper}")` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                    <div className="relative z-10 flex justify-between items-start">
                      <div className="w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      {(chatWallpaper.startsWith('data:image/') || chatWallpaper.startsWith('http')) && (
                        <div className="w-5 h-5 rounded-full bg-neon-green text-black flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10">
                      <span className="text-xs font-bold text-white drop-shadow-md block truncate">
                        {wallpaperUploading
                          ? 'Uploading...'
                          : chatWallpaper.startsWith('data:image/') || chatWallpaper.startsWith('http')
                          ? (t.settings.chatWallpaper || 'Custom Photo')
                          : (t.settings.uploadWallpaper || 'Upload Image')}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Safety & Security */}
          {(activeTab === 'safety' || (activeTab as any) === 'privacy') && (
            <div className="space-y-4 animate-fade-in">
              {/* Email & Verification Status Card */}
              <div className="p-4 sm:p-5 bg-ez-elevated rounded-2xl border border-ez-border relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${isAccountVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                      {isAccountVerified ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <Shield className="w-5 h-5 text-zinc-400" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{t.settings.emailVerificationTitle || 'Email & Verification Status'}</span>
                      </h4>
                      <p className="text-xs text-ez-muted mt-0.5 leading-relaxed">
                        {isAccountVerified
                          ? (t.settings.verifiedAccountNotice || 'Your account is verified and fully protected.')
                          : (t.settings.unverifiedNotice || 'Your account is unverified with soft limits active. Link an email to get the Verified shield and lift all limits.')}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAccountVerified ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.profile?.verifiedBadge || 'Verified'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-zinc-400 border border-white/10">
                        <Shield className="w-3 h-3" />
                        <span>{t.profile?.unverifiedBadge || 'Unverified'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {linkEmailSuccess && (
                  <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{linkEmailSuccess}</span>
                  </div>
                )}

                {linkEmailError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{linkEmailError}</span>
                  </div>
                )}

                {/* Verified Account Email Display */}
                {isAccountVerified && accountEmail && (
                  <div className="pt-2 border-t border-ez-border/60 text-xs text-zinc-300 flex items-center space-x-2">
                    <span className="text-ez-muted font-mono">{t.auth.email}:</span>
                    <span className="font-semibold text-white">{accountEmail}</span>
                  </div>
                )}

                {/* Unverified Account Linking Flow */}
                {!isAccountVerified && (
                  <div className="pt-3 border-t border-ez-border/60">
                    {linkEmailStep === 'idle' ? (
                      <form onSubmit={handleSendLinkEmailCode} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                            {t.auth.email}
                          </label>
                          <input
                            type="email"
                            required
                            value={linkEmailInput}
                            onChange={(e) => {
                              setLinkEmailInput(e.target.value);
                              setLinkEmailError('');
                            }}
                            placeholder="you@example.com"
                            className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={linkEmailLoading || !linkEmailInput.trim()}
                          className="px-4 py-2 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 text-xs font-extrabold transition-all duration-150 cursor-pointer shadow-neon-sm active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${linkEmailLoading ? 'animate-spin' : ''}`} />
                          <span>{linkEmailLoading ? t.common.loading : (t.settings.linkEmailBtn || 'Verify Email & Upgrade')}</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleConfirmLinkEmail} className="space-y-3">
                        <div className="text-xs text-zinc-300">
                          {t.auth.verifyEmailSubtitle}{' '}
                          <strong className="text-white">{linkEmailInput}</strong>
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            autoFocus
                            value={linkOtpCode}
                            onChange={(e) => {
                              setLinkOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                              setLinkEmailError('');
                            }}
                            placeholder="••••••"
                            className="w-full bg-ez-base border border-white/15 focus:border-[var(--ez-accent)] rounded-xl py-2 px-3 text-center text-xl font-mono font-bold tracking-[0.3em] text-[var(--ez-accent)] placeholder:text-zinc-700 outline-none transition-all"
                          />
                        </div>

                        {linkDevCode && (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setLinkOtpCode(linkDevCode);
                                setLinkEmailError('');
                              }}
                              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[var(--ez-accent)]/15 border border-[var(--ez-accent)]/30 text-[var(--ez-accent)] text-xs font-mono font-semibold hover:bg-[var(--ez-accent)]/25 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Dev OTP: <strong className="underline">{linkDevCode}</strong></span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLinkEmailStep('idle');
                              setLinkEmailError('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ez-muted hover:text-white cursor-pointer transition-colors"
                          >
                            {t.common.back}
                          </button>
                          <button
                            type="submit"
                            disabled={linkEmailLoading || linkOtpCode.length !== 6}
                            className="px-4 py-1.5 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 text-xs font-extrabold cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                          >
                            {linkEmailLoading ? t.common.loading : t.common.confirm}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Two-Step Verification Card */}
              <div className="p-4 sm:p-5 bg-ez-elevated rounded-2xl border border-ez-border relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{t.settings.twoFactorTitle}</span>
                      </h4>
                      <p className="text-xs text-ez-muted mt-0.5 leading-relaxed">
                        {t.settings.twoFactorSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {twoFactorEnabled ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neon-green/10 text-neon-green border border-neon-green/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.settings.twoFactorActive}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-ez-muted border border-white/10">
                        <Lock className="w-3 h-3" />
                        <span>{t.settings.twoFactorInactive}</span>
                      </span>
                    )}
                  </div>
                </div>

                {twoFactorSuccessMsg && (
                  <div className="mb-3 p-2.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{twoFactorSuccessMsg}</span>
                  </div>
                )}

                {twoFactorError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{twoFactorError}</span>
                  </div>
                )}

                {/* Mode: None */}
                {twoFactorAction === 'none' && (
                  <div className="pt-2 border-t border-ez-border/60">
                    {twoFactorEnabled ? (
                      <div className="space-y-3">
                        {twoFactorHint && (
                          <div className="text-xs text-ez-muted bg-white/[0.03] p-2.5 rounded-xl border border-white/5 flex items-center space-x-2">
                            <Sparkles className="w-3.5 h-3.5 text-neon-green shrink-0" />
                            <span>
                              <strong className="text-zinc-300 font-semibold">{t.settings.twoFactorHint}:</strong> {twoFactorHint}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setTwoFactorAction('change');
                              setTwoFactorError('');
                              setTwoFactorCurrentInput('');
                              setTwoFactorPasswordInput('');
                              setTwoFactorConfirmInput('');
                              setTwoFactorHintInput('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer hover:border-white/20 active:scale-95"
                          >
                            {t.settings.changeTwoFactor}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTwoFactorAction('disable');
                              setTwoFactorError('');
                              setTwoFactorCurrentInput('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
                          >
                            {t.settings.disableTwoFactor}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorAction('enable');
                          setTwoFactorError('');
                          setTwoFactorPasswordInput('');
                          setTwoFactorConfirmInput('');
                          setTwoFactorHintInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 text-xs font-bold transition-all duration-150 cursor-pointer shadow-neon-sm active:scale-95 flex items-center space-x-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t.settings.enableTwoFactor}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Mode: Enable */}
                {twoFactorAction === 'enable' && (
                  <form onSubmit={handleEnable2FA} className="pt-3 border-t border-ez-border/60 space-y-3">
                    <div className="text-xs font-bold text-white mb-1">
                      {t.settings.enableTwoFactor}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.enterTwoFactorPass}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={show2FAPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={twoFactorPasswordInput}
                          onChange={(e) => {
                            setTwoFactorPasswordInput(e.target.value);
                            setTwoFactorError('');
                          }}
                          placeholder="••••••••"
                          className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShow2FAPassword(!show2FAPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {show2FAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.confirmTwoFactorPass}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={show2FAPassword ? 'text' : 'password'}
                          required
                          value={twoFactorConfirmInput}
                          onChange={(e) => {
                            setTwoFactorConfirmInput(e.target.value);
                            setTwoFactorError('');
                          }}
                          placeholder="••••••••"
                          className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShow2FAPassword(!show2FAPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {show2FAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.twoFactorHint}
                      </label>
                      <input
                        type="text"
                        value={twoFactorHintInput}
                        onChange={(e) => setTwoFactorHintInput(e.target.value)}
                        placeholder="e.g. My favorite pet's name"
                        className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorAction('none');
                          setTwoFactorError('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ez-muted hover:text-white cursor-pointer transition-colors"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={twoFactorLoading}
                        className="px-4 py-1.5 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 text-xs font-bold cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {twoFactorLoading ? t.common.loading : t.common.save}
                      </button>
                    </div>
                  </form>
                )}

                {/* Mode: Change */}
                {twoFactorAction === 'change' && (
                  <form onSubmit={handleChange2FA} className="pt-3 border-t border-ez-border/60 space-y-3">
                    <div className="text-xs font-bold text-white mb-1">
                      {t.settings.changeTwoFactor}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.currentTwoFactorPass}
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={twoFactorCurrentInput}
                        onChange={(e) => {
                          setTwoFactorCurrentInput(e.target.value);
                          setTwoFactorError('');
                        }}
                        placeholder="••••••••"
                        className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.newTwoFactorPass}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={show2FAPassword ? 'text' : 'password'}
                          required
                          value={twoFactorPasswordInput}
                          onChange={(e) => {
                            setTwoFactorPasswordInput(e.target.value);
                            setTwoFactorError('');
                          }}
                          placeholder="••••••••"
                          className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShow2FAPassword(!show2FAPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {show2FAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.confirmTwoFactorPass}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={show2FAPassword ? 'text' : 'password'}
                          required
                          value={twoFactorConfirmInput}
                          onChange={(e) => {
                            setTwoFactorConfirmInput(e.target.value);
                            setTwoFactorError('');
                          }}
                          placeholder="••••••••"
                          className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShow2FAPassword(!show2FAPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {show2FAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.twoFactorHint}
                      </label>
                      <input
                        type="text"
                        value={twoFactorHintInput}
                        onChange={(e) => setTwoFactorHintInput(e.target.value)}
                        placeholder="e.g. My favorite pet's name"
                        className="w-full bg-ez-base border border-white/10 focus:border-[var(--ez-accent)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorAction('none');
                          setTwoFactorError('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ez-muted hover:text-white cursor-pointer transition-colors"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={twoFactorLoading}
                        className="px-4 py-1.5 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 text-xs font-bold cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {twoFactorLoading ? t.common.loading : t.common.save}
                      </button>
                    </div>
                  </form>
                )}

                {/* Mode: Disable */}
                {twoFactorAction === 'disable' && (
                  <form onSubmit={handleDisable2FA} className="pt-3 border-t border-ez-border/60 space-y-3">
                    <div className="text-xs font-bold text-rose-400 mb-1">
                      {t.settings.disableTwoFactor}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ez-muted uppercase tracking-wider mb-1">
                        {t.settings.currentTwoFactorPass}
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={twoFactorCurrentInput}
                        onChange={(e) => {
                          setTwoFactorCurrentInput(e.target.value);
                          setTwoFactorError('');
                        }}
                        placeholder="••••••••"
                        className="w-full bg-ez-base border border-white/10 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorAction('none');
                          setTwoFactorError('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ez-muted hover:text-white cursor-pointer transition-colors"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={twoFactorLoading}
                        className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {twoFactorLoading ? t.common.loading : t.settings.disableTwoFactor}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Link Desktop Device Card */}
              <div className="p-4 sm:p-5 bg-ez-elevated rounded-2xl border border-ez-border relative overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 shrink-0 mt-0.5">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{t.settings.linkDesktop}</span>
                      </h4>
                      <p className="text-xs text-ez-muted mt-0.5 leading-relaxed">
                        {t.settings.linkDesktopDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQRScannerOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold transition-all duration-150 cursor-pointer shadow-neon-sm active:scale-95 flex items-center space-x-1.5 shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{t.settings.scanQrCode}</span>
                  </button>
                </div>
              </div>

              {/* Devices & Active Sessions Card */}
              <div className="p-4 sm:p-5 bg-ez-elevated rounded-2xl border border-ez-border space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-white/5 text-zinc-300 border border-white/10 shrink-0 mt-0.5">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {t.settings.devicesTitle}
                      </h4>
                      <p className="text-xs text-ez-muted mt-0.5 leading-relaxed">
                        {t.settings.devicesSubtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchSessions}
                    disabled={sessionsLoading}
                    title={t.common.refresh || 'Refresh'}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin text-[var(--ez-accent)]' : ''}`} />
                  </button>
                </div>

                {/* Current Session ("This Device") */}
                {sessions.find((s) => s.isCurrent) && (() => {
                  const currentDevice = sessions.find((s) => s.isCurrent)!;
                  return (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/15 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-[var(--ez-accent)]/10 text-[var(--ez-accent)] border border-[var(--ez-accent)]/25 shrink-0">
                          {getDeviceIcon(currentDevice.device?.type, currentDevice.device?.os)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                            <span className="truncate">{currentDevice.device?.os || 'This Device'} • {currentDevice.device?.browser || 'Browser'}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--ez-accent)]/15 text-[var(--ez-accent)] border border-[var(--ez-accent)]/30 shrink-0">
                              {t.settings.thisDevice}
                            </span>
                          </div>
                          <div className="text-[11px] text-ez-muted flex items-center space-x-2 mt-0.5">
                            <span className="flex items-center space-x-1">
                              <Globe className="w-3 h-3 text-zinc-500" />
                              <span>{currentDevice.ip || 'Local Network'}</span>
                            </span>
                            <span>•</span>
                            <span className="text-[var(--ez-accent)] flex items-center space-x-1 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ez-accent)] animate-pulse" />
                              <span>{t.settings.activeNow}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Terminate All Other Sessions button */}
                {sessions.filter((s) => !s.isCurrent).length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isTerminatingAll}
                      onClick={handleTerminateOtherSessions}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isTerminatingAll ? t.common.loading : t.settings.terminateOtherSessions}</span>
                    </button>
                    <p className="text-[11px] text-ez-muted text-center mt-1.5">
                      {t.settings.terminateOtherSessionsDesc}
                    </p>
                  </div>
                )}

                {/* List of Other Active Sessions */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t.settings.otherDevices}
                  </div>

                  {sessions.filter((s) => !s.isCurrent).length === 0 ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-ez-muted">
                      {t.settings.noOtherDevices}
                    </div>
                  ) : (
                    sessions.filter((s) => !s.isCurrent).map((session) => (
                      <div
                        key={session.sessionId}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 rounded-lg bg-white/5 text-zinc-300 border border-white/10 shrink-0">
                            {getDeviceIcon(session.device?.type, session.device?.os)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {session.device?.os || 'Device'} • {session.device?.browser || 'Browser'}
                            </div>
                            <div className="text-[11px] text-ez-muted flex items-center space-x-2 mt-0.5">
                              <span>{session.ip || 'IP'}</span>
                              <span>•</span>
                              <span>{formatLastActive(session.lastActive)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={terminatingSessionId === session.sessionId}
                          onClick={() => handleTerminateSession(session.sessionId)}
                          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title={t.settings.terminateSession}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Session Encryption Card */}
              <div className="p-4 bg-ez-elevated rounded-2xl border border-ez-border">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="w-5 h-5 text-neon-green" />
                  <h4 className="text-sm font-bold text-white">{t.settings.sessionEncryption}</h4>
                </div>
                <p className="text-xs text-ez-muted leading-relaxed">
                  {t.settings.encryptionNotice.replace('{handle}', currentUser.handle)}
                </p>
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
                    <span>{t.settings.logOutSession}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Window Footer Actions ─── */}
        {/* ─── Window Footer (Action Buttons) ─── */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-ez-border/50 bg-ez-elevated/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-ez-muted flex items-center space-x-1.5">
            {savedSuccess && (
              <span className="text-neon-green flex items-center space-x-1 font-bold animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.settings.savedSuccess}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-ez-muted hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 sm:px-5 py-2 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold shadow-neon-sm transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.settings.saveChanges}</span>
            </button>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onSuccess={() => {
          fetchSessions();
        }}
      />
    </div>
  );
};
