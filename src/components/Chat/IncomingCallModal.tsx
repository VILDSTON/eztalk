import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Sparkles, Radio } from 'lucide-react';
import { User } from '../../types/chat';
import { callSoundService } from '../../utils/callSounds';
import { useTranslation } from '../../context/LanguageContext';

interface IncomingCallModalProps {
  caller: User;
  isOpen: boolean;
  callRingtonesEnabled?: boolean;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  isOpen,
  callRingtonesEnabled = true,
  onAccept,
  onDecline,
}) => {
  const { t } = useTranslation();
  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(caller?.handle || 'user')}`;
  const [avatarUrl, setAvatarUrl] = useState<string>(caller?.avatar || fallbackAvatar);

  useEffect(() => {
    setAvatarUrl(caller?.avatar || fallbackAvatar);
  }, [caller?.avatar, caller?.handle, fallbackAvatar]);
  useEffect(() => {
    if (!isOpen) {
      callSoundService.stopAll();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {
          // ignore
        }
      }
      return;
    }

    if (callRingtonesEnabled) {
      callSoundService.playIncoming();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 200]);
        } catch {
          // ignore
        }
      }
    }

    // 35-second unanswered timeout (auto-decline if ignored)
    const timeoutTimer = setTimeout(() => {
      onDecline('timeout');
    }, 35000);

    return () => {
      clearTimeout(timeoutTimer);
      callSoundService.stopAll();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, callRingtonesEnabled, onDecline]);

  if (!isOpen) return null;

  const handleAccept = () => {
    callSoundService.stopAll();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
    onAccept();
  };

  const handleDecline = () => {
    callSoundService.stopAll();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
    onDecline('declined');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex sm:items-center sm:justify-center bg-black/90 backdrop-blur-2xl animate-fade-in select-none p-0 sm:p-4 font-sans">
      <div className="bg-ez-base/95 border-0 sm:border border-neon-green/30 rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-sm p-6 sm:p-7 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-2xl">
        {/* Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-60 bg-neon-green/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

        {/* Tag */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/25 text-[11px] font-semibold text-neon-green mb-6">
          <Sparkles className="w-3.5 h-3.5 text-neon-green animate-glow-pulse" />
          <span>{t.calls.incomingHdCall}</span>
        </div>

        {/* Caller Avatar */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-green shadow-neon-lg relative z-10 bg-ez-surface">
            <img
              src={avatarUrl}
              alt={caller.handle}
              className="w-full h-full object-cover"
              onError={() => setAvatarUrl(fallbackAvatar)}
            />
          </div>
          <div className="absolute -inset-2 rounded-full border border-neon-green/40 animate-ping pointer-events-none" />
        </div>

        {/* Details */}
        <h3 className="text-xl font-bold text-white tracking-tight">{caller.name || caller.handle}</h3>
        <p className="text-xs text-neon-green font-mono mt-0.5">{caller.handle}</p>
        <div className="inline-flex items-center space-x-2 mt-3 px-3.5 py-1 rounded-full bg-white/5 border border-ez-border text-xs text-gray-300">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-spin" />
          <span>{t.calls.ringing}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8 w-full mt-7 pt-4 border-t border-ez-border/50">
          <button
            type="button"
            onClick={handleDecline}
            onTouchEnd={(e) => { e.preventDefault(); handleDecline(); }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.35)] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer border border-red-400/25 flex items-center justify-center shrink-0 relative z-50"
            title={t.calls.declineCall}
          >
            <PhoneOff className="w-6 h-6 pointer-events-none" />
          </button>

          <button
            type="button"
            onClick={handleAccept}
            onTouchEnd={(e) => { e.preventDefault(); handleAccept(); }}
            className="w-16 h-16 rounded-2xl bg-neon-green hover:bg-neon-green-light text-black shadow-neon-lg transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer font-bold border border-neon-green flex items-center justify-center shrink-0 relative z-50"
            title={t.calls.acceptCall}
          >
            <Phone className="w-6 h-6 animate-glow-pulse pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
};
