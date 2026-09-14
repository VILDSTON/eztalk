import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { socketService } from '../../services/socket';
import { useTranslation } from '../../context/LanguageContext';

export const BanScreen: React.FC = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    socketService.disconnect();
    setTimeout(() => {
      socketService.connect();
      setTimeout(() => setIsReconnecting(false), 1500);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0d12]">
      <div className="w-full max-w-md p-8 text-center animate-slide-up flex-1 flex flex-col justify-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 mb-6">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          {t.ban?.title || 'Access Denied'}
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          {t.ban?.description || 'You have been temporarily blocked by the EzTalk Security System for suspicious activity (spam or flood).'}
        </p>

        <div className="bg-[#141a23] rounded-2xl p-6 border border-red-500/20 mb-8">
          <div className="text-sm font-medium text-red-400 mb-1">
            {t.ban?.timeRemaining || 'TIME REMAINING'}
          </div>
          <div className="text-4xl font-mono font-bold text-white tracking-widest">
            {formatTime(timeLeft)}
          </div>
        </div>

        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${isReconnecting ? 'animate-spin' : 'group-hover:-rotate-180 transition-transform duration-500'}`} />
          {isReconnecting ? (t.ban?.checking || 'Checking status...') : (t.ban?.tryReconnect || 'Try Reconnecting')}
        </button>
      </div>

      <div className="pb-8 animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
        <a
          href="mailto:xsakm.dev@gmail.com?subject=Appeal Ban"
          className="text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4 decoration-gray-700"
        >
          {t.ban?.appeal || 'Appeal Ban (False Positive)'}
        </a>
      </div>
    </div>
  );
};
