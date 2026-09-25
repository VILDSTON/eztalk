import React, { useState, useMemo } from 'react';
import {
  Menu,
  Search,
  X,
  SquarePen,
  Users,
  Globe,
  Trash2,
  MessageSquare,
  Bookmark,
  Pin,
  Flame,
} from 'lucide-react';
import { User, Group, Message } from '../../types/chat';
import { ComposeModal } from './ComposeModal';
import { CreateGroupModal } from '../Groups/CreateGroupModal';
import { CreateDisposableModal } from '../Disposable/CreateDisposableModal';
import { ChatContextMenu } from './ChatContextMenu';
import { normalizeHandle, getDisplayAvatar, getDisplayBio, isUserBlockedBy } from '../../utils/chatStorage';
import { useTranslation } from '../../context/LanguageContext';
import { formatChatListTime } from '../../utils/dateTime';
import { ConfirmModal } from '../Common/ConfirmModal';



function renderMessagePreview(msg: Message, currentHandle?: string, t?: any) {
  const isMe = normalizeHandle(msg.senderHandle).toLowerCase() === normalizeHandle(currentHandle || '').toLowerCase();

  let contentNode: React.ReactNode = null;

  if (msg.callInfo) {
    const isMissed = msg.callInfo.type === 'missed' || msg.callInfo.type === 'declined' || msg.callInfo.type === 'canceled';
    contentNode = (
      <span className={isMissed ? 'text-rose-400 font-medium' : 'text-ez-muted'}>
        📞 {isMissed ? t?.chat?.callCanceled : t?.chat?.voiceCall}
      </span>
    );
  } else if (msg.attachment) {
    if (msg.attachment.type === 'audio') {
      contentNode = <span className="text-ez-muted">🎤 {t?.chat?.voiceMessage}</span>;
    } else if (msg.attachment.type === 'image') {
      contentNode = <span className="text-ez-muted">📷 {t?.chat?.photo}</span>;
    } else {
      contentNode = <span className="text-ez-muted truncate">📄 {msg.attachment.name || t?.chat?.file}</span>;
    }
  } else if (msg.text) {
    contentNode = <span className="text-ez-muted truncate">{msg.text}</span>;
  } else {
    contentNode = <span className="text-ez-muted italic">{t?.chat?.message}</span>;
  }

  return (
    <span className="flex items-center text-[12px] text-ez-muted truncate min-w-0">
      {isMe && <span className="text-ez-muted mr-1 shrink-0">{t?.chat?.you}:</span>}
      {contentNode}
    </span>
  );
}

