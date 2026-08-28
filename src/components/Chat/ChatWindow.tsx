import React, { useState } from 'react';
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
  onToggleMute?: () => void;
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
  onToggleMute,
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

  const recipientLabel = group ? group.name : user?.handle;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#16171b] overflow-hidden">
      {/* Header */}
      <ChatHeader
        user={user}
        group={group}
        messages={messages}
        isMuted={isMuted}
        isFriend={isFriend}
        onToggleMute={onToggleMute}
        onClearChat={onClearChat}
        onRemoveFriend={onRemoveFriend}
        onAddFriend={onAddFriend}
        onDeleteGroup={onDeleteGroup}
        onStartCall={onStartCall}
      />

      {/* Non-Friend Prompt Banner */}
      {!group && user && !isFriend && showAddBanner && (
        <div className="bg-[#1b1d24] border-b border-[#2b2e3a] px-6 py-2.5 flex items-center justify-between animate-fade-in select-none">
          <div className="flex items-center space-x-2.5 text-xs text-gray-300">
            <div className="p-1 rounded-md bg-[#00ff73]/10 text-[#00ff73]">
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
                className="px-3 py-1 bg-[#00ff73] hover:bg-[#1aff85] text-black font-bold text-xs rounded-lg shadow-neon-sm transition-colors cursor-pointer"
              >
                + Add to Friends
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddBanner(false)}
              className="p-1 text-gray-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Message History */}
      <MessageThread
        messages={messages}
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
      <div className="p-4 bg-[#16171b]">
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
    </div>
  );
};
