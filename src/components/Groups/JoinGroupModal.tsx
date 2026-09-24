import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Group, User } from '../../types/chat';
import { ApiService } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';

interface JoinGroupModalProps {
  isOpen: boolean;
  groupId: string;
  currentUser: User | null;
  onClose: () => void;
  onJoined: (group: Group) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  groupId,
  currentUser,
  onClose,
  onJoined,
}) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !groupId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    ApiService.getGroupById(groupId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setGroup(data);
        } else {
          setError((t as any)?.groups?.groupNotFound || 'Group not found or invite link has expired.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load group info:', err);
        setError((t as any)?.groups?.groupNotFound || 'Failed to load group details.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, groupId, t]);

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!groupId || !currentUser) return;
    setIsJoining(true);
    try {
      const updatedGroup = await ApiService.joinGroup(groupId);
      onJoined(updatedGroup);
      onClose();
    } catch (err: any) {
      console.error('Failed to join group:', err);
      setError(err?.message || 'Failed to join group.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/80 backdrop-blur-md animate-fade-in select-none p-0 sm:p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-sm shadow-none sm:shadow-glass-lg relative overflow-hidden flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common?.close || 'Close'}
          className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all duration-150 cursor-pointer shadow-glass border border-white/10 hover:scale-105"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Top Glow */}
        <div className="h-28 w-full relative bg-cover bg-center overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--ez-accent-glow),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ez-elevated via-ez-elevated/20 to-transparent pointer-events-none" />
        </div>

        {/* Modal Content */}
        <div className="px-6 pb-6 pt-0 flex-1 flex flex-col items-center text-center -mt-14 relative z-20">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--ez-accent)] animate-spin" />
              <p className="text-xs text-ez-muted font-medium">
                {(t as any)?.groups?.loadingGroup || 'Loading group details...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center space-y-3 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-rose-400 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t.common?.close || 'Close'}
              </button>
            </div>
          ) : group ? (
            <>
              {/* Group Avatar */}
              <div className="relative mb-3 shrink-0">
                <div className="absolute -inset-1 rounded-full bg-[var(--ez-accent)] opacity-30 blur-md" />
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-ez-surface shadow-neon-sm border-2 border-white/10">
                  <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-neon-green text-black flex items-center justify-center text-[10px] font-bold border-2 border-ez-elevated shadow-sm">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Title & Creator */}
              <h3 className="text-xl font-bold text-white tracking-tight leading-tight px-4 truncate max-w-full">
                {group.name}
              </h3>
              <p className="text-xs font-mono text-[var(--ez-accent)] mt-1 font-semibold">
                {(t as any)?.groups?.createdLabel || 'Created by'} {group.creatorHandle}
              </p>

              {/* Members Count Badge */}
              <div className="mt-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-medium flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-ez-muted" />
                <span>
                  {group.memberHandles.length} {(t as any)?.groups?.membersCount || 'members'}
                </span>
              </div>

              <p className="text-xs text-ez-muted mt-4 max-w-xs">
                {(t as any)?.groups?.joinInviteDesc ||
                  'You were invited to join this group. You will be able to see message history and chat with group members.'}
              </p>

              {/* Action Buttons */}
              <div className="w-full mt-6 space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={handleJoin}
                  className="w-full py-3 px-4 rounded-2xl bg-neon-green hover:brightness-110 text-black font-bold text-sm shadow-neon-sm transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{(t as any)?.groups?.joining || 'Joining...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{(t as any)?.groups?.joinGroup || 'Join Group'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t.common?.cancel || 'Cancel'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
