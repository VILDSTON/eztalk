import React, { useState, useMemo, useEffect } from 'react';
import { User, Group, Message, Attachment, QuotedMessage } from '../../types/chat';
import { ChatHeader } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { ForwardModal } from './ForwardModal';
import { MediaLightboxModal } from './MediaLightboxModal';
import { UserPlus, X, Ban } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface ChatWindowProps {
  user?: User | null;
  group?: Group | null;
  messages: Message[];
  currentUserId?: string;
  currentUserHandle?: string;
  currentUser?: User | null;
  allUsers?: User[];
  allGroups?: Group[];
  onlineHandles?: string[];
  isMuted?: boolean;
  isTyping?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  isOnline?: boolean;
  isSavedMessages?: boolean;
  draftText?: string;
  onBack?: () => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
  onDraftChange?: (text: string) => void;
  onSendMessage: (
    text: string,
    attachment?: Attachment,
    replyTo?: QuotedMessage
  ) => void;
  onForwardMessage?: (message: Message, targetUser?: User, targetGroup?: Group) => void;
  onEditMessage?: (id: string, newText: string) => void;
  onDeleteMessage?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onClearChat?: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
  onDeleteGroup?: () => void;
  onStartCall?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoadingInitial?: boolean;
  onLoadMore?: () => Promise<void>;
  onRetryMessage?: (message: Message) => void;
  currentAlias?: string;
  originalName?: string;
  onEditAlias?: () => void;
  onSaveAlias?: (newAlias: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  user,
  group,
  messages,
  currentUserId,
  currentUserHandle,
  currentUser,
  allUsers = [],
  allGroups = [],
  onlineHandles = [],
  isMuted = false,
  isTyping = false,
  isFriend = true,
  isBlocked = false,
  isOnline = false,
  isSavedMessages = false,
  draftText = '',
  onBack,
  onToggleMute,
  onToggleBlock,
  onDraftChange,
  onSendMessage,
  onForwardMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
  onDeleteGroup,
  onStartCall,
  hasMore,
  isLoadingMore,
  isLoadingInitial,
  onLoadMore,
  onRetryMessage,
  currentAlias,
  originalName,
  onEditAlias,
  onSaveAlias,
}) => {
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    name?: string;
    type?: 'image' | 'video' | 'file' | 'audio';
  } | null>(null);
  const [showAddBanner, setShowAddBanner] = useState(true);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  const activeChatId = group ? group.id : user ? (user.id || user.handle) : null;

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setForwardingMessage(null);
    setInChatSearchQuery('');
    setShowAddBanner(true);
  }, [activeChatId]);

  const { t } = useTranslation();

  const recipientLabel = group ? group.name : user ? user.name || user.handle : 'Contact';

  // In-chat search filter
  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const clean = inChatSearchQuery.trim().toLowerCase();
    return messages.filter(
      (m) =>
        (m.text && m.text.toLowerCase().includes(clean)) ||
        (m.attachment?.name && m.attachment.name.toLowerCase().includes(clean))
    );
  }, [messages, inChatSearchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full w-full min-w-0 min-h-0 bg-ez-base select-none overflow-hidden relative font-sans">
      {/* Header */}
      <ChatHeader
        user={user}
        group={group}
        messages={messages}
        isMuted={isMuted}
        isFriend={isFriend}
        isBlocked={isBlocked}
        isOnline={isOnline}
        isTyping={isTyping}
        isSavedMessages={isSavedMessages}
        onBack={onBack}
        onSearchChange={(q) => setInChatSearchQuery(q)}
        onToggleMute={onToggleMute}
        onToggleBlock={onToggleBlock}
        onClearChat={onClearChat}
        onRemoveFriend={onRemoveFriend}
        onAddFriend={onAddFriend}
        onDeleteGroup={onDeleteGroup}
        onStartCall={onStartCall}
        currentAlias={currentAlias}
        originalName={originalName}
        onEditAlias={onEditAlias}
        onSaveAlias={onSaveAlias}
      />

      {/* Blocked User Banner */}
      {isBlocked && user && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between animate-fade-in select-none">
          <div className="flex items-center space-x-2 text-xs text-rose-300">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              You have blocked <strong className="text-white font-mono">{user.handle}</strong>.
            </span>
          </div>
          {onToggleBlock && (
            <button
              type="button"
              onClick={onToggleBlock}
              className="px-3 py-1 bg-neon-green hover:bg-neon-green-light text-black font-bold text-xs rounded-xl shadow-neon-sm transition-colors cursor-pointer"
            >
              Unblock
            </button>
          )}
        </div>
      )}

      {/* Non-Friend Banner */}
      {!isBlocked && !group && user && !isFriend && !isSavedMessages && showAddBanner && (
        <div className="border-b border-ez-border/40 bg-ez-elevated px-4 sm:px-6 py-3 flex items-center justify-between animate-fade-in select-none gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neon-green/20 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">
                <span className="font-mono text-neon-green">{user.handle}</span> не в вашем списке
              </p>
              <p className="text-[10px] text-ez-muted mt-0.5">Добавьте в друзья, чтобы общаться</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAddFriend && (
              <button
                type="button"
                onClick={onAddFriend}
                className="px-3 py-1.5 bg-neon-green hover:brightness-110 text-black font-bold text-xs rounded-xl shadow-neon-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                + Добавить
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddBanner(false)}
              className="w-7 h-7 flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 rounded-full transition-colors duration-150 cursor-pointer"
              title="Скрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Message History */}
      <MessageThread
        messages={displayedMessages}
        currentUserId={currentUserId}
        currentUserHandle={currentUserHandle}
        isGroupChat={Boolean(group)}
        isTyping={isTyping}
        recipientHandle={recipientLabel}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        isLoadingInitial={isLoadingInitial}
        onLoadMore={onLoadMore}
        onReply={(msg) => setReplyingTo(msg)}
        onForward={(msg) => setForwardingMessage(msg)}
        onEdit={(msg: Message) => setEditingMessage({ id: msg.id, text: msg.text })}
        onDelete={onDeleteMessage}
        onToggleReaction={onToggleReaction}
        onOpenMedia={(m) => setLightboxMedia(m)}
        onCallBack={onStartCall}
        onRetry={onRetryMessage}
      />

      {/* Fluid Media Lightbox Viewer */}
      {lightboxMedia && (
        <MediaLightboxModal
          isOpen={Boolean(lightboxMedia)}
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && currentUser && (
        <ForwardModal
          isOpen={Boolean(forwardingMessage)}
          message={forwardingMessage}
          currentUser={currentUser}
          contacts={allUsers}
          groups={allGroups}
          onlineHandles={onlineHandles}
          onClose={() => setForwardingMessage(null)}
          onForward={(msg, targetUser, targetGroup) => {
            if (onForwardMessage) {
              onForwardMessage(msg, targetUser, targetGroup);
            }
            setForwardingMessage(null);
          }}
        />
      )}

      {/* Input Bar or Blocked Action */}
      {isBlocked ? (
        <div className="p-4 bg-ez-surface/90 border-t border-ez-border/50 flex items-center justify-center space-x-3 text-center">
          <span className="text-xs text-rose-400 font-semibold flex items-center space-x-1.5">
            <Ban className="w-4 h-4" />
            <span>{t.chat.blockedBanner}</span>
          </span>
          {onToggleBlock && (
            <button
              type="button"
              onClick={onToggleBlock}
              className="px-4 py-1.5 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold shadow-neon-sm transition-colors cursor-pointer"
            >
              {t.chat.unblock}
            </button>
          )}
        </div>
      ) : (
        <MessageInput
          key={activeChatId || 'input'}
          currentUserHandle={currentUserHandle}
          enterToSend={currentUser?.settings?.enterToSend !== false}
          initialDraft={draftText}
          onDraftChange={onDraftChange}
          onSendMessage={(text, attachment, replyTo) => {
            onSendMessage(text, attachment, replyTo);
            setReplyingTo(null);
          }}
          onSaveEdit={(id, newText) => {
            if (onEditMessage) {
              onEditMessage(id, newText);
            }
            setEditingMessage(null);
          }}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          recipientHandle={recipientLabel}
        />
      )}
    </div>
  );
};
