import { useState, useEffect, useCallback, useRef } from 'react';
import { LeftSidebar } from './components/Sidebar/LeftSidebar';
import { FriendsList } from './components/Friends/FriendsList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { AuthScreen } from './components/Auth/AuthScreen';
import { IncomingCallModal } from './components/Chat/IncomingCallModal';
import { CallModal } from './components/Chat/CallModal';
import { TelegramDrawer } from './components/Sidebar/TelegramDrawer';
import { TelegramSettingsModal } from './components/Settings/TelegramSettingsModal';
import { CreateGroupModal } from './components/Groups/CreateGroupModal';
import { EditProfileModal } from './components/Profile/EditProfileModal';
import { AddFriendModal } from './components/Sidebar/AddFriendModal';
import { User, Group, Message, Attachment, QuotedMessage } from './types/chat';
import { ChatStorageService, getConversationKey, normalizeHandle } from './utils/chatStorage';
import { ApiService } from './services/api';
import { socketService } from './services/socket';
import { callSoundService, playMessageChime } from './utils/callSounds';
import { applyTheme, applyCompactMode } from './utils/theme';
import { X, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';

interface ToastNotification {
  id: string;
  senderName: string;
  senderHandle: string;
  senderAvatar: string;
  text: string;
  senderId?: string;
  groupId?: string;
}

export default function App() {
  // Authentication & Global Users State
  const [currentUser, setCurrentUser] = useState<User | null>(() => ChatStorageService.getAuthUser());
  const [allUsers, setAllUsers] = useState<User[]>(() => ChatStorageService.getAllUsers());
  const [groups, setGroups] = useState<Group[]>([]);
  const [myAccounts, setMyAccounts] = useState<User[]>(() => ChatStorageService.getMyAccounts());
  const [addedFriends, setAddedFriends] = useState<string[]>(() =>
    currentUser?.friends && currentUser.friends.length > 0
      ? currentUser.friends.map(normalizeHandle)
      : (currentUser ? ChatStorageService.getAddedFriends(currentUser.handle) : [])
  );
  const [activeChatHandles, setActiveChatHandles] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'chats' | 'contacts' | 'groups' | 'saved'>('chats');

  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [onlineHandles, setOnlineHandles] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    if (currentUser?.blockedUsers && currentUser.blockedUsers.length > 0) {
      return currentUser.blockedUsers.map(normalizeHandle);
    }
    const saved = localStorage.getItem('eztalk_blocked_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeTtls, setActiveTtls] = useState<Record<string, number>>({});

  // Voice Call State
  const [incomingCall, setIncomingCall] = useState<{ caller: User } | null>(null);
  const [activeLiveCall, setActiveLiveCall] = useState<{ user: User; isInitiator?: boolean } | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Drawer & Modals State
  const [selectedUserObj, setSelectedUserObj] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const allUsersRef = useRef(allUsers);
  allUsersRef.current = allUsers;

  const selectedGroupIdRef = useRef(selectedGroupId);
  selectedGroupIdRef.current = selectedGroupId;

  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;

  const mutedUsersRef = useRef(mutedUsers);
  mutedUsersRef.current = mutedUsers;

  const blockedUsersRef = useRef(blockedUsers);
  blockedUsersRef.current = blockedUsers;

  const selectedUserRef = useRef<User | null>(null);

  // Request browser notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Update dynamic document title with unread count
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) EzTalk - Web Messenger`;
    } else {
      document.title = 'EzTalk - Web Messenger';
    }
  }, [unreadCounts]);

  // Filter friends list (ONLY explicitly added friends)
  const friendsList = allUsers.filter(
    (u) =>
      normalizeHandle(u.handle) !== normalizeHandle(currentUser?.handle || '') &&
      addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(u.handle))
  );

  // Filter chat list (Friends + active chats)
  const chatUsers = allUsers.filter(
    (u) =>
      normalizeHandle(u.handle) !== normalizeHandle(currentUser?.handle || '') &&
      (addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(u.handle)) ||
        activeChatHandles.some((h) => normalizeHandle(h) === normalizeHandle(u.handle)))
  );

  // Filter groups where currentUser is a member
  const userGroups = groups.filter((g) =>
    g.memberHandles.some((h) => normalizeHandle(h) === normalizeHandle(currentUser?.handle || ''))
  );

  const isSavedMessages = Boolean(
    currentUser &&
    currentUser.id &&
    selectedUserId &&
    (selectedUserId === currentUser.id ||
      (currentUser.handle && normalizeHandle(selectedUserId) === normalizeHandle(currentUser.handle)))
  );

  const selectedUser = !selectedGroupId && selectedUserId
    ? (isSavedMessages
        ? currentUser
        : (chatUsers.find((u) => u.id === selectedUserId || normalizeHandle(u.handle) === normalizeHandle(selectedUserId)) ||
           allUsers.find((u) => u.id === selectedUserId || normalizeHandle(u.handle) === normalizeHandle(selectedUserId)) ||
           (selectedUserObj && (selectedUserObj.id === selectedUserId || normalizeHandle(selectedUserObj.handle) === normalizeHandle(selectedUserObj.handle)) ? selectedUserObj : null) ||
           (selectedUserId
             ? {
                 id: selectedUserId,
                 handle: normalizeHandle(selectedUserId),
                 name: selectedUserId.replace('@', ''),
                 avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                 status: 'Offline',
                 bio: 'Hey there! I am using EzTalk.',
               }
             : null)))
    : null;
  selectedUserRef.current = selectedUser;

  const selectedGroup = selectedGroupId
    ? userGroups.find((g) => g.id === selectedGroupId) || null
    : null;

  const isSelectedUserInFriends = selectedUser
    ? addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(selectedUser.handle))
    : true;

  // Fetch all users, groups, and current user profile from Backend API
  const refreshUsersAndGroups = useCallback(async () => {
    try {
      const cUser = currentUserRef.current;
      if (cUser && cUser.handle) {
        try {
          const freshProfile = await ApiService.getProfile(cUser.handle);
          if (freshProfile) {
            setCurrentUser(freshProfile);
            currentUserRef.current = freshProfile;
            ChatStorageService.saveAuthUser(freshProfile);
            if (freshProfile.blockedUsers) {
              setBlockedUsers(freshProfile.blockedUsers.map(normalizeHandle));
            }
            if (Array.isArray(freshProfile.friends)) {
              setAddedFriends(freshProfile.friends.map(normalizeHandle));
            }
          }
        } catch {
          // ignore profile fetch error
        }
      }

      const remoteUsers = await ApiService.getUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setAllUsers(remoteUsers);
        ChatStorageService.saveAllUsers(remoteUsers);
      }
      const remoteGroups = await ApiService.getGroups();
      if (remoteGroups) {
        setGroups(remoteGroups);
      }
    } catch {
      // fallback
    }
  }, []);

  // Fetch messages from Backend API with Local-First 0ms instant cache rendering
  const refreshMessages = useCallback(async () => {
    const cUser = currentUserRef.current;
    if (!cUser) return;

    if (selectedGroupId) {
      const convKey = `group__${selectedGroupId}`;
      const local = ChatStorageService.getConversations()[convKey] || [];
      if (local.length > 0) setMessages(local);

      try {
        const groupMsgs = await ApiService.getGroupMessages(selectedGroupId);
        if (groupMsgs) {
          setMessages(groupMsgs);
          ChatStorageService.saveConversation(convKey, groupMsgs);
        }
      } catch {
        // ignore
      }
    } else if (selectedUser) {
      const convKey = getConversationKey(cUser.handle, selectedUser.handle);
      const local = ChatStorageService.getMessages(cUser.handle, selectedUser.handle);
      if (local.length > 0) setMessages(local);

      try {
        const serverMessages = await ApiService.getMessages(cUser.handle, selectedUser.handle);
        if (serverMessages && serverMessages.length > 0) {
          setMessages(serverMessages);
          ChatStorageService.saveConversation(convKey, serverMessages);
        }
      } catch {
        if (local.length > 0) setMessages(local);
      }
    }
  }, [selectedUser, selectedGroupId]);

  // Apply user theme and density settings
  useEffect(() => {
    if (currentUser) {
      applyTheme(currentUser.theme || 'neon');
      applyCompactMode(Boolean(currentUser.compactMode));
    } else {
      const savedTheme = localStorage.getItem('eztalk_theme') || 'neon';
      const savedCompact = localStorage.getItem('eztalk_compact_mode') === 'true';
      applyTheme(savedTheme);
      applyCompactMode(savedCompact);
    }
  }, [currentUser?.theme, currentUser?.compactMode]);

  useEffect(() => {
    refreshUsersAndGroups();
  }, [refreshUsersAndGroups]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  // Periodic background refresh for 100% synchronized state
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshUsersAndGroups();
      refreshMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser, refreshUsersAndGroups, refreshMessages]);

  // Auto-dismiss in-app notification toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Connect Socket.io and setup real-time listeners
  useEffect(() => {
    if (!currentUser) return;

    socketService.connect(currentUser.handle);

    // Incoming new message event
    const unsubMsg = socketService.onNewMessage((newMsg: Message) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;

      const sHandle = normalizeHandle(newMsg.senderHandle || '');
      const rHandle = normalizeHandle(newMsg.recipientHandle || '');
      const myHandle = normalizeHandle(cUser.handle);

      // Ignore messages from blocked users
      if (blockedUsersRef.current.includes(sHandle)) return;

      // Check if message is for this user or for a group user belongs to
      const isForGroup = Boolean(newMsg.groupId);
      const isForMe = sHandle === myHandle || rHandle === myHandle;

      if (!isForGroup && !isForMe) return;

      // Ensure active chats list includes this direct conversation
      if (!isForGroup) {
        const otherHandle = sHandle === myHandle ? rHandle : sHandle;
        if (otherHandle) {
          setActiveChatHandles((prev) => [...new Set([...prev, otherHandle])]);
        }
      }

      // Update unread count if message is not sent by current user and chat is not open
      const isCurrentChatOpen = isForGroup
        ? selectedGroupIdRef.current === newMsg.groupId
        : selectedUserRef.current && normalizeHandle(selectedUserRef.current.handle) === sHandle;

      if (sHandle !== myHandle && !isCurrentChatOpen) {
        setUnreadCounts((prev) => {
          const key = isForGroup ? newMsg.groupId! : sHandle;
          return {
            ...prev,
            [key]: (prev[key] || 0) + 1,
          };
        });
      }

      // Add to current message thread if active
      if (isCurrentChatOpen) {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === newMsg.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = newMsg;
            return updated;
          }
          return [...prev, newMsg];
        });
      }

      // Check if notifications are muted for this sender or group
      const isMuted =
        mutedUsersRef.current[newMsg.senderId] ||
        mutedUsersRef.current[sHandle] ||
        (isForGroup && mutedUsersRef.current[newMsg.groupId!]);

      // If message is from someone else and NOT muted, handle sound, desktop notifications, and floating toasts
      if (sHandle !== myHandle && !isMuted) {
        // 1. Audible Chimes: Trigger chime if enabled and chat not focused or app in background
        if (currentUserRef.current?.soundNotifications !== false) {
          if (!isCurrentChatOpen || document.hidden) {
            playMessageChime();
          }
        }

        const sender = allUsersRef.current.find((u) => normalizeHandle(u.handle) === sHandle);
        const senderName = sender?.name || sHandle;
        const senderAvatar = sender?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        const senderId = sender?.id || sHandle;

        // 2. In-App Floating Toasts: Render animated floating toast if enabled and chat is NOT open
        if (currentUserRef.current?.floatingToasts !== false && !isCurrentChatOpen) {
          setToast({
            id: `toast_${Date.now()}`,
            senderName: isForGroup ? `Group message` : senderName,
            senderHandle: sHandle,
            senderAvatar,
            text: newMsg.text || (newMsg.attachment ? `Sent an attachment` : 'New message'),
            senderId: isForGroup ? undefined : senderId,
            groupId: newMsg.groupId || undefined,
          });
        }

        // 3. Browser Desktop Notifications: Show system toast when enabled and app in background
        if (
          currentUserRef.current?.desktopNotifications !== false &&
          'Notification' in window &&
          Notification.permission === 'granted' &&
          document.hidden
        ) {
          try {
            const notif = new Notification(`EzTalk: ${senderName}`, {
              body: newMsg.text || (newMsg.attachment ? `Sent an attachment` : 'New message'),
              icon: senderAvatar,
            });
            notif.onclick = () => {
              window.focus();
              if (isForGroup && newMsg.groupId) {
                setSelectedGroupId(newMsg.groupId);
                setSelectedUserId(null);
              } else {
                setSelectedUserId(senderId);
                setSelectedGroupId(null);
              }
            };
          } catch {
            // ignore
          }
        }
      }
    });

    // Message edited event
    const unsubEdit = socketService.onMessageEdited(({ id, text, isEdited }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, isEdited } : m)));
    });

    // Message deleted event
    const unsubDel = socketService.onMessageDeleted(({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    // Reaction updated event
    const unsubReact = socketService.onReactionUpdated(({ id, reactions }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m)));
    });

    // New Group created event
    const unsubGroup = socketService.onNewGroup((newGrp: Group) => {
      setGroups((prev) => (prev.some((g) => g.id === newGrp.id) ? prev : [...prev, newGrp]));
    });

    // Group deleted event
    const unsubGroupDel = socketService.onGroupDeleted(({ groupId }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroupIdRef.current === groupId) {
        setSelectedGroupId(null);
      }
    });

    // Online users presence event
    const unsubOnline = socketService.onOnlineUsers((handles) => {
      setOnlineHandles(handles);
    });

    // Typing state event
    const unsubTyping = socketService.onTyping(({ senderHandle, recipientHandle, isTyping }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      if (normalizeHandle(recipientHandle || '') === normalizeHandle(cUser.handle)) {
        setTypingUsers((prev) => ({
          ...prev,
          [normalizeHandle(senderHandle)]: isTyping,
        }));
      }
    });

    // Incoming Call event (Filtered to target recipient only & non-blocked)
    const unsubCall = socketService.onIncomingCall((data: any) => {
      const caller = data.caller || data.from;
      const recipientHandle = data.recipientHandle || data.to;
      const cUser = currentUserRef.current;
      if (!cUser || !caller) return;
      if (normalizeHandle(recipientHandle || '') === normalizeHandle(cUser.handle)) {
        if (!blockedUsersRef.current.includes(normalizeHandle(caller.handle))) {
          setIncomingCall({ caller });
        }
      }
    });

    // Call declined event
    const unsubCallDeclined = socketService.onCallDeclined(() => {
      setIncomingCall(null);
      setActiveLiveCall(null);
    });

    // Call ended event
    const unsubCallEnded = socketService.onCallEnded(() => {
      setIncomingCall(null);
      setActiveLiveCall(null);
    });

    // Chat cleared event
    const unsubClear = socketService.onChatCleared(() => {
      setMessages([]);
    });

    // Profile updated event (Multi-device profile and preferences sync)
    const unsubProfile = socketService.onProfileUpdated((updatedUser: User) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      if (normalizeHandle(cUser.handle) === normalizeHandle(updatedUser.handle) || cUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        currentUserRef.current = updatedUser;
        ChatStorageService.saveAuthUser(updatedUser);
        if (updatedUser.blockedUsers) {
          setBlockedUsers(updatedUser.blockedUsers.map(normalizeHandle));
        }
      }
      setAllUsers((prev) =>
        prev.map((u) =>
          normalizeHandle(u.handle) === normalizeHandle(updatedUser.handle) || u.id === updatedUser.id ? updatedUser : u
        )
      );
    });

    // User updated event (broadcast when any user updates their avatar, bio, status, etc.)
    const unsubUserUpdated = socketService.onUserUpdated((updatedUser: User) => {
      const cUser = currentUserRef.current;
      if (cUser && (normalizeHandle(cUser.handle) === normalizeHandle(updatedUser.handle) || cUser.id === updatedUser.id)) {
        setCurrentUser(updatedUser);
        currentUserRef.current = updatedUser;
        ChatStorageService.saveAuthUser(updatedUser);
        if (updatedUser.blockedUsers) {
          setBlockedUsers(updatedUser.blockedUsers.map(normalizeHandle));
        }
      }
      setAllUsers((prev) => {
        const exists = prev.some(
          (u) => normalizeHandle(u.handle) === normalizeHandle(updatedUser.handle) || u.id === updatedUser.id
        );
        if (exists) {
          return prev.map((u) =>
            normalizeHandle(u.handle) === normalizeHandle(updatedUser.handle) || u.id === updatedUser.id ? updatedUser : u
          );
        }
        return [...prev, updatedUser];
      });
    });

    // Friends updated event (Multi-device friends sync)
    const unsubFriends = socketService.onFriendsUpdated(({ friends }) => {
      if (Array.isArray(friends)) {
        setAddedFriends(friends.map(normalizeHandle));
      }
    });

    // Cloud Draft Synced event (Across devices/tabs)
    const unsubDraft = socketService.onDraftSynced(({ recipientHandle, text }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      const key = getConversationKey(cUser.handle, recipientHandle);
      setDrafts((prev) => ({ ...prev, [key]: text }));
      ChatStorageService.saveDraft(key, text);
    });

    // Message Read event (Two checkmarks status)
    const unsubRead = socketService.onMessageRead(({ messageId }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m)));
    });

    return () => {
      unsubMsg();
      unsubEdit();
      unsubDel();
      unsubReact();
      unsubGroup();
      unsubGroupDel();
      unsubOnline();
      unsubTyping();
      unsubCall();
      unsubCallDeclined();
      unsubCallEnded();
      unsubClear();
      unsubProfile();
      unsubUserUpdated();
      unsubFriends();
      unsubDraft();
      unsubRead();
    };
  }, [currentUser, selectedUser, selectedGroupId, mutedUsers, refreshUsersAndGroups]);

  const handleLogin = (user: User) => {
    setSelectedUserId('');
    setSelectedGroupId(null);
    setSelectedUserObj(null);
    setMessages([]);
    setUnreadCounts({});
    setActiveSection('chats');
    setCurrentUser(user);
    currentUserRef.current = user;
    ChatStorageService.saveAuthUser(user);
    setMyAccounts(ChatStorageService.getMyAccounts());
    if (Array.isArray(user.friends) && user.friends.length > 0) {
      setAddedFriends(user.friends.map(normalizeHandle));
    } else {
      setAddedFriends(ChatStorageService.getAddedFriends(user.handle));
    }
    if (Array.isArray(user.blockedUsers) && user.blockedUsers.length > 0) {
      const normalized = user.blockedUsers.map(normalizeHandle);
      setBlockedUsers(normalized);
      localStorage.setItem('eztalk_blocked_users', JSON.stringify(normalized));
    } else {
      setBlockedUsers([]);
      localStorage.removeItem('eztalk_blocked_users');
    }
    socketService.connect(user.handle);
    socketService.setHandle(user.handle);
    refreshUsersAndGroups();
  };

  const handleSwitchAccount = async (targetAccount: User) => {
    setSelectedUserId('');
    setSelectedGroupId(null);
    setSelectedUserObj(null);
    setMessages([]);
    setUnreadCounts({});
    setActiveSection('chats');
    setIsDrawerOpen(false);

    let userToSet = targetAccount;
    try {
      const freshProfile = await ApiService.getProfile(targetAccount.handle);
      if (freshProfile) {
        userToSet = freshProfile;
      }
    } catch {
      // fallback
    }

    setCurrentUser(userToSet);
    currentUserRef.current = userToSet;
    ChatStorageService.saveAuthUser(userToSet);
    setMyAccounts(ChatStorageService.getMyAccounts());

    if (Array.isArray(userToSet.friends) && userToSet.friends.length > 0) {
      setAddedFriends(userToSet.friends.map(normalizeHandle));
    } else {
      setAddedFriends(ChatStorageService.getAddedFriends(userToSet.handle));
    }

    if (Array.isArray(userToSet.blockedUsers) && userToSet.blockedUsers.length > 0) {
      const normalized = userToSet.blockedUsers.map(normalizeHandle);
      setBlockedUsers(normalized);
      localStorage.setItem('eztalk_blocked_users', JSON.stringify(normalized));
    } else {
      setBlockedUsers([]);
      localStorage.removeItem('eztalk_blocked_users');
    }

    socketService.connect(userToSet.handle);
    socketService.setHandle(userToSet.handle);
    refreshUsersAndGroups();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    ChatStorageService.saveAuthUser(null);
    setSelectedUserId('');
    setSelectedGroupId(null);
    setSelectedUserObj(null);
    setMessages([]);
    setAddedFriends([]);
    setActiveChatHandles([]);
    socketService.disconnect();
  };

  const isSelectedUserMuted = selectedUser
    ? Boolean(mutedUsers[selectedUser.id] || mutedUsers[normalizeHandle(selectedUser.handle)])
    : selectedGroupId
    ? Boolean(mutedUsers[selectedGroupId])
    : false;
  const isCurrentContactTyping = selectedUser
    ? Boolean(typingUsers[normalizeHandle(selectedUser.handle)])
    : false;

  const handleToggleMute = (userIdOrHandle: string) => {
    setMutedUsers((prev) => ({
      ...prev,
      [userIdOrHandle]: !prev[userIdOrHandle],
    }));
  };

  // Send Message (Direct or Group, with Reply, Forwarding, TTL & Optimistic UI)
  const handleSendMessage = async (
    text: string,
    attachment?: Attachment,
    replyTo?: QuotedMessage,
    ttlSeconds?: number,
    isSecret?: boolean,
    overrideRecipientHandle?: string,
    overrideGroupId?: string,
    isForwarded?: boolean,
    forwardedFrom?: string
  ) => {
    if (!currentUser) return;
    const targetGroupId = overrideGroupId || selectedGroupId;
    const targetRecipient = overrideRecipientHandle || (selectedUser ? selectedUser.handle : undefined);

    if (!targetRecipient && !targetGroupId) return;

    const convKey = targetGroupId
      ? `group__${targetGroupId}`
      : getConversationKey(currentUser.handle, targetRecipient!);

    const activeTtlSec = ttlSeconds !== undefined ? ttlSeconds : activeTtls[convKey];

    const tempMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationKey: convKey,
      groupId: targetGroupId || undefined,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      recipientHandle: targetGroupId ? undefined : targetRecipient,
      text,
      attachment,
      replyTo,
      reactions: {},
      isForwarded: Boolean(isForwarded),
      forwardedFrom: forwardedFrom || undefined,
      ttlSeconds: activeTtlSec ? Number(activeTtlSec) : undefined,
      isSecret: isSecret || Boolean(activeTtlSec),
      forwardRestricted: isSecret || Boolean(activeTtlSec),
      status: 'sending',
      timestamp: 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    // If currently viewing the target conversation, update active messages optimistically
    const currentConvKey = selectedGroupId
      ? `group__${selectedGroupId}`
      : (selectedUser ? getConversationKey(currentUser.handle, selectedUser.handle) : '');

    if (convKey === currentConvKey) {
      setMessages((prev) => [...prev, tempMsg]);
    }

    // Save to local cache immediately
    ChatStorageService.saveConversation(convKey, [...messages, tempMsg]);

    // Clear draft for this conversation
    ChatStorageService.saveDraft(convKey, '');
    setDrafts((prev) => ({ ...prev, [convKey]: '' }));
    if (targetRecipient) {
      socketService.sendDraft(currentUser.handle, targetRecipient, '');
      setActiveChatHandles((prev) => [...new Set([...prev, normalizeHandle(targetRecipient)])]);
    }

    // Send to Backend API
    try {
      const serverMsg = await ApiService.sendMessage(
        currentUser.handle,
        targetGroupId ? null : targetRecipient!,
        text,
        attachment,
        replyTo,
        targetGroupId || undefined,
        undefined,
        tempMsg.id,
        isForwarded,
        forwardedFrom,
        activeTtlSec,
        Boolean(activeTtlSec),
        Boolean(activeTtlSec)
      );

      // Update status to 'sent'
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'sent', ...(serverMsg || {}) } : m))
      );
    } catch {
      ChatStorageService.addPendingMessage(tempMsg);
      if (!targetGroupId && targetRecipient) {
        ChatStorageService.addMessage(currentUser.handle, targetRecipient, tempMsg);
      }
    }
  };

  // Forward Message to User or Group
  const handleForwardMessage = async (message: Message, targetUser?: User, targetGroup?: Group) => {
    if (!currentUser) return;
    const isTargetGroup = Boolean(targetGroup);
    const targetHandle = targetGroup ? null : (targetUser ? targetUser.handle : null);
    const targetGroupId = targetGroup ? targetGroup.id : undefined;

    if (!targetHandle && !targetGroupId) return;

    const originalSender = message.senderHandle || 'Unknown';
    const forwardedText = message.text || '';
    const forwardedAttachment = message.attachment;

    await handleSendMessage(
      forwardedText,
      forwardedAttachment,
      undefined,
      undefined,
      false,
      targetHandle || undefined,
      targetGroupId,
      true,
      originalSender
    );

    setToast({
      id: Date.now().toString(),
      senderName: targetGroup ? targetGroup.name : (targetUser?.name || targetUser?.handle || 'Recipient'),
      senderHandle: targetGroup ? targetGroup.name : (targetUser?.handle || 'Recipient'),
      senderAvatar: targetGroup ? targetGroup.avatar : (targetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
      text: `↪ Forwarded message from ${originalSender}`,
      groupId: targetGroupId,
    });
  };

  // Edit Message
  const handleEditMessage = async (id: string, newText: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText, isEdited: true } : m)));
    await ApiService.editMessage(id, newText);
  };

  // Delete Message
  const handleDeleteMessage = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await ApiService.deleteMessage(id);
  };

  // Toggle Emoji Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const userHandle = normalizeHandle(currentUser.handle);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        const currentList = reactions[emoji] || [];
        if (currentList.includes(userHandle)) {
          reactions[emoji] = currentList.filter((h) => h !== userHandle);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...currentList, userHandle];
        }
        return { ...m, reactions };
      })
    );

    await ApiService.toggleReaction(messageId, emoji, currentUser.handle);
  };

  // Create Group
  const handleCreateGroup = async (name: string, avatar: string, memberHandles: string[]) => {
    if (!currentUser) return;
    try {
      const group = await ApiService.createGroup(name, avatar, currentUser.handle, memberHandles);
      setGroups((prev) => [...prev, group]);
      setSelectedGroupId(group.id);
      setSelectedUserId('');
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId?: string) => {
    const target = groupId || selectedGroupId;
    if (!target) return;
    if (confirm('Are you sure you want to delete this group chat? All messages will be deleted.')) {
      setGroups((prev) => prev.filter((g) => g.id !== target));
      if (selectedGroupId === target) {
        setSelectedGroupId(null);
      }
      await ApiService.deleteGroup(target);
    }
  };

  // Add Existing User to Friends List (Persisted to database)
  const handleAddExistingFriend = async (handle: string) => {
    if (!currentUser) return;
    const clean = normalizeHandle(handle);
    setAddedFriends((prev) => [...new Set([...prev, clean])]);
    ChatStorageService.addFriend(currentUser.handle, clean);
    try {
      const serverFriends = await ApiService.toggleFriend(currentUser.handle, clean, 'add');
      if (serverFriends && serverFriends.length > 0) {
        setAddedFriends(serverFriends.map(normalizeHandle));
      }
    } catch {
      // ignore
    }
  };

  // Remove Friend from Added Friends List (Persisted to database)
  const handleRemoveFriend = async (friendHandle?: string) => {
    if (!currentUser) return;
    const target = friendHandle || (selectedUser ? selectedUser.handle : '');
    if (!target) return;
    const clean = normalizeHandle(target);
    if (confirm(`Remove ${clean} from your friends list?`)) {
      setAddedFriends((prev) => prev.filter((f) => normalizeHandle(f) !== clean));
      ChatStorageService.removeFriend(currentUser.handle, clean);
      if (selectedUser && normalizeHandle(selectedUser.handle) === clean) {
        setSelectedUserId('');
      }
      try {
        const serverFriends = await ApiService.toggleFriend(currentUser.handle, clean, 'remove');
        if (serverFriends) {
          setAddedFriends(serverFriends.map(normalizeHandle));
        }
      } catch {
        // ignore
      }
    }
  };

  const handleClearChat = async () => {
    if (!currentUser) return;
    setMessages([]);
    if (selectedGroupId) {
      await ApiService.clearChat(currentUser.handle, undefined, selectedGroupId);
    } else if (selectedUser) {
      ChatStorageService.clearConversation(currentUser.handle, selectedUser.handle);
      await ApiService.clearChat(currentUser.handle, selectedUser.handle);
    }
  };

  const handleAddNewFriend = async (newFriend: User) => {
    if (!currentUser) return;
    try {
      const registered = await ApiService.register(newFriend);
      const updated = ChatStorageService.upsertUser(registered);
      setAllUsers(updated);
      const friends = ChatStorageService.addFriend(currentUser.handle, registered.handle);
      setAddedFriends(friends);
      setSelectedUserId(registered.id);
      setSelectedGroupId(null);
      await ApiService.toggleFriend(currentUser.handle, registered.handle, 'add');
    } catch {
      const updated = ChatStorageService.upsertUser(newFriend);
      setAllUsers(updated);
      const friends = ChatStorageService.addFriend(currentUser.handle, newFriend.handle);
      setAddedFriends(friends);
      setSelectedUserId(newFriend.id);
      setSelectedGroupId(null);
    }
    refreshUsersAndGroups();
  };

  const handleUpdateCurrentUser = async (updated: User) => {
    const oldHandle = currentUser?.handle;
    setCurrentUser(updated);
    currentUserRef.current = updated;
    ChatStorageService.saveAuthUser(updated);
    setMyAccounts(ChatStorageService.getMyAccounts());
    setAllUsers((prev) =>
      prev.map((u) =>
        normalizeHandle(u.handle) === normalizeHandle(updated.handle) || u.id === updated.id
          ? { ...u, ...updated }
          : u
      )
    );
    try {
      const serverUser = await ApiService.updateProfile(updated, oldHandle);
      if (serverUser) {
        setCurrentUser(serverUser);
        currentUserRef.current = serverUser;
        ChatStorageService.saveAuthUser(serverUser);
        setMyAccounts(ChatStorageService.getMyAccounts());
      }
      socketService.updateStatus(updated);
    } catch (err) {
      console.error('Failed to update profile on server:', err);
    }
    refreshUsersAndGroups();
    refreshMessages();
  };

  const handleRemoveAccount = (acc: User) => {
    const updated = ChatStorageService.removeMyAccount(acc.handle);
    setMyAccounts(updated);
  };

  const handleToggleBlock = async (handle: string) => {
    const clean = normalizeHandle(handle);
    setBlockedUsers((prev) => {
      const next = prev.includes(clean) ? prev.filter((h) => h !== clean) : [...prev, clean];
      localStorage.setItem('eztalk_blocked_users', JSON.stringify(next));
      return next;
    });

    if (currentUser) {
      try {
        const serverBlocked = await ApiService.toggleBlockUser(currentUser.handle, clean, 'toggle');
        if (serverBlocked && Array.isArray(serverBlocked)) {
          const normalized = serverBlocked.map(normalizeHandle);
          setBlockedUsers(normalized);
          localStorage.setItem('eztalk_blocked_users', JSON.stringify(normalized));
        }
      } catch {
        // Fallback to local state
      }
    }
  };

  // If not authenticated, render AuthScreen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="w-full h-full min-h-[100dvh] h-[100dvh] bg-ez-base text-slate-100 flex flex-col overflow-hidden select-none font-sans relative">
      {/* Top Right In-App Notification Toast */}
      {toast && (
        <div
          onClick={() => {
            if (toast.groupId) {
              setSelectedGroupId(toast.groupId);
              setSelectedUserId('');
              setUnreadCounts((prev) => ({ ...prev, [toast.groupId!]: 0 }));
            } else if (toast.senderId) {
              const target = allUsers.find(
                (u) => u.id === toast.senderId || normalizeHandle(u.handle) === normalizeHandle(toast.senderHandle)
              );
              if (target) {
                setSelectedUserId(target.id);
                setSelectedGroupId(null);
                setUnreadCounts((prev) => ({
                  ...prev,
                  [normalizeHandle(target.handle)]: 0,
                  [target.id]: 0,
                }));
              }
            }
            setToast(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 bg-ez-elevated/95 border border-neon-green/40 hover:border-neon-green p-3.5 rounded-2xl shadow-glass-lg text-white cursor-pointer transition-all animate-slide-up w-[92vw] sm:w-auto sm:max-w-md backdrop-blur-md"
        >
          <div className="relative shrink-0">
            <img
              src={toast.senderAvatar}
              alt={toast.senderHandle}
              className="w-10 h-10 rounded-full object-cover border border-neon-green/50"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-ez-elevated shadow-neon-dot" />
          </div>
          <div className="flex flex-col min-w-0 pr-1 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-neon-green truncate">{toast.senderName}</span>
              <span className="text-[10px] text-ez-muted font-mono truncate">{toast.senderHandle}</span>
            </div>
            <p className="text-xs text-gray-200 truncate mt-0.5">{toast.text}</p>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-[10px] text-ez-muted flex items-center mr-1">
              <MessageSquare className="w-3 h-3 text-neon-green" />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToast(null);
              }}
              className="text-ez-muted hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main EzTalk 3-Panel Application Body */}
      <div className="flex-1 flex overflow-hidden bg-ez-base w-full h-full">
        {/* Panel 1: Left Mini-Bar Rail (64px) - Always visible on desktop */}
        <div className="hidden md:flex h-full shrink-0">
          <LeftSidebar
            currentUser={currentUser}
            myAccounts={myAccounts}
            activeSection={isSavedMessages ? 'saved' : 'chats'}
            onSelectSection={(sec) => {
              setActiveSection(sec);
              if (sec === 'saved' && currentUser) {
                setSelectedUserId(currentUser.id);
                setSelectedGroupId(null);
              }
            }}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onSelectSavedMessages={() => {
              if (currentUser) {
                setSelectedUserId(currentUser.id);
                setSelectedGroupId(null);
                setActiveSection('saved');
              }
            }}
            onSwitchUser={handleSwitchAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddAccount={() => setCurrentUser(null)}
            onLogout={handleLogout}
          />
        </div>

        {/* Panel 2: Friends & Conversations Panel */}
        <div className={`h-full ${selectedUser || selectedGroup ? 'hidden md:flex' : 'flex'} w-full md:w-auto shrink-0`}>
          <FriendsList
            currentUser={currentUser}
            users={chatUsers}
            allExistingUsers={allUsers}
            groups={userGroups}
            unreadCounts={unreadCounts}
            onlineHandles={onlineHandles}
            blockedUsers={blockedUsers}
            selectedUserId={selectedUserId}
            selectedGroupId={selectedGroupId}
            onOpenMenu={() => setIsDrawerOpen(true)}
            onSelectUser={(u) => {
              const uid = u.id || (u as any)._id || u.handle;
              setSelectedUserObj(u);
              setSelectedUserId(uid);
              setSelectedGroupId(null);
              setActiveSection(currentUser && (uid === currentUser.id || normalizeHandle(u.handle) === normalizeHandle(currentUser.handle)) ? 'saved' : 'chats');
              setUnreadCounts((prev) => ({ ...prev, [normalizeHandle(u.handle)]: 0, [uid]: 0 }));
              setActiveChatHandles((prev) => [...new Set([...prev, normalizeHandle(u.handle)])]);
            }}
            onSelectGroup={(g) => {
              setSelectedUserObj(null);
              setSelectedGroupId(g.id);
              setSelectedUserId('');
              setActiveSection('chats');
              setUnreadCounts((prev) => ({ ...prev, [g.id]: 0 }));
            }}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>

        {/* Panel 3: Main Chat View Area */}
        <div className={`flex-1 flex flex-col min-w-0 w-full overflow-hidden bg-ez-base ${!selectedUser && !selectedGroup ? 'hidden md:flex' : 'flex'}`}>
          {selectedUser || selectedGroup ? (
            <ChatWindow
              user={selectedUser}
              group={selectedGroup}
              messages={messages}
              currentUserId={currentUser.id}
              currentUserHandle={currentUser.handle}
              currentUser={currentUser}
              allUsers={allUsers}
              allGroups={userGroups}
              onlineHandles={onlineHandles}
              isMuted={isSelectedUserMuted}
              isTyping={isCurrentContactTyping}
              isFriend={isSelectedUserInFriends}
              isBlocked={Boolean(selectedUser && blockedUsers.includes(normalizeHandle(selectedUser.handle)))}
              isOnline={Boolean(selectedUser && onlineHandles.some(h => normalizeHandle(h).toLowerCase() === normalizeHandle(selectedUser.handle).toLowerCase()))}
              isSavedMessages={isSavedMessages}
              activeTtl={
                selectedGroupId
                  ? activeTtls[`group__${selectedGroupId}`]
                  : selectedUser
                  ? activeTtls[getConversationKey(currentUser.handle, selectedUser.handle)]
                  : undefined
              }
              draftText={
                selectedGroupId
                  ? drafts[`group__${selectedGroupId}`] || ChatStorageService.getDraft(`group__${selectedGroupId}`)
                  : selectedUser
                  ? drafts[getConversationKey(currentUser.handle, selectedUser.handle)] ||
                    ChatStorageService.getDraft(getConversationKey(currentUser.handle, selectedUser.handle))
                  : ''
              }
              onSetTtl={(ttl) => {
                const key = selectedGroupId
                  ? `group__${selectedGroupId}`
                  : selectedUser
                  ? getConversationKey(currentUser.handle, selectedUser.handle)
                  : '';
                if (key) {
                  setActiveTtls((prev) => ({ ...prev, [key]: ttl || 0 }));
                }
              }}
              onDraftChange={(text) => {
                const key = selectedGroupId
                  ? `group__${selectedGroupId}`
                  : selectedUser
                  ? getConversationKey(currentUser.handle, selectedUser.handle)
                  : '';
                if (key) {
                  setDrafts((prev) => ({ ...prev, [key]: text }));
                  ChatStorageService.saveDraft(key, text);
                  if (selectedUser) {
                    socketService.sendDraft(currentUser.handle, selectedUser.handle, text);
                  }
                }
              }}
              onBack={() => {
                setSelectedUserObj(null);
                setSelectedUserId('');
                setSelectedGroupId(null);
                setActiveSection('chats');
              }}
              onToggleMute={() => {
                if (selectedGroupId) {
                  handleToggleMute(selectedGroupId);
                } else if (selectedUser) {
                  handleToggleMute(selectedUser.id);
                  if (selectedUser.handle) {
                    handleToggleMute(normalizeHandle(selectedUser.handle));
                  }
                }
              }}
              onToggleBlock={() => selectedUser && handleToggleBlock(selectedUser.handle)}
              onSendMessage={handleSendMessage}
              onForwardMessage={handleForwardMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onClearChat={handleClearChat}
              onAddFriend={() => selectedUser && handleAddExistingFriend(selectedUser.handle)}
              onRemoveFriend={() => selectedUser && handleRemoveFriend(selectedUser.handle)}
              onDeleteGroup={() => handleDeleteGroup()}
              onStartCall={() => selectedUser && setActiveLiveCall({ user: selectedUser, isInitiator: true })}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none telegram-chat-bg relative overflow-hidden">
              <div className="bg-ez-elevated/90 backdrop-blur-xl border border-ez-border p-8 rounded-3xl max-w-sm flex flex-col items-center shadow-glass-lg relative z-10 animate-scale-up">
                <div className="w-16 h-16 rounded-2xl bg-neon-green/10 text-neon-green flex items-center justify-center mb-4 shadow-neon-sm border border-neon-green/25">
                  <Send className="w-7 h-7 ml-0.5 text-neon-green" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">Select a conversation</h3>
                <p className="text-xs text-ez-muted leading-relaxed mb-4">
                  Choose a contact from the list or start a new conversation to begin real-time encrypted messaging.
                </p>
                <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono text-neon-green bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Real-time P2P Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Navigation Drawer */}
      <TelegramDrawer
        isOpen={isDrawerOpen}
        currentUser={currentUser}
        myAccounts={myAccounts}
        friendsCount={friendsList.length}
        onClose={() => setIsDrawerOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreateGroup={() => setIsGroupModalOpen(true)}
        onOpenAddFriend={() => setIsAddFriendOpen(true)}
        onSelectSavedMessages={() => {
          if (currentUser) {
            setSelectedUserId(currentUser.id);
            setSelectedGroupId(null);
            setActiveSection('saved');
          }
        }}
        onUpdateStatus={(st) => {
          handleUpdateCurrentUser({ ...currentUser, status: st });
        }}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setCurrentUser(null)}
        onRemoveAccount={handleRemoveAccount}
        onLogout={handleLogout}
      />

      {/* Settings Modal */}
      {isSettingsOpen && currentUser && (
        <TelegramSettingsModal
          isOpen={isSettingsOpen}
          currentUser={currentUser}
          onClose={() => setIsSettingsOpen(false)}
          onSaveProfile={(updated) => {
            handleUpdateCurrentUser(updated);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <CreateGroupModal
          isOpen={isGroupModalOpen}
          existingUsers={allUsers}
          currentUserHandle={currentUser.handle}
          onClose={() => setIsGroupModalOpen(false)}
          onCreateGroup={(name, avatar, members) => {
            handleCreateGroup(name, avatar, members);
            setIsGroupModalOpen(false);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && currentUser && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          currentUser={currentUser}
          existingUsers={allUsers}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={(updated) => {
            handleUpdateCurrentUser(updated);
            setIsEditProfileOpen(false);
          }}
        />
      )}

      {/* Add Contact / Friend Modal */}
      {isAddFriendOpen && currentUser && (
        <AddFriendModal
          isOpen={isAddFriendOpen}
          currentUser={currentUser}
          existingUsers={allUsers}
          onClose={() => setIsAddFriendOpen(false)}
          onAddFriend={(friend) => {
            handleAddNewFriend(friend);
            setIsAddFriendOpen(false);
          }}
        />
      )}

      {/* Real-time Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          isOpen={Boolean(incomingCall)}
          callRingtonesEnabled={currentUser?.callRingtones !== false}
          onAccept={() => {
            callSoundService.stopAll();
            if (currentUser) {
              socketService.acceptCall(incomingCall.caller.handle, currentUser.handle, currentUser);
            }
            setActiveLiveCall({ user: incomingCall.caller, isInitiator: false });
            setIncomingCall(null);
          }}
          onDecline={() => {
            callSoundService.stopAll();
            if (currentUser) {
              socketService.declineCall(incomingCall.caller.handle, currentUser.handle);
              // Send missed/declined call message
              ApiService.sendMessage(
                currentUser.handle,
                incomingCall.caller.handle,
                '📵 Missed Voice Call',
                undefined,
                undefined,
                undefined,
                { type: 'declined', duration: 0 }
              ).then((msg) => {
                setMessages((prev) => [...prev, msg]);
                ChatStorageService.addMessage(currentUser.handle, incomingCall.caller.handle, msg);
              });
            }
            setIncomingCall(null);
          }}
        />
      )}

      {/* Connected Live WebRTC Voice Call */}
      {activeLiveCall && currentUser && (
        <CallModal
          user={activeLiveCall.user}
          currentUser={currentUser}
          isOpen={Boolean(activeLiveCall)}
          isInitiator={activeLiveCall.isInitiator}
          onClose={(callInfo) => {
            callSoundService.stopAll();
            if (currentUser) {
              socketService.endCall(currentUser.handle, activeLiveCall.user.handle);
              // If caller, send the call event message so it appears in the chat on both sides
              if (activeLiveCall.isInitiator && callInfo) {
                const text = callInfo.duration
                  ? `📞 Voice Call (${Math.floor(callInfo.duration / 60)}:${(callInfo.duration % 60)
                      .toString()
                      .padStart(2, '0')})`
                  : callInfo.type === 'missed'
                  ? '📵 Missed Voice Call'
                  : callInfo.type === 'declined'
                  ? '📞 Declined Call'
                  : '📞 Canceled Call';

                ApiService.sendMessage(
                  currentUser.handle,
                  activeLiveCall.user.handle,
                  text,
                  undefined,
                  undefined,
                  undefined,
                  callInfo
                ).then((msg) => {
                  setMessages((prev) => [...prev, msg]);
                  ChatStorageService.addMessage(currentUser.handle, activeLiveCall.user.handle, msg);
                });
              }
            }
            setActiveLiveCall(null);
          }}
        />
      )}
    </div>
  );
}
