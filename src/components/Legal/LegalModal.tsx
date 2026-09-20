import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Lock } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const { t } = useTranslation();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--ez-surface)] border border-[var(--ez-border)] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--ez-border)] flex items-center justify-between bg-[var(--ez-base)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ez-accent)]/10 border border-[var(--ez-accent)] flex items-center justify-center text-[var(--ez-accent)]">
              {activeTab === 'privacy' ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-100">
                {activeTab === 'privacy' ? (t as any).legal?.privacyTitle : (t as any).legal?.termsTitle}
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">{(t as any).legal?.revision}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[var(--ez-base)] p-1 mx-4 sm:mx-6 mt-4 rounded-xl border border-[var(--ez-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'privacy'
                ? 'bg-[var(--ez-accent)] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {(t as any).legal?.privacyTitle}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'terms'
                ? 'bg-[var(--ez-accent)] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {(t as any).legal?.termsTitle}
          </button>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed custom-scrollbar">
          {activeTab === 'privacy' ? (
            <>
              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[var(--ez-accent)]" /> {(t as any).legal?.privacy1Title}
                </h3>
                <p>
                  {(t as any).legal?.privacy1Text}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm">{(t as any).legal?.privacy2Title}</h3>
                <p>
                  {(t as any).legal?.privacy2Text}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm">{(t as any).legal?.privacy3Title}</h3>
                <p>
                  {(t as any).legal?.privacy3Text}
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm">{(t as any).legal?.sec1Title}</h3>
                <p>
                  {(t as any).legal?.sec1Text}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm">{(t as any).legal?.sec2Title}</h3>
                <p>
                  {(t as any).legal?.sec2Text}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-sm">{(t as any).legal?.sec3Title}</h3>
                <p>
                  {(t as any).legal?.sec3Text}
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--ez-border)] bg-[var(--ez-base)]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            {(t as any).legal?.close}
          </button>
        </div>
      </div>
    </div>
  );
};
