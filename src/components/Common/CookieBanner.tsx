import React, { useState, useEffect } from 'react';
import { Cookie, Check } from 'lucide-react';
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slide-up-sheet font-sans">
      <div className="bg-[var(--ez-surface)]/95 border border-[var(--ez-border)] backdrop-blur-md rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[var(--ez-accent)]/10 text-[var(--ez-accent)] shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {t.cookie.text}{' '}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-[var(--ez-accent)] underline hover:brightness-110 cursor-pointer"
            >
              {t.cookie.details}
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          className="w-full sm:w-auto px-4 py-2 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t.cookie.accept}</span>
        </button>
      </div>
    </div>
  );
};
