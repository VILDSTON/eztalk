import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, User as UserIcon } from 'lucide-react';
import { User } from '../../types/chat';
import { sanitizeDisplayName } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';

interface EditContactNameModalProps {
  isOpen: boolean;
  user: User;
  currentAlias?: string;
  originalName?: string;
  onClose: () => void;
  onSave: (newAlias: string) => void;
}

export const EditContactNameModal: React.FC<EditContactNameModalProps> = ({
  isOpen,
  user,
  currentAlias = '',
  originalName = '',
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  const fallbackOriginal = originalName || user.handle;

  useEffect(() => {
    if (isOpen) {
      setName(currentAlias || user.name || '');
    }
  }, [isOpen, currentAlias, user.name]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeDisplayName(name).trim();
    onSave(clean);
    onClose();
  };

  const handleReset = () => {
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-sm bg-ez-elevated border border-ez-border/80 rounded-3xl p-5 shadow-2xl relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ez-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--ez-accent)]/15 border border-neon-green/50 text-[var(--ez-accent)] flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {t.profile?.editName || 'Change Name'}
              </h3>
              <p className="text-[11px] text-ez-muted font-mono flex items-center gap-1">
                <span>{user.handle}</span>
                {user.statusEmoji && <span className="text-xs shrink-0 select-none leading-none">{user.statusEmoji}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-ez-muted uppercase tracking-wider block">
                {t.profile.customNameLabel}
              </label>
              <span className="text-[10px] text-ez-muted font-mono">{name.length}/25</span>
            </div>
            <input
              type="text"
              autoFocus
              maxLength={25}
              value={name}
              onChange={(e) => setName(sanitizeDisplayName(e.target.value))}
              placeholder={fallbackOriginal}
              className="w-full bg-ez-base border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
            />
            <p className="text-[11px] text-ez-muted mt-1.5">
              {t.profile.customNameHint}
            </p>
          </div>

          {/* Reset button if custom alias currently exists */}
          {Boolean(currentAlias) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.profile.resetToOriginal} ({fallbackOriginal})</span>
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 border border-white/5 transition-colors cursor-pointer"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[var(--ez-accent)] hover:brightness-110 text-black text-xs font-bold shadow-neon-sm transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t.common.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
