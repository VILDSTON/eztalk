import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Sparkles, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { User } from '../../types/chat';
import { ApiService, CURATED_AVATARS } from '../../services/api';
import { normalizeHandle, sanitizeDisplayName } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';

interface AddFriendModalProps {
  isOpen: boolean;
  currentUser?: User | null;
  existingUsers?: User[];
  initialHandle?: string;
  onClose: () => void;
  onAddFriend: (newFriend: User, alias?: string) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  currentUser,
  existingUsers = [],
  initialHandle = '',
  onClose,
  onAddFriend,
}) => {
  const { t } = useTranslation();
  const [handle, setHandle] = useState(initialHandle);
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const lastFilledHandleRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      setHandle(initialHandle);
      setErrorMessage('');
      setLoading(false);
      lastFilledHandleRef.current = '';
      if (initialHandle) {
        const clean = normalizeHandle(initialHandle);
        const match = existingUsers.find((u) => normalizeHandle(u.handle) === clean);
        if (match && match.name) {
          setName(match.name);
          lastFilledHandleRef.current = clean;
        } else {
          setName('');
        }
      } else {
        setName('');
      }
    }
  }, [isOpen, initialHandle, existingUsers]);

  // Auto-fill Custom Name ONLY when handle transitions to a new matching user
  useEffect(() => {
    const cleanHandle = normalizeHandle(handle || '');
    if (!cleanHandle) {
      lastFilledHandleRef.current = '';
      return;
    }
    if (cleanHandle !== lastFilledHandleRef.current) {
      const exactMatch = existingUsers.find((u) => normalizeHandle(u.handle) === cleanHandle);
      if (exactMatch && exactMatch.name) {
        setName(exactMatch.name);
        lastFilledHandleRef.current = cleanHandle;
      }
    }
  }, [handle, existingUsers]);

  if (!isOpen) return null;

  const handleAction = async (useAlias: boolean) => {
    let currentHandle = handle || '';
    if (!currentHandle.trim()) return;
    
    if (!currentHandle.startsWith('@')) {
      currentHandle = '@' + currentHandle;
      setHandle(currentHandle);
    }
    
    const formattedHandle = normalizeHandle(currentHandle);

    if (currentUser && normalizeHandle(currentUser.handle) === formattedHandle) {
      setErrorMessage('You cannot start a chat with yourself.');
      return;
    }

    setLoading(true);
    try {
      let targetUser = existingUsers.find((u) => normalizeHandle(u.handle) === formattedHandle);
      if (!targetUser) {
        targetUser = await ApiService.getUserByHandle(formattedHandle);
      }

      if (targetUser) {
        if (useAlias && name.trim() && currentUser) {
          ApiService.setContactAlias(currentUser.handle, formattedHandle, name.trim());
        }
        onAddFriend(targetUser, useAlias ? name.trim() : undefined);
        setHandle('');
        setName('');
        setErrorMessage('');
        onClose();
        return;
      } else {
        setErrorMessage('User not found. Check the @handle and try again.');
      }
    } catch {
      setErrorMessage('User not found. Check the @handle and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAction(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center glass-overlay animate-fade-in select-none p-0 sm:p-4">
      <div className="bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-md p-4 sm:p-6 shadow-none sm:shadow-glass-lg relative flex flex-col justify-between overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ez-border/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{t.friends.findUsersTitle}</h3>
              <p className="text-[11px] text-ez-muted">{t.friends.findUsersSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/25 p-2.5 rounded-xl text-red-400 text-xs animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                {t.auth.username}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val && !val.startsWith('@') && !val.includes('@')) {
                      val = '@' + val;
                    }
                    setHandle(val);
                    setErrorMessage('');
                  }}
                  placeholder="@username (e.g. @test3)"
                  className="w-full bg-ez-base border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
                />
                {loading && (
                  <div className="absolute right-3 w-4 h-4 rounded-full border-2 border-[var(--ez-accent)] border-t-transparent animate-spin" />
                )}
              </div>
            </div>


            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t.friends.displayNameOptional}
                </label>
                <span className="text-[10px] text-ez-muted font-mono">{name.length}/25</span>
              </div>
              <input
                type="text"
                maxLength={25}
                value={name}
                onChange={(e) => setName(sanitizeDisplayName(e.target.value))}
                placeholder={t.auth.fullName}
                className="w-full bg-ez-base border border-ez-border focus:border-[var(--ez-accent)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-ez-muted outline-none transition-colors duration-150"
              />
            </div>
          </div>

          <div className="pt-6 mt-auto flex space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => handleAction(false)}
              disabled={loading || !(handle || '').trim()}
              className="flex-1 px-4 py-2.5 bg-ez-hover hover:bg-ez-border text-gray-300 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer disabled:opacity-50"
            >
              {t.friends.skipAdd}
            </button>
            <button
              type="submit"
              disabled={loading || !(handle || '').trim()}
              className="flex-1 px-4 py-2.5 bg-neon-green hover:bg-neon-green-light text-black font-bold text-sm rounded-xl shadow-neon-sm hover:shadow-neon-md transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? t.common.loading : t.common.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
