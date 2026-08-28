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

  // Handle User Scroll Position
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

  // Auto-scroll on new messages ONLY if near bottom OR if sent by currentUser
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

  // Handle typing state scroll (only if already at the bottom)
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
    <div className="flex-1 relative flex flex-col min-h-0 bg-[#0f1014] overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar flex flex-col relative"
      >
        {/* Dynamic top spacer that pushes recent messages right above input box */}
        <div className="flex-1 min-h-4" />

        {messages.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-xs select-none flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
              💬
            </div>
            <p className="font-semibold text-gray-300">No messages here yet.</p>
            <p className="mt-1 text-[11px] text-gray-500">Send a message to start the conversation!</p>
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
          <div className="flex flex-col items-start mb-3 animate-fade-in select-none">
            <div className="px-4 py-3 rounded-2xl bg-[#1c1d25] border border-white/10 rounded-bl-sm flex items-center space-x-1.5 shadow-md">
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

      {/* Floating Scroll To Bottom Button */}
      {isScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 z-30 p-3 rounded-full bg-[#181920]/95 hover:bg-[#22242e] text-[#00ff73] border border-[#00ff73]/40 shadow-[0_0_20px_rgba(0,255,115,0.3)] transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center animate-fade-in backdrop-blur-md"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-[#00ff73] text-black text-[10px] font-black shadow-xs">
              {newMessagesCount > 99 ? '99+' : newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
