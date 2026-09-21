import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { ArrowDown, Loader2, Calendar } from 'lucide-react';
import { Message, QuotedMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { normalizeHandle } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';
import { formatMessageDateDivider } from '../../utils/dateTime';

interface MessageThreadProps {
  messages: Message[];
  currentUserId?: string;
  currentUserHandle?: string;
  isGroupChat?: boolean;
  isTyping?: boolean;
  recipientHandle?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoadingInitial?: boolean;
  onLoadMore?: () => Promise<void>;
  onReply?: (quoted: QuotedMessage) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenMedia?: (media: { url: string; name?: string; type?: 'image' | 'video' | 'file' | 'audio' }) => void;
  onCallBack?: () => void;
  onRetry?: (message: Message) => void;
}



function getDateKey(createdAt?: string, timestamp?: string): string {
  let date: Date | null = null;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date) date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function isTodayDate(createdAt?: string, timestamp?: string): boolean {
  let date: Date | null = null;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export const MessageThread: React.FC<MessageThreadProps> = React.memo(({
  messages,
  currentUserId,
  currentUserHandle,
  isGroupChat = false,
  isTyping = false,
  recipientHandle,
  hasMore = false,
  isLoadingMore = false,
  isLoadingInitial = false,
  onLoadMore,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
  onCallBack,
  onRetry,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isScrolledPastToday, setIsScrolledPastToday] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMessagesLengthRef = useRef(messages.length);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevFirstMsgIdRef = useRef<string | null>(messages[0]?.id || null);
  const isPrependRef = useRef(false);
  const { t, language } = useTranslation();

  const todayText = useMemo(() => t?.chat?.today || 'Today', [t]);
  const hasTodayMessages = useMemo(() => messages.some((m) => isTodayDate(m.createdAt, m.timestamp)), [messages]);

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const pill = todayRef.current.querySelector('.today-pill');
      if (pill) {
        pill.classList.add('scale-110', 'border-[var(--ez-accent)]', 'bg-[var(--ez-accent)]/20');
        setTimeout(() => {
          pill.classList.remove('scale-110', 'border-[var(--ez-accent)]', 'bg-[var(--ez-accent)]/20');
        }, 1200);
      }
    } else {
      scrollToBottom();
    }
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceToBottom > 80;
    setIsScrolledUp(isUp);
    if (!isUp) {
      setNewMessagesCount(0);
    }

    if (todayRef.current) {
      const todayRect = todayRef.current.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      setIsScrolledPastToday(todayRect.top > containerRect.bottom - 40);
    } else {
      setIsScrolledPastToday(false);
    }

    // Infinite scroll trigger: when scrolled near the top (< 60px) and older messages exist
    if (el.scrollTop < 60 && hasMore && !isLoadingMore && onLoadMore) {
      scrollSnapshotRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
      isPrependRef.current = true;
      onLoadMore();
    }
  };

  // Asynchronous virtual DOM scroll restoration via useLayoutEffect
  // Guarantees layout is measured AFTER React updates the DOM tree but BEFORE browser paints
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (scrollSnapshotRef.current) {
      const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollSnapshotRef.current;
      const heightDelta = el.scrollHeight - prevScrollHeight;
      if (heightDelta > 0) {
        el.scrollTop = prevScrollTop + heightDelta;
      }
      scrollSnapshotRef.current = null;
    }
  }, [messages]);

  useEffect(() => {
    setIsScrolledUp(false);
    setNewMessagesCount(0);
    setInitialLoadComplete(false);
    initialMessageIdsRef.current.clear();
    prevMessagesLengthRef.current = messages.length;
    prevFirstMsgIdRef.current = messages[0]?.id || null;

    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [recipientHandle]);

  useEffect(() => {
    const isNewMessageAdded = messages.length > prevMessagesLengthRef.current;
    const firstMsgId = messages[0]?.id || null;
    const wasPrepended =
      isPrependRef.current ||
      (isNewMessageAdded && firstMsgId !== prevFirstMsgIdRef.current && prevFirstMsgIdRef.current !== null);
    isPrependRef.current = false;
    prevFirstMsgIdRef.current = firstMsgId;

    const isInitial = !initialLoadComplete;
    if (!initialLoadComplete) {
      if (messages.length > 0) {
        messages.forEach(m => initialMessageIdsRef.current.add(m.id));
        setInitialLoadComplete(true);
      }
    }

    // Skip auto-scrolling to bottom on history prepends
    if (wasPrepended) {
      prevMessagesLengthRef.current = messages.length;
      return;
    }

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
        bottomRef.current?.scrollIntoView({ behavior: isInitial ? 'auto' : 'smooth' });
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
        {/* Message Canvas (Full width) */}
        <div className="w-full px-4 sm:px-6 flex flex-col flex-1 min-h-full">
          {/* Top flexible spacer: pushes few messages down to the bottom (like Telegram/WhatsApp) */}
          {messages.length > 0 && <div className="flex-1 min-h-0" />}

          {/* Top spacer & Infinite Scroll Spinner */}
          {isLoadingMore && hasMore ? (
            <div className="flex justify-center py-2.5 my-1 select-none shrink-0">
              <div className="flex items-center space-x-2 bg-ez-elevated/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-ez-border/60 shadow-glass">
                <Loader2 className="w-3.5 h-3.5 text-neon-green animate-spin" />
                <span className="text-[11px] font-mono text-ez-muted">{t.chat?.loadingEarlier || 'Loading earlier messages...'}</span>
              </div>
            </div>
          ) : !hasMore && messages.length > 0 ? (
            <div className="flex justify-center py-4 my-1 select-none shrink-0">
              <span className="text-[11px] font-mono text-ez-muted/50 uppercase tracking-widest">{t.chat?.startOfHistory || 'Start of history'}</span>
            </div>
          ) : null}

          {isLoadingInitial && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent animate-fade-in">
              <Loader2 className="w-8 h-8 text-neon-green animate-spin opacity-80" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-fade-in">
              {/* Glowing icon */}
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-neon-green/20 blur-2xl rounded-full scale-150 pointer-events-none" />
                <div className="relative w-20 h-20 rounded-2xl bg-ez-elevated border border-ez-border/60 flex items-center justify-center text-3xl shadow-glass">
                  💬
                </div>
              </div>
              <p className="font-bold text-zinc-100 text-base mb-1.5">{t.chat?.noMessages || 'No messages yet'}</p>
              <p className="text-ez-muted text-xs text-center max-w-[200px] leading-relaxed">{t.chat?.sendToStart || 'Send a message to start the conversation'}</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const currentKey = getDateKey(msg.createdAt, msg.timestamp);
              const prevKey = prevMsg ? getDateKey(prevMsg.createdAt, prevMsg.timestamp) : null;
              const showDateDivider = currentKey !== prevKey;

              return (
                <React.Fragment key={msg.id}>
                  {showDateDivider && (
                    <div className="flex justify-center my-3 select-none">
                      <span className="bg-ez-elevated/80 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-semibold text-gray-300 shadow-elevated border border-ez-border/50">
                        {formatMessageDateDivider(msg.createdAt, msg.timestamp, t, language)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    currentUserId={currentUserId}
                    currentUserHandle={currentUserHandle}
                    isGroupChat={isGroupChat}
                    onReply={onReply}
                    onForward={onForward}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleReaction={onToggleReaction}
                    onOpenMedia={onOpenMedia}
                    onCallBack={onCallBack}
                    onRetry={onRetry}
                    isNewMessage={initialLoadComplete && !initialMessageIdsRef.current.has(msg.id)}
                  />
                </React.Fragment>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start mb-2 animate-fade-in font-sans">
              <div className="bg-ez-received border border-ez-border/50 px-3.5 py-3 rounded-[16px] rounded-bl-sm flex items-center space-x-1.5 w-fit telegram-bubble-in shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full animate-dot-bounce opacity-80" style={{ backgroundColor: 'var(--ez-accent)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-dot-bounce [animation-delay:0.16s] opacity-80" style={{ backgroundColor: 'var(--ez-accent)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-dot-bounce [animation-delay:0.32s] opacity-80" style={{ backgroundColor: 'var(--ez-accent)' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
          {/* Bottom spacing so last message has comfortable breathing room above MessageInput */}
          <div className="h-1 sm:h-1 shrink-0 w-full" aria-hidden="true" />
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Scroll To Bottom */}
      {isScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-5 right-4 sm:right-8 z-30 w-10 h-10 rounded-full bg-ez-elevated/95 hover:bg-ez-hover text-neon-green border border-neon-green/30 shadow-glass backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center animate-scale-up"
          title={t.chat.scrollToBottom}
        >
          <ArrowDown className="w-5 h-5" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-neon-green text-black text-[10px] font-black min-w-[20px] h-5 flex items-center justify-center shadow-neon-sm animate-scale-up">
              {newMessagesCount > 99 ? '99+' : newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
});
