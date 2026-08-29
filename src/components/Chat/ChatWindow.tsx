import React, { useState, useMemo } from 'react';
import { User, Group, Message, Attachment, QuotedMessage } from '../../types/chat';
import { ChatHeader } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { UserPlus, X } from 'lucide-react';

interface ChatWindowProps {
  user?: User | null;
  group?: Group | null;
  messages: Message[];
  currentUserId?: string;
  currentUserHandle?: string;
  isMuted?: boolean;
  isTyping?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
  isSavedMessages?: boolean;
  onBack?: () => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
  onSendMessage: (text: string, attachment?: Attachment, replyTo?: QuotedMessage) => void;
  onEditMessage?: (id: string, newText: string) => void;
  onDeleteMessage?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onClearChat?: () => void;
  onRemoveFriend?: () => void;
  onAddFriend?: () => void;
  onDeleteGroup?: () => void;
  onStartCall?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  user,
  group,
  messages,
  currentUserId,
  currentUserHandle,
  isMuted = false,
  isTyping = false,
  isFriend = true,
  isBlocked = false,
  isSavedMessages = false,
  onBack,
  onToggleMute,
  onToggleBlock,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onClearChat,
  onRemoveFriend,
  onAddFriend,
  onDeleteGroup,
  onStartCall,
}) => {
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [showAddBanner, setShowAddBanner] = useState(true);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  const recipientLabel = group ? group.name : user?.handle;

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
    <div className="flex-1 flex flex-col h-full bg-ez-base overflow-hidden">
      {/* Header */}
      <ChatHeader
        user={user}
        group={group}
        messages={messages}
        isMuted={isMuted}
        isFriend={isFriend}
        isBlocked={isBlocked}
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
      />

      {/* Non-Friend Banner */}
      {!group && user && !isFriend && !isSavedMessages && showAddBanner && (
        <div className="bg-ez-elevated border-b border-ez-border/50 px-6 py-2.5 flex items-center justify-between animate-fade-in select-none">
          <div className="flex items-center space-x-2.5 text-xs text-gray-300">
            <div className="p-1 rounded-md bg-neon-green/10 text-neon-green">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong className="text-white font-mono">{user.handle}</strong> is not in your friends list.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {onAddFriend && (
              <button
                type="button"
                onClick={onAddFriend}
                className="px-3 py-1 bg-neon-green hover:bg-neon-green-light text-black font-bold text-xs rounded-lg shadow-neon-sm transition-colors duration-150 cursor-pointer"
              >
                + Add to Friends
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddBanner(false)}
              className="p-1 text-ez-muted hover:text-white rounded-md transition-colors duration-150 cursor-pointer"
              title="Dismiss banner"
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
        onReply={(msg) => setReplyingTo(msg)}
        onEdit={(msg: Message) => setEditingMessage({ id: msg.id, text: msg.text })}
        onDelete={onDeleteMessage}
        onToggleReaction={onToggleReaction}
      />

      {/* Input Bar */}
      <MessageInput
        onSendMessage={(text, attachment, replyTo) => {
          if (editingMessage && onEditMessage) {
            onEditMessage(editingMessage.id, text);
            setEditingMessage(null);
          } else {
            onSendMessage(text, attachment, replyTo);
            setReplyingTo(null);
          }
        }}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        recipientHandle={recipientLabel}
      />
    </div>
  );
};
