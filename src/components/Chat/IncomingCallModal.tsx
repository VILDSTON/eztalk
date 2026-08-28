import React, { useEffect } from 'react';
import { Phone, PhoneOff, PhoneCall } from 'lucide-react';
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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in select-none p-4">
      <div className="bg-[#15161b] border-2 border-[#00ff73]/50 rounded-3xl w-full max-w-sm p-7 shadow-[0_0_50px_rgba(0,255,115,0.3)] flex flex-col items-center text-center relative overflow-hidden">
        {/* Pulsing Aura */}
        <div className="absolute inset-0 bg-[#00ff73]/5 animate-pulse pointer-events-none" />

        {/* Caller Avatar */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#00ff73] shadow-neon-md animate-pulse">
            <img src={caller.avatar} alt={caller.handle} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00ff73] border-2 border-[#15161b]" />
        </div>

        {/* Text */}
        <h3 className="text-xl font-bold text-white tracking-tight">{caller.name || caller.handle}</h3>
        <p className="text-xs text-[#00ff73] font-mono mt-0.5">{caller.handle}</p>
        <p className="text-xs text-gray-300 mt-2 font-medium flex items-center justify-center space-x-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-[#00ff73] animate-bounce" />
          <span>Incoming Voice Call...</span>
        </p>

        {/* Action Buttons: Decline / Accept */}
        <div className="flex items-center justify-center space-x-6 w-full mt-7">
          {/* Decline */}
          <button
            type="button"
            onClick={handleDecline}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center space-y-1"
            title="Decline Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={handleAccept}
            className="p-4 rounded-2xl bg-[#00ff73] hover:bg-[#1aff85] text-black shadow-neon-md transition-transform hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center space-y-1"
            title="Accept Call"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
