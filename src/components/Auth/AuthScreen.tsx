import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Upload, Check, X, ShieldCheck } from 'lucide-react';
import { User } from '../../types/chat';
import { ChatStorageService } from '../../utils/chatStorage';
import { ApiService } from '../../services/api';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-zinc-800' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8 && /[0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Medium', color: 'bg-amber-400' };
  return { score: 3, label: 'Strong', color: 'bg-[var(--ez-accent)]' };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
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
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // Live handle validation state
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const handleCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passwordStrength = getPasswordStrength(regPassword);

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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatar(reader.result);
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    if (handleStatus === 'taken') {
      setErrorMessage('Username is already taken. Please pick a different handle.');
      return;
    }

    const cleanHandle = regHandle.trim().startsWith('@') ? regHandle.trim() : `@${regHandle.trim() || 'User'}`;
    setLoading(true);
    try {
      const user = await ApiService.register({
        name: regName.trim() || cleanHandle.replace('@', ''),
        handle: cleanHandle,
        password: regPassword,
        avatar: selectedAvatar,
        email: regEmail.trim() || `${cleanHandle.replace('@', '')}@eztalk.app`,
        bio: 'Hey there! I am using EzTalk.',
      });
      if (rememberMe) {
        ChatStorageService.saveAuthUser(user);
      }
      onLogin(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Username may already be in use.');
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

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-[var(--ez-surface)] border border-[var(--ez-border)] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10 animate-fade-in my-auto shrink-0">
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] text-[var(--ez-accent)] mb-2 shadow-sm">
            <span className="text-xl sm:text-2xl font-black">Ez</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100">
            Ez<span className="text-[var(--ez-accent)]">Talk</span>
          </h1>
          <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] text-[10px] sm:text-[11px] font-semibold text-[var(--ez-accent)]">
            <Sparkles className="w-3 h-3 text-[var(--ez-accent)] shrink-0" />
            <span className="tracking-tight font-mono">Ultra Fast • Real-Time</span>
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
            Sign In
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
            Create Account
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
                Email or Username
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
                  placeholder="name@example.com or @username"
                  className="w-full bg-[var(--ez-base)] border border-white/10 focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Password
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
                  className="absolute right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer p-1"
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
                <span className="text-xs text-zinc-400 hover:text-zinc-200">Remember on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to EzTalk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Full Name
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
                  Username (@handle)
                </label>
                {handleStatus === 'available' && (
                  <span className="text-[10px] font-semibold text-[var(--ez-accent)] flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                )}
                {handleStatus === 'taken' && (
                  <span className="text-[10px] font-semibold text-rose-400 flex items-center space-x-1">
                    <X className="w-3 h-3" />
                    <span>Taken</span>
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
                Email
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
                  Password
                </label>
                {passwordStrength.label && (
                  <span className={`text-[10px] font-semibold ${passwordStrength.score === 3 ? 'text-[var(--ez-accent)]' : passwordStrength.score === 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {passwordStrength.label}
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
                  className="absolute right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer p-1"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Confirm Password
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
                  className="absolute right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer p-1"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Profile Avatar Selection (Wrap enabled for small screens) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Profile Avatar
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-[var(--ez-accent)] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Photo</span>
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {customAvatar && (
                  <div
                    onClick={() => setSelectedAvatar(customAvatar)}
                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${selectedAvatar === customAvatar
                      ? 'border-[var(--ez-accent)] scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={customAvatar} alt="Custom" className="w-full h-full object-cover" />
                  </div>
                )}

                {PRESET_AVATARS.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${selectedAvatar === url
                      ? 'border-[var(--ez-accent)] scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
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
                <span className="text-xs text-zinc-400 hover:text-zinc-200">Remember on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || handleStatus === 'taken'}
              className="w-full py-2.5 sm:py-3 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span>{loading ? 'Creating Account...' : 'Create Free Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
