import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Upload, Check, X, ShieldCheck, Palette, Rocket, Image as ImageIcon } from 'lucide-react';
import { User } from '../../types/chat';
import { ChatStorageService } from '../../utils/chatStorage';
import { ApiService } from '../../services/api';
import { compressAvatar } from '../../utils/imageCompressor';
import { useTranslation } from '../../context/LanguageContext';
import { LanguageSwitch } from '../Common/LanguageSwitch';
import { CURATED_AVATARS, DEFAULT_AVATAR } from '../../constants/avatars';
import { THEME_OPTIONS, THEME_NAMES, applyTheme } from '../../utils/theme';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
  onCancel?: () => void;
}

const PRESET_AVATARS = CURATED_AVATARS;

function getPasswordStrength(password: string): { score: number; color: string } {
  if (!password) return { score: 0, color: 'bg-zinc-800' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8 && /[0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score === 1) return { score: 1, color: 'bg-rose-500' };
  if (score === 2) return { score: 2, color: 'bg-amber-400' };
  return { score: 3, color: 'bg-[var(--ez-accent)]' };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onOpenLegal, onCancel }) => {
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'onboarding'>('register');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('eztalk_theme') || 'neon';
    }
    return 'neon';
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState(''); // Anti-bot trap field

  // Live handle validation state
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const handleCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordStrength = getPasswordStrength(regPassword);
  const passwordStrengthLabel =
    passwordStrength.score === 1
      ? t.auth.weak
      : passwordStrength.score === 2
      ? t.auth.medium
      : passwordStrength.score === 3
      ? t.auth.strong
      : '';

  useEffect(() => {
    if (handleCheckTimerRef.current) {
      clearTimeout(handleCheckTimerRef.current);
    }

    const clean = regHandle.trim().replace('@', '').toLowerCase();
    if (!clean || clean.length < 3) {
      setHandleStatus('idle');
      return;
    }

    setHandleStatus('checking');
    handleCheckTimerRef.current = setTimeout(async () => {
      try {
        const user = await ApiService.getUserByHandle(`@${clean}`);
        if (user) {
          setHandleStatus('taken');
        } else {
          setHandleStatus('available');
        }
      } catch {
        setHandleStatus('available');
      }
    }, 350);

    return () => {
      if (handleCheckTimerRef.current) clearTimeout(handleCheckTimerRef.current);
    };
  }, [regHandle]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressAvatar(file);
      setCustomAvatar(compressedDataUrl);
      setSelectedAvatar(compressedDataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomAvatar(reader.result);
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = loginEmail.trim().toLowerCase();
    setErrorMessage('');
    setLoading(true);
    try {
      const user = await ApiService.login(cleanInput, loginPassword);
      if (rememberMe) {
        ChatStorageService.saveAuthUser(user);
      }
      onLogin(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Anti-bot honeypot check: if filled, quietly drop the submission
    if (honeypot) {
      return;
    }

    const rawHandle = regHandle.trim().replace(/^@/, '');
    if (!rawHandle) {
      setErrorMessage('Please choose a username.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(rawHandle)) {
      setErrorMessage('Username must be 3-20 characters long (letters, numbers, underscores only).');
      return;
    }

    if (regEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regEmail.trim())) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (handleStatus === 'taken') {
      setErrorMessage('Username is already taken. Please pick a different handle.');
      return;
    }

    const cleanHandle = `@${rawHandle}`;
    setLoading(true);
    try {
      const user = await ApiService.register({
        name: regName.trim() || rawHandle,
        handle: cleanHandle,
        password: regPassword,
        avatar: selectedAvatar,
        email: regEmail.trim() || `${rawHandle}@eztalk.app`,
        bio: 'Hey there! I am using EzTalk.',
        ...(honeypot ? { b_username: honeypot } as any : {}),
      });
      setRegisteredUser(user);
      setMode('onboarding');
      setOnboardingStep(1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Username may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = async () => {
    if (!registeredUser) return;
    setLoading(true);
    try {
      const selectedTheme = THEME_OPTIONS.find((th) => th.id === selectedThemeId) || THEME_OPTIONS[0];
      const updatedUser: User = {
        ...registeredUser,
        avatar: selectedAvatar,
        theme: selectedThemeId,
        settings: {
          ...(registeredUser.settings || {}),
          theme: selectedThemeId,
          accentColor: selectedTheme.color,
        },
      };
      applyTheme(selectedThemeId);
      await ApiService.updateProfile(updatedUser);
      if (rememberMe) {
        ChatStorageService.saveAuthUser(updatedUser);
      }
      onLogin(updatedUser);
    } catch (err) {
      console.warn('Failed to update profile on server during onboarding:', err);
      const selectedTheme = THEME_OPTIONS.find((th) => th.id === selectedThemeId) || THEME_OPTIONS[0];
      const fallbackUser: User = {
        ...registeredUser,
        avatar: selectedAvatar,
        theme: selectedThemeId,
        settings: {
          ...(registeredUser.settings || {}),
          theme: selectedThemeId,
          accentColor: selectedTheme.color,
        },
      };
      applyTheme(selectedThemeId);
      if (rememberMe) {
        ChatStorageService.saveAuthUser(fallbackUser);
      }
      onLogin(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[var(--ez-base)] flex flex-col items-center p-4 sm:p-6 py-8 relative select-none font-sans custom-scrollbar">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Top Bar: Back button & Language Switcher */}
      <div className={`w-full max-w-md flex items-center ${onCancel ? 'justify-between' : 'justify-end'} mb-3 shrink-0`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[var(--ez-surface)] border border-[var(--ez-border)] text-zinc-300 hover:text-white hover:border-[var(--ez-accent)] hover:bg-white/[0.04] transition-colors cursor-pointer text-xs font-semibold group shadow-sm active:scale-95"
            title={t.common.back}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--ez-accent)] transition-colors" />
            <span>{t.common.back}</span>
          </button>
        )}
        <LanguageSwitch />
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-[var(--ez-surface)] border border-[var(--ez-border)] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10 animate-fade-in my-auto shrink-0">
        
        {mode === 'onboarding' && registeredUser ? (
          <div className="flex flex-col animate-fade-in space-y-5">
            {onboardingStep === 1 && (
              <div className="text-center animate-fade-in">
                <Palette className="w-12 h-12 text-[var(--ez-accent)] mx-auto mb-3" />
                <h2 className="text-2xl font-black text-white mb-2">{t.auth.chooseAccent}</h2>
                <p className="text-sm text-zinc-400 mb-6">{t.auth.chooseAccentSubtitle}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {THEME_OPTIONS.map((th) => {
                    const isSelected = selectedThemeId === th.id;
                    const themeName = THEME_NAMES[th.id]?.[language as 'en' | 'ru' | 'uz'] || th.name;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setSelectedThemeId(th.id);
                          applyTheme(th.id);
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-center space-y-2 transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-white/50 bg-white/10 ring-2 ring-white/30 shadow-glass scale-105'
                            : 'border-[var(--ez-border)] bg-[var(--ez-elevated)] hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full transition-transform duration-150"
                          style={{ backgroundColor: th.color, boxShadow: `0 0 12px ${th.glow}70` }}
                        />
                        <span className="text-xs font-bold text-white truncate">{themeName}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="w-full py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>{t.common.continue}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="text-center animate-fade-in">
                <ImageIcon className="w-12 h-12 text-[var(--ez-accent)] mx-auto mb-3" />
                <h2 className="text-2xl font-black text-white mb-2">{t.auth.chooseAvatar}</h2>
                <p className="text-sm text-zinc-400 mb-6">{t.auth.chooseAvatarSubtitle}</p>
                
                <div className="flex items-center justify-center gap-2.5 flex-wrap mb-6 max-h-52 overflow-y-auto custom-scrollbar p-1">
                  {customAvatar && (
                    <img
                      onClick={() => setSelectedAvatar(customAvatar)}
                      src={customAvatar}
                      alt="Custom Avatar"
                      className={`w-14 h-14 rounded-full cursor-pointer border-2 transition-all hover:opacity-100 object-cover ${
                        selectedAvatar === customAvatar ? 'border-[var(--ez-accent)] scale-110' : 'border-transparent opacity-60'
                      }`}
                    />
                  )}
                  {PRESET_AVATARS.map((url) => (
                    <img
                      key={url}
                      onClick={() => setSelectedAvatar(url)}
                      src={url}
                      alt="Preset Avatar"
                      className={`w-14 h-14 rounded-full cursor-pointer border-2 transition-all hover:opacity-100 object-cover ${
                        selectedAvatar === url ? 'border-[var(--ez-accent)] scale-110' : 'border-transparent opacity-60'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-2 text-sm text-[var(--ez-accent)] mb-8 hover:underline hover:brightness-110 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t.auth.uploadPhoto}</span>
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="w-1/3 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.common.back}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="w-2/3 py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{t.common.continue}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {onboardingStep === 3 && (
              <div className="text-center animate-fade-in">
                <Rocket className="w-12 h-12 text-[var(--ez-accent)] mx-auto mb-3" />
                <h2 className="text-2xl font-black text-white mb-2">{t.auth.allSet}</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {t.auth.welcomeToEzTalk.replace('{name}', registeredUser?.name || registeredUser?.handle || 'User')}
                </p>
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-[var(--ez-accent)] mb-8 bg-[var(--ez-elevated)] shadow-lg">
                  <img src={selectedAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="w-1/3 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.common.back}
                  </button>
                  <button
                    type="button"
                    onClick={finishOnboarding}
                    disabled={loading}
                    className="w-2/3 py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? t.common.loading : t.auth.enterApp}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] text-[var(--ez-accent)] mb-2 shadow-sm">
            <span className="text-xl sm:text-2xl font-black">Ez</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100">
            Ez<span className="text-[var(--ez-accent)]">Talk</span>
          </h1>
          <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] text-[10px] sm:text-[11px] font-semibold text-[var(--ez-accent)]">
            <Sparkles className="w-3 h-3 text-[var(--ez-accent)] shrink-0" />
            <span className="tracking-tight font-mono">{t.auth.tagline}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[var(--ez-base)] p-1 rounded-xl mb-4 sm:mb-5 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'login'
              ? 'bg-[var(--ez-accent)] text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {t.auth.signIn}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'register'
              ? 'bg-[var(--ez-accent)] text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {t.auth.createAccount}
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-4 flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 p-2.5 sm:p-3 rounded-xl text-rose-400 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                {t.auth.email} / {t.auth.username}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="name@example.com / @username"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                {t.auth.password}
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 text-[var(--ez-accent)] focus:ring-0 accent-[var(--ez-accent)]"
                />
                <span className="text-xs text-zinc-400 hover:text-zinc-200">{t.auth.rememberMe}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span>{loading ? t.common.loading : t.auth.signInToAccount}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {/* Honeypot field for anti-spam bot traps (masked off-screen for smart bots) */}
            <div className="opacity-0 absolute -z-50 select-none pointer-events-none h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="b_username">Leave this field blank</label>
              <input
                id="b_username"
                type="text"
                name="b_username"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                {t.auth.fullName}
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
                    setRegName(clean);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {t.auth.username} (@handle)
                </label>
                {handleStatus === 'checking' && (
                  <span className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1">
                    <span>{t.auth.checking}</span>
                  </span>
                )}
                {handleStatus === 'available' && (
                  <span className="text-[10px] font-semibold text-[var(--ez-accent)] flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>{t.auth.available}</span>
                  </span>
                )}
                {handleStatus === 'taken' && (
                  <span className="text-[10px] font-semibold text-rose-400 flex items-center space-x-1">
                    <X className="w-3 h-3" />
                    <span>{t.auth.taken}</span>
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="text-zinc-500 absolute left-3.5 text-xs sm:text-sm font-semibold">@</span>
                <input
                  type="text"
                  required
                  value={regHandle}
                  onChange={(e) => {
                    setRegHandle(e.target.value.replace('@', ''));
                    setErrorMessage('');
                  }}
                  placeholder="username"
                  className={`w-full bg-[var(--ez-base)] border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors ${handleStatus === 'taken'
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : handleStatus === 'available'
                      ? 'border-[var(--ez-accent)]/60 focus:border-[var(--ez-accent)]'
                      : 'border-white/10 focus:border-[var(--ez-accent)]'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                {t.auth.email}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="sarah@example.com"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {t.auth.password}
                </label>
                {passwordStrengthLabel && (
                  <span className={`text-[10px] font-semibold ${passwordStrength.score === 3 ? 'text-[var(--ez-accent)]' : passwordStrength.score === 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {passwordStrengthLabel}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                {t.auth.confirmPassword}
              </label>
              <div className="relative flex items-center">
                <ShieldCheck className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-[var(--ez-base)] border rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors ${regConfirmPassword && regPassword !== regConfirmPassword
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-white/10 focus:border-[var(--ez-accent)]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>



            <div className="flex items-center space-x-2 pt-0.5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 text-[var(--ez-accent)] focus:ring-0 accent-[var(--ez-accent)]"
                />
                <span className="text-xs text-zinc-400 hover:text-zinc-200">{t.auth.rememberMe}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || handleStatus === 'taken'}
              className="w-full py-2.5 sm:py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span>{loading ? t.common.loading : t.auth.createFreeAccount}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Legal Footer Links */}
        <div className="mt-5 pt-3 border-t border-[var(--ez-border)] text-center">
          <p className="text-[11px] text-zinc-500">
            {t.auth.legalConsentPrefix}{' '}
            <button
              type="button"
              onClick={() => onOpenLegal?.('terms')}
              className="text-zinc-400 hover:text-[var(--ez-accent)] underline transition-colors cursor-pointer"
            >
              {t.auth.terms}
            </button>{' '}
            {t.auth.and}{' '}
            <button
              type="button"
              onClick={() => onOpenLegal?.('privacy')}
              className="text-zinc-400 hover:text-[var(--ez-accent)] underline transition-colors cursor-pointer"
            >
              {t.auth.privacyPolicy}
            </button>
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
