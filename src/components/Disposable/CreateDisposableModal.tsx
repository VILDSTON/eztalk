import React, { useState } from 'react';
import { Flame, Clock, Copy, Check, X, Shield, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { ApiService } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

interface CreateDisposableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserHandle?: string;
  currentUserName?: string;
}

export const CreateDisposableModal: React.FC<CreateDisposableModalProps> = ({
  isOpen,
  onClose,
  currentUserHandle,
  currentUserName,
}) => {
  const { t, language } = useTranslation();
  const navigate = useLocalizedNavigate();

  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [nickname, setNickname] = useState<string>(currentUserName || (currentUserHandle ? currentUserHandle.replace('@', '') : ''));
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const room = await ApiService.createDisposableRoom(durationMinutes);
      setCreatedRoomId(room.id);
      if (nickname.trim()) {
        sessionStorage.setItem(`ez_temp_nick_${room.id}`, nickname.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const roomLink = createdRoomId
    ? `${window.location.origin}/${language}/room/${createdRoomId}`
    : '';

  const handleCopy = () => {
    if (!roomLink) return;
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnter = () => {
    if (!createdRoomId) return;
    onClose();
    navigate(`/room/${createdRoomId}`);
  };

  const handleClose = () => {
    setCreatedRoomId(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-ez-surface border border-ez-border/80 rounded-3xl p-6 shadow-2xl z-10 animate-scale-up overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-neon-green/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!createdRoomId ? (
          /* Step 1: Configuration Form */
          <div>
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-neon-green/20 to-neon-green/20 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-neon-sm shrink-0">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {(t as any)?.disposable?.createTitle || 'Disposable Chat Room'}
                </h2>
                <p className="text-xs text-ez-muted">
                  {(t as any)?.disposable?.createSubtitle || 'Temporary private chat without chat history'}
                </p>
              </div>
            </div>

            {/* Privacy Highlight */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl mb-5 flex items-start space-x-2.5 text-xs text-ez-muted leading-relaxed">
              <Shield className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
              <span>
                {(t as any)?.disposable?.zeroDbNotice || 'Messages exist only during the session and are permanently erased upon exit or when the timer expires.'}
              </span>
            </div>

            {/* Duration Selector */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-300 mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-neon-green" />
                <span>{(t as any)?.disposable?.ttlDuration || 'Lifetime (TTL)'}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 5, label: '5 min', desc: (t as any)?.disposable?.quickDeal || '⚡ Quick' },
                  { value: 15, label: '15 min', desc: (t as any)?.disposable?.recommended || '🔥 Standard' },
                  { value: 60, label: '1 hour', desc: (t as any)?.disposable?.deepTalk || '⏳ Long' },
                ].map((preset) => {
                  const active = durationMinutes === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDurationMinutes(preset.value)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${active
                        ? 'bg-neon-green/15 border-neon-green text-white shadow-neon-sm scale-[1.02]'
                        : 'bg-ez-elevated border-ez-border/60 text-gray-300 hover:border-white/20 hover:bg-ez-hover'
                        }`}
                    >
                      <div className={`text-sm font-bold ${active ? 'text-neon-green' : 'text-white'}`}>
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-ez-muted mt-0.5">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Nickname */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {(t as any)?.disposable?.yourNickname || 'Your Name / Nickname in Room'}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                placeholder={(t as any)?.disposable?.nickPlaceholder || 'e.g. Ghost, Buyer #42'}
                className="w-full bg-ez-elevated border border-ez-border/80 focus:border-neon-green rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-ez-muted outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCreate}
              className="w-full py-3 px-4 rounded-2xl bg-neon-green hover:bg-neon-green-light text-black font-extrabold text-sm shadow-neon-md transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>{(t as any)?.disposable?.createButton || 'Generate Disposable Room'}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Room Ready & Share Screen */
          <div className="animate-fade-in text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-neon-md">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight mb-1">
              {(t as any)?.disposable?.readyTitle || 'Room Created & Ready!'}
            </h3>
            <p className="text-xs text-ez-muted mb-4 max-w-xs mx-auto">
              {(t as any)?.disposable?.readySubtitle || 'Share this one-time link with the other person. When both leave or time runs out, the room vanishes.'}
            </p>

            {/* Link Box */}
            <div className="p-3 bg-ez-elevated border border-ez-border rounded-2xl mb-4 flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={roomLink}
                className="bg-transparent text-xs font-mono text-neon-green outline-none flex-1 truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-neon-green" />
                    <span className="text-neon-green">{(t as any)?.common?.copied || 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{(t as any)?.common?.copy || 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleEnter}
                className="w-full py-3 px-4 rounded-2xl bg-neon-green hover:bg-neon-green-light text-black font-extrabold text-sm shadow-neon-md transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{(t as any)?.disposable?.enterRoom || 'Enter Room Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 text-xs text-ez-muted hover:text-white transition-colors cursor-pointer"
              >
                {(t as any)?.common?.close || 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
