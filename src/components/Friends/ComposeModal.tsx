import React, { useState, useEffect } from 'react';
import { X, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react';
import { User } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';
import { ApiService } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';

interface ComposeModalProps {
  isOpen: boolean;
  users?: User[];
  existingUsers?: User[];
  currentUserHandle?: string;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  users = [],
  existingUsers = [],
  currentUserHandle,
  onClose,
  onSelectUser,
}) => {
  const { t } = useTranslation();
  const [handle, setHandle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHandle('');
      setErrorMessage('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let currentHandle = handle.trim();
    if (!currentHandle) return;

    if (!currentHandle.startsWith('@')) {
      currentHandle = '@' + currentHandle;
    }

    const clean = normalizeHandle(currentHandle);
    const myHandle = normalizeHandle(currentUserHandle || '');

    if (myHandle && clean.toLowerCase() === myHandle.toLowerCase()) {
      setErrorMessage(t.friends?.cannotChatWithSelf || 'You cannot start a chat with yourself.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const rawList = existingUsers.length > 0 ? existingUsers : users;
      let targetUser = rawList.find(
        (u) => normalizeHandle(u.handle).toLowerCase() === clean.toLowerCase()
      );

      if (!targetUser) {
        targetUser = await ApiService.getUserByHandle(clean);
      }

      if (targetUser) {
        onSelectUser(targetUser);
        onClose();
        setHandle('');
      } else {
        setErrorMessage(t.friends?.userNotFound || 'User not found. Check the @handle and try again.');
      }
    } catch {
      setErrorMessage(t.friends?.userNotFound || 'User not found. Check the @handle and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 select-none font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 glass-overlay animate-fade-in" />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg overflow-hidden z-10 flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-ez-border/50 bg-ez-surface shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{t.friends.composeTitle}</h3>
              <p className="text-xs text-ez-muted">{t.friends.composeSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-5 mt-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-red-400 text-xs animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Direct Handle Input Form */}
        <form onSubmit={handleStartChat} className="p-4 sm:p-5 flex flex-col space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              {t.auth.username}
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-neon-green font-mono font-bold text-sm pointer-events-none select-none">
                @
              </div>
              <input
                type="text"
                value={handle.startsWith('@') ? handle.slice(1) : handle}
                onChange={(e) => {
                  const val = e.target.value.trim().replace(/\s+/g, '');
                  setHandle(val ? `@${val}` : '');
                  setErrorMessage('');
                }}
                placeholder="username"
                className="w-full bg-ez-base border border-ez-border focus:border-neon-green rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150 font-mono shadow-inner"
                autoFocus
              />
              {handle && (
                <button
                  type="button"
                  onClick={() => {
                    setHandle('');
                    setErrorMessage('');
                  }}
                  className="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-ez-muted mt-2">
              {t.friends.enterHandlePlaceholder || 'Enter @username (e.g. @alexr)'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="w-full px-4 py-3 bg-neon-green hover:bg-neon-green-light text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <>
                <span>{t.friends.startChat || t.chat.message || 'Start Chat'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
