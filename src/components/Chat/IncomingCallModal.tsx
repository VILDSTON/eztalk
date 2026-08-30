import React, { useEffect } from 'react';
import { Phone, PhoneOff, Sparkles, Radio } from 'lucide-react';
import { User } from '../../types/chat';
import { callSoundService } from '../../utils/callSounds';

interface IncomingCallModalProps {
  caller: User;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  isOpen,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (!isOpen) {
      callSoundService.stopIncoming();
      return;
    }

    callSoundService.playIncoming();

    return () => {
      callSoundService.stopIncoming();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    callSoundService.stopIncoming();
    onAccept();
  };

  const handleDecline = () => {
    callSoundService.stopIncoming();
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-60 flex sm:items-center sm:justify-center bg-black/80 backdrop-blur-xl animate-fade-in select-none p-0 sm:p-4 font-sans">
      <div className="bg-ez-base/95 border-0 sm:border border-neon-green/30 rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-sm p-6 sm:p-7 shadow-[0_0_60px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-2xl">
        {/* Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-60 bg-neon-green/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

        {/* Tag */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/25 text-[11px] font-semibold text-neon-green mb-6">
          <Sparkles className="w-3.5 h-3.5 text-neon-green animate-glow-pulse" />
          <span>Incoming HD Voice Call</span>
        </div>

        {/* Caller Avatar */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-green shadow-neon-lg relative z-10">
            <img src={caller.avatar} alt={caller.handle} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -inset-2 rounded-full border border-neon-green/40 animate-ping pointer-events-none" />
        </div>

        {/* Details */}
        <h3 className="text-xl font-bold text-white tracking-tight">{caller.name || caller.handle}</h3>
        <p className="text-xs text-neon-green font-mono mt-0.5">{caller.handle}</p>
        <div className="inline-flex items-center space-x-2 mt-3 px-3.5 py-1 rounded-full bg-white/5 border border-ez-border text-xs text-gray-300">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-spin" />
          <span>Ringing...</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8 w-full mt-7 pt-4 border-t border-ez-border/50">
          <button
            type="button"
            onClick={handleDecline}
            className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.35)] transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer border border-red-400/25"
            title="Decline Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="p-4 rounded-2xl bg-neon-green hover:bg-neon-green-light text-black shadow-neon-lg transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer font-bold border border-neon-green"
            title="Accept Call"
          >
            <Phone className="w-6 h-6 animate-glow-pulse" />
          </button>
        </div>
      </div>
    </div>
  );
};
