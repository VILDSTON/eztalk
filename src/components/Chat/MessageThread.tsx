import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Message, QuotedMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { normalizeHandle } from '../../utils/chatStorage';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceToBottom > 130;
    setIsScrolledUp(isUp);
    if (!isUp) {
      setNewMessagesCount(0);
    }
  };

  useEffect(() => {
    const isNewMessageAdded = messages.length > prevMessagesLengthRef.current;
    const lastMsg = messages[messages.length - 1];
    const isMyMsg =
      lastMsg &&
      ((currentUserHandle &&
        lastMsg.senderHandle &&
        normalizeHandle(lastMsg.senderHandle) === normalizeHandle(currentUserHandle)) ||
        lastMsg.senderId === currentUserId ||
        lastMsg.senderId === 'me');

    if (isNewMessageAdded) {
      if (!isScrolledUp || isMyMsg) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setNewMessagesCount(0);
      } else {
        setNewMessagesCount((prev) => prev + (messages.length - prevMessagesLengthRef.current));
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isScrolledUp, currentUserHandle, currentUserId]);

  useEffect(() => {
    if (isTyping && !isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isTyping, isScrolledUp]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessagesCount(0);
    setIsScrolledUp(false);
  };

  return (
    <div className="flex-1 relative flex flex-col min-h-0 telegram-chat-bg overflow-hidden font-sans">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative py-4"
      >
        {/* Message Canvas */}
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col flex-1">
          {/* Top spacer */}
          <div className="flex-1 min-h-4" />

          {/* Date Badge */}
          {messages.length > 0 && (
            <div className="flex justify-center my-3 select-none">
              <span className="bg-ez-elevated/80 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-semibold text-gray-300 shadow-elevated border border-ez-border/50">
                Today
              </span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-20 text-ez-muted text-xs select-none flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-ez-elevated border border-ez-border/50 flex items-center justify-center text-2xl mb-4 shadow-glass">
                ✈️
              </div>
              <p className="font-bold text-gray-300 text-sm">No messages here yet...</p>
              <p className="mt-1.5 text-ez-muted text-xs max-w-[240px]">Send a message to start the conversation!</p>
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

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center space-x-2.5 text-xs text-neon-green font-medium py-2 px-3 mb-2 animate-fade-in select-none">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-dot-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-dot-bounce [animation-delay:0.16s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-dot-bounce [animation-delay:0.32s]" />
              </div>
              <span className="text-ez-muted text-[11px]">{recipientHandle || 'Contact'} is typing...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll To Bottom */}
      {isScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-5 right-8 z-30 w-10 h-10 rounded-full bg-ez-elevated hover:bg-ez-hover text-neon-green border border-ez-border shadow-glass transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center animate-fade-in"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-neon-green text-black text-[10px] font-black min-w-[18px] text-center">
              {newMessagesCount > 99 ? '99+' : newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
