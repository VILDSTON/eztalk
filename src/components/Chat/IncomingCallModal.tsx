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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in select-none p-4 font-sans">
      <div className="bg-[#101116]/95 border border-[#00ff73]/40 rounded-3xl w-full max-w-sm p-7 shadow-[0_0_60px_rgba(0,255,115,0.25)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-2xl">
        {/* Pulsing Ambient Light */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-60 bg-[#00ff73]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Top Tag */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00ff73]/10 border border-[#00ff73]/30 text-[11px] font-semibold text-[#00ff73] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#00ff73] animate-pulse" />
          <span>Incoming HD Voice Call</span>
        </div>

        {/* Caller Avatar with Pulse Ring */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00ff73] shadow-[0_0_25px_rgba(0,255,115,0.4)] relative z-10">
            <img src={caller.avatar} alt={caller.handle} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -inset-2 rounded-full border border-[#00ff73]/50 animate-ping pointer-events-none" />
        </div>

        {/* Text Details */}
        <h3 className="text-xl font-bold text-white tracking-tight">{caller.name || caller.handle}</h3>
        <p className="text-xs text-[#00ff73] font-mono mt-0.5">{caller.handle}</p>
        <div className="inline-flex items-center space-x-2 mt-3 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
          <Radio className="w-3.5 h-3.5 text-[#00ff73] animate-spin" />
          <span>Ringing...</span>
        </div>

        {/* Action Buttons: Decline / Accept */}
        <div className="flex items-center justify-center space-x-8 w-full mt-7 pt-4 border-t border-white/10">
          {/* Decline */}
          <button
            type="button"
            onClick={handleDecline}
            className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center justify-center border border-red-400/30"
            title="Decline Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={handleAccept}
            className="p-4 rounded-2xl bg-[#00ff73] hover:bg-[#1aff85] text-black shadow-[0_0_25px_rgba(0,255,115,0.5)] transition-all hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center justify-center font-bold border border-[#00ff73]"
            title="Accept Call"
          >
            <Phone className="w-6 h-6 animate-pulse" />
          </button>
        </div>
      </div>
    </div>
  );
};