interface FriendsListProps {
  currentUser?: User | null;
  users: User[];
  addedFriends?: string[];
  isLoading?: boolean;
  allExistingUsers?: User[];
  groups?: Group[];
  unreadCounts?: Record<string, number>;
  onlineHandles?: string[];
  blockedUsers?: string[];
  lastMessages?: Record<string, Message>;
  selectedUserId: string;
  selectedGroupId?: string | null;
  onOpenMenu?: () => void;
  onSelectUser: (user: User) => void;
  onSelectGroup?: (group: Group) => void;
  onCreateGroup?: (name: string, avatar: string, memberHandles: string[]) => void;
  onDeleteGroup?: (groupId: string) => void;
  pinnedChats?: string[];
  mutedUsers?: Record<string, boolean>;
  onTogglePin?: (chatKey: string) => void;
  onToggleMute?: (chatKey: string) => void;
  onClearHistory?: (chatKey: string, isGroup: boolean) => void;
  onDeleteChat?: (chatKey: string, isGroup: boolean) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  currentUser,
  users,
  addedFriends = [],
  isLoading = false,
  allExistingUsers = [],
  groups = [],
  unreadCounts = {},
  onlineHandles = [],
  blockedUsers = [],
  lastMessages = {},
  selectedUserId,
  selectedGroupId,
  onOpenMenu,
  onSelectUser,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  pinnedChats = [],
  mutedUsers = {},
  onTogglePin,
  onToggleMute,
  onClearHistory,
  onDeleteChat,
}) => {
  const { t, language } = useTranslation();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDisposableModalOpen, setIsDisposableModalOpen] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'groups' | 'online'>('all');
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetId: string;
    isGroup: boolean;
  }>({ isOpen: false, x: 0, y: 0, targetId: '', isGroup: false });

  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContextMenu = (e: React.MouseEvent, id: string, isGroup: boolean) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      isGroup,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, id: string, isGroup: boolean) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        isOpen: true,
        x: touch.clientX,
        y: touch.clientY,
        targetId: id,
        isGroup,
      });
    }, 500);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const cleanQuery = searchQuery.trim().toLowerCase().replace('@', '');

  const isUserOnline = (handle: string) => {
    return onlineHandles.some((h) => normalizeHandle(h).toLowerCase() === normalizeHandle(handle).toLowerCase());
  };

  const isUserFriend = (handle: string) => {
    const clean = normalizeHandle(handle).toLowerCase();
    return (
      (currentUser?.friends && currentUser.friends.some((f) => normalizeHandle(f).toLowerCase() === clean)) ||
      addedFriends.some((f) => normalizeHandle(f).toLowerCase() === clean)
    );
  };

  const matchedUsers = users.filter((u) => {
    if (activeTab === 'online' && !isUserOnline(u.handle)) return false;
    if (activeTab === 'friends' && !isUserFriend(u.handle)) return false;
    if (!cleanQuery) return true;
    return (
      u.handle.toLowerCase().replace('@', '').includes(cleanQuery) ||
      (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
      (u.bio && u.bio.toLowerCase().includes(cleanQuery))
    );
  });
  const baseFilteredUsers = cleanQuery ? matchedUsers.slice(0, 8) : matchedUsers;
  const filteredUsers = baseFilteredUsers.slice().sort((a, b) => {
    const handleA = normalizeHandle(a.handle).toLowerCase();
    const handleB = normalizeHandle(b.handle).toLowerCase();
    
    const pinA = pinnedChats.includes(handleA) ? 1 : 0;
    const pinB = pinnedChats.includes(handleB) ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const msgA = lastMessages[handleA] || lastMessages[normalizeHandle(a.handle)] || (a.id ? lastMessages[a.id] : undefined);
    const msgB = lastMessages[handleB] || lastMessages[normalizeHandle(b.handle)] || (b.id ? lastMessages[b.id] : undefined);
    const timeA = msgA ? new Date(msgA.createdAt || msgA.timestamp || 0).getTime() : 0;
    const timeB = msgB ? new Date(msgB.createdAt || msgB.timestamp || 0).getTime() : 0;
    return timeB - timeA;
  });

  const seenGroupIds = new Set<string>();
  const matchedGroups = groups.filter((g) => {
    if (!g || !g.id || seenGroupIds.has(g.id)) return false;
    seenGroupIds.add(g.id);
    if (activeTab === 'online') return false;
    if (currentUser?.handle && !g.memberHandles.some((h) => normalizeHandle(h) === normalizeHandle(currentUser.handle))) {
      return false;
    }
    if (!cleanQuery) return true;
    return (
      g.name.toLowerCase().includes(cleanQuery) ||
      g.memberHandles.some((h) => h.toLowerCase().replace('@', '').includes(cleanQuery))
    );
  });
  const filteredGroups = (cleanQuery ? matchedGroups.slice(0, 8) : matchedGroups).slice().sort((a, b) => {
    const pinA = pinnedChats.includes(a.id) ? 1 : 0;
    const pinB = pinnedChats.includes(b.id) ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const msgA = lastMessages[`group__${a.id}`] || lastMessages[a.id];
    const msgB = lastMessages[`group__${b.id}`] || lastMessages[b.id];
    const timeA = msgA ? new Date(msgA.createdAt || msgA.timestamp || 0).getTime() : 0;
    const timeB = msgB ? new Date(msgB.createdAt || msgB.timestamp || 0).getTime() : 0;
    return timeB - timeA;
  });

  const myHandle = normalizeHandle(currentUser?.handle || '').toLowerCase();
  const existingChatHandles = new Set(filteredUsers.map((u) => normalizeHandle(u.handle).toLowerCase()));

  const globalResults = cleanQuery
    ? allExistingUsers
        .filter((u) => {
          const targetHandle = normalizeHandle(u.handle).toLowerCase();
          if (targetHandle === myHandle) return false;
          if (existingChatHandles.has(targetHandle)) return false;
          return (
            targetHandle.replace('@', '').includes(cleanQuery) ||
            (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
            (u.bio && u.bio.toLowerCase().includes(cleanQuery))
          );
        })
        .slice(0, 5)
    : [];

  const onlyFriendsList = useMemo(() => {
    return allExistingUsers.filter((u) => {
      const h = normalizeHandle(u.handle).toLowerCase();
      return h !== myHandle && isUserFriend(u.handle);
    });
  }, [allExistingUsers, myHandle, currentUser?.friends, addedFriends]);

  const visibleChatStream = useMemo(() => {
    const items: (
      | { type: 'group'; data: Group; isPinned: boolean; lastTimestamp: number }
      | { type: 'user'; data: User; isPinned: boolean; lastTimestamp: number }
    )[] = [];

    if (activeTab === 'all' || activeTab === 'groups') {
      for (const group of filteredGroups) {
        const isPinned = pinnedChats.includes(group.id);
        const groupLastMsg = lastMessages[`group__${group.id}`] || lastMessages[group.id];
        const lastTimestamp = groupLastMsg ? new Date(groupLastMsg.createdAt || groupLastMsg.timestamp || 0).getTime() : 0;
        items.push({ type: 'group', data: group, isPinned, lastTimestamp });
      }
    }

    if (activeTab === 'all' || activeTab === 'friends' || activeTab === 'online') {
      for (const user of filteredUsers) {
        const handleClean = normalizeHandle(user.handle).toLowerCase();
        const isPinned = pinnedChats.includes(handleClean) || Boolean(user.id && pinnedChats.includes(user.id));
        const lastMsg =
          lastMessages[handleClean] ||
          lastMessages[normalizeHandle(user.handle)] ||
          (user.id ? lastMessages[user.id] : undefined);
        const lastTimestamp = lastMsg ? new Date(lastMsg.createdAt || lastMsg.timestamp || 0).getTime() : 0;
        items.push({ type: 'user', data: user, isPinned, lastTimestamp });
      }
    }

    // Pinned chats always on top, then sorted by most recent activity timestamp descending
    items.sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return b.lastTimestamp - a.lastTimestamp;
    });

    return items;
  }, [activeTab, filteredGroups, filteredUsers, pinnedChats, lastMessages]);

  const renderGroupItem = (group: Group) => {
    const isSelected = selectedGroupId === group.id;
    const unread = unreadCounts[group.id] || 0;
    const isGroupMuted = Boolean(mutedUsers[group.id]);
    const groupLastMsg = lastMessages[`group__${group.id}`] || lastMessages[group.id];

    return (
      <div
        key={`group-${group.id}`}
        onClick={() => onSelectGroup && onSelectGroup(group)}
        onContextMenu={(e) => handleContextMenu(e, group.id, true)}
        onTouchStart={(e) => handleTouchStart(e, group.id, true)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`contain-content group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors duration-150 ${
          isSelected
            ? 'chat-row-selected border'
            : 'hover:bg-white/[0.03] border border-transparent'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 min-w-[40px] min-h-[40px] shrink-0">
            <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover border border-ez-border bg-ez-elevated" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--ez-accent)] text-zinc-950 flex items-center justify-center text-[7px] font-bold border-2 border-ez-surface shadow-sm">
              <Users className="w-2 h-2" />
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                <span className="text-[13px] font-bold text-white truncate tracking-tight">{group.name}</span>
                {pinnedChats.includes(group.id) && <Pin className="w-3.5 h-3.5 text-[var(--ez-accent)] shrink-0 fill-[var(--ez-accent)]" />}
              </div>
              {groupLastMsg && (
                <span className="text-[10px] text-ez-muted font-mono shrink-0 ml-1.5">
                  {formatChatListTime(groupLastMsg.createdAt || groupLastMsg.timestamp, language, t)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="text-[12px] truncate pr-2 min-w-0 flex-1">
                {groupLastMsg ? (
                  renderMessagePreview(groupLastMsg, currentUser?.handle, t)
                ) : (
                  <span className="text-[11px] text-ez-muted font-mono truncate">
                    {group.memberHandles.length} members
                  </span>
                )}
              </div>
              {unread > 0 && (
                <span
                  className={`min-w-[19px] h-[19px] px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm animate-scale-up ml-1.5 ${
                    isGroupMuted
                      ? 'bg-zinc-700 text-zinc-300'
                      : 'bg-[var(--ez-accent)] text-zinc-950'
                  }`}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserItem = (user: User) => {
    const isSelected = (selectedUserId === user.id || normalizeHandle(user.handle) === normalizeHandle(selectedUserId)) && !selectedGroupId;
    const isUserBlocked = blockedUsers.includes(normalizeHandle(user.handle));
    const online = !isUserBlocked && isUserOnline(user.handle);
    const handleClean = normalizeHandle(user.handle).toLowerCase();
    const unread = unreadCounts[handleClean] || unreadCounts[normalizeHandle(user.handle)] || (user.id ? unreadCounts[user.id] : 0) || 0;
    const isChatMuted = Boolean(
      mutedUsers[handleClean] ||
      mutedUsers[normalizeHandle(user.handle)] ||
      (user.id && mutedUsers[user.id])
    );
    const lastMsg =
      lastMessages[handleClean] ||
      lastMessages[normalizeHandle(user.handle)] ||
      (user.id ? lastMessages[user.id] : undefined);

    return (
      <div
        key={`user-${user.id || user.handle}`}
        onClick={() => onSelectUser(user)}
        onContextMenu={(e) => handleContextMenu(e, normalizeHandle(user.handle), false)}
        onTouchStart={(e) => handleTouchStart(e, normalizeHandle(user.handle), false)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`contain-content group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors duration-150 ${
          isSelected
            ? 'chat-row-selected border'
            : 'hover:bg-white/[0.03] border border-transparent'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 min-w-[40px] min-h-[40px] shrink-0">
            <img src={getDisplayAvatar(user, currentUser?.handle)} alt={user.handle} className="w-full h-full rounded-full object-cover border border-ez-border bg-ez-elevated" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-ez-surface ${
                online ? 'bg-neon-green-glow shadow-neon-dot' : 'bg-ez-muted'
              }`}
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                <span className="text-[13px] font-bold text-white truncate tracking-tight">
                  {user.name || user.handle}
                </span>
                {!isUserBlockedBy(user, currentUser?.handle) && user.statusEmoji && (
                  <span className="text-xs shrink-0 select-none leading-none">{user.statusEmoji}</span>
                )}
                {pinnedChats.includes(handleClean) && <Pin className="w-3.5 h-3.5 text-[var(--ez-accent)] shrink-0 fill-[var(--ez-accent)]" />}
              </div>
              {lastMsg && (
                <span className="text-[10px] text-ez-muted font-mono shrink-0 ml-1.5">
                  {formatChatListTime(lastMsg.createdAt || lastMsg.timestamp, language, t)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="text-[12px] truncate pr-2 min-w-0 flex-1">
                {lastMsg ? (
                  renderMessagePreview(lastMsg, currentUser?.handle, t)
                ) : (
                  <span className={`text-[11px] truncate ${online ? 'text-neon-green' : 'text-ez-muted'}`}>
                    {getDisplayBio(user, currentUser?.handle) || (online ? 'online' : ((t.chat as any).lastSeenRecently || 'last seen recently'))}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <span
                  className={`min-w-[19px] h-[19px] px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm animate-scale-up ml-1.5 ${
                    isChatMuted
                      ? 'bg-zinc-700 text-zinc-300'
                      : 'bg-[var(--ez-accent)] text-zinc-950'
                  }`}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'all' as const, label: t.sidebar.allChats },
    { id: 'friends' as const, label: t.sidebar.friends },
    { id: 'groups' as const, label: t.sidebar.groups },
    { id: 'online' as const, label: t.sidebar.online },
  ];

  return (
    <>
      <div className="w-full lg:w-[340px] h-full flex flex-col bg-ez-surface border-r border-ez-border/50 select-none shrink-0 relative overflow-hidden font-sans">
        <div className="p-3 pb-2 flex items-center space-x-2.5 bg-ez-surface">
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 flex items-center justify-center text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors duration-150 cursor-pointer shrink-0"
            title={t.common.openMenu}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-ez-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.sidebar.searchPlaceholder}
              className="w-full bg-ez-elevated focus:bg-ez-hover border border-transparent focus:border-[var(--ez-accent)] rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-ez-muted outline-none transition-colors duration-150"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center px-3 border-b border-ez-border/50 text-xs font-semibold overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 py-2.5 px-3 border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--ez-accent)] text-[var(--ez-accent)]'
                  : 'border-transparent text-ez-muted hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-28 space-y-0.5">
          {activeTab === 'all' && currentUser && !cleanQuery && (
            (() => {
              const savedLastMsg = lastMessages['saved_messages'] || lastMessages[normalizeHandle(currentUser.handle).toLowerCase()];
              const isSelected = Boolean(currentUser?.id && selectedUserId && (selectedUserId === currentUser.id || normalizeHandle(selectedUserId) === normalizeHandle(currentUser.handle))) && !selectedGroupId;

              return (
                <div
                  onClick={() =>
                    currentUser &&
                    onSelectUser({
                      ...currentUser,
                      id: currentUser.id || currentUser.handle,
                    })
                  }
                  className={`contain-content flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'chat-row-selected border'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full saved-avatar-badge border flex items-center justify-center shrink-0">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-white tracking-tight">{t.sidebar.savedMessages}</span>
                        {savedLastMsg && (
                          <span className="text-[10px] text-ez-muted font-mono shrink-0 ml-1.5">
                            {formatChatListTime(savedLastMsg.createdAt || savedLastMsg.timestamp, language, t)}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] truncate">
                        {savedLastMsg ? (
                          renderMessagePreview(savedLastMsg, currentUser.handle, t)
                        ) : (
                          <span className="text-ez-muted text-[12px]">{t.chat.cloudNotes || t.sidebar.cloud}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Skeleton Loaders */}
          {isLoading && (activeTab === 'all' || activeTab === 'friends') && Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="flex items-center p-2.5 space-x-3 mb-1 bg-white/[0.01] rounded-2xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-ez-border/30 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-ez-border/30 rounded w-1/3" />
                <div className="h-3 bg-ez-border/30 rounded w-2/3" />
              </div>
            </div>
          ))}

          {/* Unified Chat & Contact Stream (Pinned chats always on top, then sorted by activity) */}
          {!isLoading &&
            visibleChatStream.map((item) => {
              return item.type === 'group' ? renderGroupItem(item.data) : renderUserItem(item.data);
            })}

          {/* Global Search Results */}
          {cleanQuery && globalResults.length > 0 && (
            <div className="pt-3 border-t border-ez-border/50">
              <div className="flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold text-ez-muted uppercase tracking-wider">
                <Globe className="w-3 h-3 text-neon-green" />
                <span>{t.friends.globalSearch}</span>
              </div>
              {globalResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.03] cursor-pointer transition-colors duration-150"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0">
                      <img src={getDisplayAvatar(user, currentUser?.handle)} alt={user.handle} className="w-full h-full rounded-full object-cover border border-ez-border bg-ez-elevated" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[13px] font-bold text-white truncate">{user.name || user.handle}</span>
                        {!isUserBlockedBy(user, currentUser?.handle) && user.statusEmoji && (
                          <span className="text-xs shrink-0 select-none leading-none">{user.statusEmoji}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-neon-green font-mono truncate">{user.handle}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-neon-green bg-neon-green/10 px-2.5 py-1 rounded-xl font-bold">
                    {t.chat.message || 'Chat'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'groups' && filteredGroups.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-ez-muted">
              <Users className="w-8 h-8 mx-auto text-ez-border mb-2" />
              <p className="font-semibold text-gray-400">{t.friends.noGroupsFound}</p>
              <p className="mt-1 text-ez-muted">{t.friends.noGroupsFoundDesc}</p>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="mt-3 px-4 py-2 bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black text-xs font-bold rounded-xl transition-colors duration-150 cursor-pointer"
              >
                + {t.groups.createGroup}
              </button>
            </div>
          )}

          {activeTab === 'friends' && filteredUsers.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-ez-muted">
              <Users className="w-8 h-8 mx-auto text-ez-border mb-2" />
              <p className="font-semibold text-gray-400">{t.friends.noFriendsFound}</p>
              <p className="mt-1 text-ez-muted">{t.friends.noFriendsFoundDesc}</p>
            </div>
          )}

          {filteredUsers.length === 0 && filteredGroups.length === 0 && globalResults.length === 0 && activeTab !== 'groups' && activeTab !== 'friends' && (
            <div className="text-center py-12 px-4 text-xs text-ez-muted">
              <p className="font-semibold text-gray-400">{t.friends.noChatsFound}</p>
              <p className="mt-1 text-ez-muted">{t.friends.noChatsFoundDesc}</p>
            </div>
          )}
        </div>

        {/* ─── FAB Button (strictly contained inside sidebar) ─── */}
        <div className="absolute bottom-4 right-4 pb-[env(safe-area-inset-bottom,0px)] z-30">
          {showFabMenu && (
            <div className="absolute bottom-14 right-0 bg-ez-elevated border border-ez-border p-2 rounded-2xl shadow-glass-lg space-y-1 w-44 animate-scale-up">
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setIsComposeOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/[0.07] transition-colors duration-150 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-neon-green" />
                <span>{t.friends.newDirectChat}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setIsGroupModalOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/[0.07] transition-colors duration-150 cursor-pointer"
              >
                <Users className="w-4 h-4 text-neon-green" />
                <span>{t.sidebar.newGroup}</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setIsDisposableModalOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors duration-150 cursor-pointer"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{(t as any)?.disposable?.newTempChat || 'Disposable Room'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-12 h-12 rounded-full bg-neon-green hover:bg-neon-green-light text-black shadow-neon-md flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
            title={t.friends.newChat}
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Direct Chat Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        existingUsers={allExistingUsers}
        currentUserHandle={currentUser?.handle}
        onClose={() => setIsComposeOpen(false)}
        onSelectUser={(user) => {
          onSelectUser(user);
          setIsComposeOpen(false);
        }}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        friends={onlyFriendsList}
        currentUserHandle={currentUser?.handle}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={(name, avatar, members) => {
          if (onCreateGroup) onCreateGroup(name, avatar, members);
          setIsGroupModalOpen(false);
        }}
      />

      {/* Create Disposable Room Modal */}
      <CreateDisposableModal
        isOpen={isDisposableModalOpen}
        currentUserHandle={currentUser?.handle}
        currentUserName={currentUser?.name}
        onClose={() => setIsDisposableModalOpen(false)}
      />

      {/* Confirm Delete Group Modal */}
      <ConfirmModal
        isOpen={!!groupToDelete}
        title={t.groups.deleteGroup}
        message={t.friends.deleteGroupConfirm.replace('{name}', groupToDelete?.name || '')}
        confirmText={t.friends.deleteForever}
        cancelText={t.common.cancel}
        onConfirm={() => {
          if (groupToDelete && onDeleteGroup) {
            onDeleteGroup(groupToDelete.id);
          }
          setGroupToDelete(null);
        }}
        onCancel={() => setGroupToDelete(null)}
      />

      {/* Chat Context Menu */}
      <ChatContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        isPinned={pinnedChats.includes(contextMenu.targetId)}
        isMuted={Boolean(mutedUsers[contextMenu.targetId])}
        onTogglePin={() => onTogglePin && onTogglePin(contextMenu.targetId)}
        onToggleMute={() => onToggleMute && onToggleMute(contextMenu.targetId)}
        onClearHistory={() => onClearHistory && onClearHistory(contextMenu.targetId, contextMenu.isGroup)}
        onDeleteChat={() => onDeleteChat && onDeleteChat(contextMenu.targetId, contextMenu.isGroup)}
      />
    </>
  );
};
