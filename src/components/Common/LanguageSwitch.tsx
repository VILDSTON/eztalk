import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Language } from '../../locales';
import { Globe } from 'lucide-react';

import { useLocation, useNavigate } from 'react-router-dom';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
];

export const LanguageSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSwitch = (code: Language) => {
    setLanguage(code);
    const path = location.pathname;
    const hasLangPrefix = /^\/(en|ru|uz)(\/|$)/.test(path);
    
    let targetPath = path;
    if (hasLangPrefix) {
      targetPath = path.replace(/^\/(en|ru|uz)(\/|$)/, `/${code}$2`);
    } else {
      targetPath = `/${code}${path === '/' ? '' : path}`;
    }
    
    navigate(targetPath + location.search, { replace: true });
  };

  return (
    <div className={`inline-flex items-center gap-1 bg-[var(--ez-base)] p-1 rounded-xl border border-[var(--ez-border)] shadow-sm ${className}`}>
      <Globe className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5 shrink-0" />
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => handleSwitch(code)}
          aria-label={`Switch language to ${label}`}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer select-none ${
            language === code
              ? 'bg-[var(--ez-accent)] text-zinc-950 shadow-sm scale-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
