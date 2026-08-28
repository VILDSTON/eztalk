import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Upload, Check, X, ShieldCheck } from 'lucide-react';
import { User } from '../../types/chat';
import { ChatStorageService, DEFAULT_CURRENT_USER } from '../../utils/chatStorage';
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

// Helper to calculate password strength (1 to 3)
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-gray-700' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8 && /[0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score === 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Medium', color: 'bg-yellow-400' };
  return { score: 3, label: 'Strong', color: 'bg-[#00ff73]' };
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
  const handleCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passwordStrength = getPasswordStrength(regPassword);

  // Real-time debounce check for username availability
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

  // Handle custom avatar upload
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

  const handleQuickDemo = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const user = await ApiService.login('@alexr', 'password123');
      ChatStorageService.saveAuthUser(user);
      onLogin(user);
    } catch {
      ChatStorageService.saveAuthUser(DEFAULT_CURRENT_USER);
      onLogin(DEFAULT_CURRENT_USER);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#07080a] flex items-center justify-center p-4 relative overflow-y-auto select-none font-sans custom-scrollbar">
      {/* Hidden file input for custom avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#00ff73]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#00ff73]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-[#121317] border border-[#262830] rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in backdrop-blur-md my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00ff73]/10 border border-[#00ff73]/30 text-[#00ff73] mb-2.5 shadow-[0_0_20px_rgba(0,255,115,0.2)]">
            <span className="text-2xl font-black">Ez</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#00ff73] neon-text-glow">
            EzTalk
          </h1>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00ff73]/10 border border-[#00ff73]/30 text-[11px] font-semibold text-[#00ff73] shadow-[0_0_15px_rgba(0,255,115,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-[#00ff73] animate-pulse shrink-0" />
            <span className="tracking-tight font-mono">Powered by Gemini 3.7 Flash</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#191a20] p-1 rounded-xl mb-5 border border-[#2a2c35]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#00ff73] text-black shadow-neon-sm'
                : 'text-gray-400 hover:text-white'
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
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#00ff73] text-black shadow-neon-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email or Username (@handle)
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="name@example.com or @username"
                  className="w-full bg-[#18191f] border border-[#2a2c35] focus:border-[#00ff73] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#18191f] border border-[#2a2c35] focus:border-[#00ff73] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#2a2c35] text-[#00ff73] focus:ring-0 focus:outline-none accent-[#00ff73]"
                />
                <span className="text-xs text-gray-400 hover:text-gray-200">Remember on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-sm rounded-xl shadow-neon-md hover:shadow-neon-lg transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to EzTalk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2.5 bg-[#21232b] hover:bg-[#2a2d37] border border-[#323542] text-gray-200 hover:text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00ff73]" />
                <span>Instant Demo Login (1-Click)</span>
              </button>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Full Name (No Emojis)
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5" />
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
                  className="w-full bg-[#18191f] border border-[#2a2c35] focus:border-[#00ff73] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Username / Handle with Live Availability Badge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Username (@handle)
                </label>
                {handleStatus === 'available' && (
                  <span className="text-[11px] font-bold text-[#00ff73] flex items-center space-x-1 animate-fade-in">
                    <Check className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                )}
                {handleStatus === 'taken' && (
                  <span className="text-[11px] font-bold text-red-400 flex items-center space-x-1 animate-fade-in">
                    <X className="w-3 h-3" />
                    <span>Username taken</span>
                  </span>
                )}
                {handleStatus === 'checking' && (
                  <span className="text-[10px] text-gray-400 italic">Checking...</span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="text-gray-500 absolute left-3.5 text-sm font-semibold">@</span>
                <input
                  type="text"
                  required
                  value={regHandle}
                  onChange={(e) => {
                    setRegHandle(e.target.value.replace('@', ''));
                    setErrorMessage('');
                  }}
                  placeholder="username (e.g. SarahC)"
                  className={`w-full bg-[#18191f] border rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors ${
                    handleStatus === 'taken'
                      ? 'border-red-500/60 focus:border-red-500'
                      : handleStatus === 'available'
                      ? 'border-[#00ff73]/60 focus:border-[#00ff73]'
                      : 'border-[#2a2c35] focus:border-[#00ff73]'
                  }`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="sarah@example.com"
                  className="w-full bg-[#18191f] border border-[#2a2c35] focus:border-[#00ff73] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password with Strength Bar & Eye Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                {passwordStrength.label && (
                  <span className={`text-[10px] font-bold ${passwordStrength.score === 3 ? 'text-[#00ff73]' : passwordStrength.score === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#18191f] border border-[#2a2c35] focus:border-[#00ff73] rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Visual Meter */}
              {regPassword && (
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  <div className={`h-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-gray-800'}`} />
                  <div className={`h-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-gray-800'}`} />
                  <div className={`h-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-gray-800'}`} />
                </div>
              )}
            </div>

            {/* Confirm Password Field with Eye Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                {regConfirmPassword && (
                  regPassword === regConfirmPassword ? (
                    <span className="text-[10px] font-bold text-[#00ff73] flex items-center space-x-0.5">
                      <Check className="w-3 h-3" />
                      <span>Matches</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-400">Doesn't match</span>
                  )
                )}
              </div>
              <div className="relative flex items-center">
                <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3.5" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-[#18191f] border rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors ${
                    regConfirmPassword && regPassword !== regConfirmPassword
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[#2a2c35] focus:border-[#00ff73]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Choose Preset Avatar or Upload Custom Photo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Profile Avatar
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-[#00ff73] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Photo</span>
                </button>
              </div>

              <div className="flex items-center space-x-2.5">
                {/* Custom uploaded avatar if present */}
                {customAvatar && (
                  <div
                    onClick={() => setSelectedAvatar(customAvatar)}
                    className={`relative w-9 h-9 rounded-full overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedAvatar === customAvatar
                        ? 'border-[#00ff73] scale-110 shadow-neon-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={customAvatar} alt="Custom" className="w-full h-full object-cover" />
                    {selectedAvatar === customAvatar && (
                      <div className="absolute inset-0 bg-[#00ff73]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff73]" />
                      </div>
                    )}
                  </div>
                )}

                {/* Preset Avatars */}
                {PRESET_AVATARS.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative w-9 h-9 rounded-full overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedAvatar === url
                        ? 'border-[#00ff73] scale-110 shadow-neon-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-[#00ff73]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff73]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#2a2c35] text-[#00ff73] focus:ring-0 focus:outline-none accent-[#00ff73]"
                />
                <span className="text-xs text-gray-400 hover:text-gray-200">Remember on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || handleStatus === 'taken'}
              className="w-full py-3 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-sm rounded-xl shadow-neon-md hover:shadow-neon-lg transition-all flex items-center justify-center space-x-2 mt-3 cursor-pointer disabled:opacity-50"
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
