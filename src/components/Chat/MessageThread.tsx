import React, { useEffect, useRef } from 'react';
import { Message, QuotedMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';

interface MessageThreadProps {
  messages: Message[];
  currentUserId?: string;
  currentUserHandle?: string;
  isGroupChat?: boolean;
  isTyping?: boolean;
  recipientHandle?: string;
  onReply?: (quoted: QuotedMessage) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  currentUserId,
  currentUserHandle,
  isGroupChat = false,
  isTyping = false,
  recipientHandle,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar bg-[#16171b] flex flex-col">
      {/* Dynamic top spacer that pushes recent messages right above input box */}
      <div className="flex-1 min-h-4" />

      {messages.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-xs">
          <p>No messages here yet.</p>
          <p className="mt-1 text-[11px] text-gray-600">Send a message to start the conversation!</p>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            currentUserId={currentUserId}
            currentUserHandle={currentUserHandle}
            isGroupChat={isGroupChat}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleReaction={onToggleReaction}
          />
        ))
      )}

      {/* Real-time Typing Indicator Bubble */}
      {isTyping && (
        <div className="flex flex-col items-start mb-3 animate-fade-in">
          <div className="px-4 py-3 rounded-2xl bg-[#2a2c34] border border-[#353842]/40 rounded-bl-md flex items-center space-x-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#00ff73] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-[#00ff73] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-[#00ff73] animate-bounce" />
          </div>
          <span className="text-[10px] text-gray-400 mt-1 ml-1 font-mono">
            {recipientHandle || 'Contact'} is typing...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
