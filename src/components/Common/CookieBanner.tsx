import React, { useState, useEffect } from 'react';
import { Cookie, Check, X } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export const CookieBanner: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('eztalk_cookie_accepted');
    if (!accepted) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('eztalk_cookie_accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 sm:top-5 sm:right-6 left-4 right-4 sm:left-auto sm:w-auto sm:max-w-md z-50 animate-fade-in font-sans">
      <div className="bg-ez-elevated/95 border border-ez-border/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-glass-lg flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] flex items-center justify-center text-[var(--ez-accent)] shrink-0">
          <Cookie className="w-4 h-4" />
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed flex-1 min-w-0">
          {t.cookie.text}{' '}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[var(--ez-accent)] underline hover:brightness-110 cursor-pointer"
          >
            {t.cookie.details}
          </button>
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            className="px-3 py-1.5 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Check className="w-3 h-3" />
            <span>{t.cookie.accept}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
