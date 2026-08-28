import { useState, useEffect, useCallback, useRef } from 'react';
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
import { X, MessageSquare, Send } from 'lucide-react';

// Play audible notification chime on receiving a message
function playReceiveChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.1); // A5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch {
    // Ignore audio autoplay policies
  }
}

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
    currentUser ? ChatStorageService.getAddedFriends(currentUser.handle) : []
  );
  const [activeChatHandles, setActiveChatHandles] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [onlineHandles, setOnlineHandles] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('eztalk_blocked_users') || '[]');
    } catch {
      return [];
    }
  });

  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [incomingCall, setIncomingCall] = useState<{ caller: User } | null>(null);
  const [activeLiveCall, setActiveLiveCall] = useState<{ user: User; isInitiator?: boolean } | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Telegram Drawer & Modals State
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
      document.title = `(${totalUnread}) EzTalk - Telegram Web`;
    } else {
      document.title = 'EzTalk - Telegram Web';
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

  const isSavedMessages = Boolean(currentUser && selectedUserId === currentUser.id);

  const selectedUser = !selectedGroupId
    ? (isSavedMessages
        ? currentUser
        : (chatUsers.find((u) => u.id === selectedUserId) ||
           (selectedUserId ? allUsers.find((u) => u.id === selectedUserId) : null) ||
           chatUsers[0] ||
           null))
    : null;
  selectedUserRef.current = selectedUser;

  const selectedGroup = selectedGroupId
    ? userGroups.find((g) => g.id === selectedGroupId) || null
    : null;

  const isSelectedUserInFriends = selectedUser
    ? addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(selectedUser.handle))
    : true;

  // Fetch all users and groups from Backend API
  const refreshUsersAndGroups = useCallback(async () => {
    try {
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

  // Fetch messages from Backend API whenever conversation pair or group changes
  const refreshMessages = useCallback(async () => {
    const cUser = currentUserRef.current;
    if (!cUser) return;

    if (selectedGroupId) {
      try {
        const groupMsgs = await ApiService.getGroupMessages(selectedGroupId);
        if (groupMsgs) setMessages(groupMsgs);
      } catch {
        // ignore
      }
    } else if (selectedUser) {
      try {
        const serverMessages = await ApiService.getMessages(cUser.handle, selectedUser.handle);
        if (serverMessages) {
          setMessages(serverMessages);
        }
      } catch {
        const local = ChatStorageService.getMessages(cUser.handle, selectedUser.handle);
        setMessages(local);
      }
    }
  }, [selectedUser, selectedGroupId]);

  useEffect(() => {
    refreshUsersAndGroups();
  }, [refreshUsersAndGroups]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  // Periodic background refresh for 100% synchronized state
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUsersAndGroups();
      refreshMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshUsersAndGroups, refreshMessages]);

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

      // Add to active chats (WITHOUT auto-adding to friends list)
      if (!isForGroup && sHandle !== myHandle) {
        setActiveChatHandles((prev) => [...new Set([...prev, sHandle])]);
      }

      // Check if this incoming message is for the currently open chat
      const isForActiveChat = isForGroup
        ? selectedGroupIdRef.current === newMsg.groupId
        : selectedUserRef.current &&
          getConversationKey(cUser.handle, selectedUserRef.current.handle) === getConversationKey(sHandle, rHandle);

      // Track unread badge if message is not in currently active chat and not from me
      if (!isForActiveChat && sHandle !== myHandle) {
        const unreadKey = isForGroup ? newMsg.groupId! : sHandle;
        setUnreadCounts((prev) => ({
          ...prev,
          [unreadKey]: (prev[unreadKey] || 0) + 1,
        }));
      }

      // Update active messages thread if active chat matches
      if (isForGroup && selectedGroupIdRef.current === newMsg.groupId) {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === newMsg.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = newMsg;
            return updated;
          }
          return [...prev, newMsg];
        });
      } else if (!isForGroup && selectedUserRef.current) {
        const activeKey = getConversationKey(cUser.handle, selectedUserRef.current.handle);
        const msgKey = getConversationKey(sHandle, rHandle);
        if (msgKey === activeKey) {
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
      }

      // Check if notifications are muted for this sender or group
      const isMuted =
        mutedUsersRef.current[newMsg.senderId] ||
        mutedUsersRef.current[sHandle] ||
        (isForGroup && mutedUsersRef.current[newMsg.groupId!]);

      // If message is from someone else and NOT muted, play sound & show toast
      if (sHandle !== myHandle && !isMuted) {
        playReceiveChime();

        const sender = allUsersRef.current.find((u) => normalizeHandle(u.handle) === sHandle);
        const senderName = sender?.name || sHandle;
        const senderAvatar = sender?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        const senderId = sender?.id || sHandle;

        setToast({
          id: `toast_${Date.now()}`,
          senderName: isForGroup ? `Group message` : senderName,
          senderHandle: sHandle,
          senderAvatar,
          text: newMsg.text || 'Sent an attachment',
          senderId: isForGroup ? undefined : senderId,
          groupId: newMsg.groupId || undefined,
        });

        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification(`EzTalk: ${senderName}`, {
            body: newMsg.text || 'Sent an attachment',
            icon: senderAvatar,
          });
        }
      }

      refreshUsersAndGroups();
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
    const unsubCall = socketService.onIncomingCall(({ caller, recipientHandle }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      if (normalizeHandle(recipientHandle) === normalizeHandle(cUser.handle)) {
        if (!blockedUsersRef.current.includes(normalizeHandle(caller.handle))) {
          setIncomingCall({ caller });
        }
      }
    });

    // Call accepted event
    const unsubCallAccepted = socketService.onCallAccepted(({ callerHandle, recipient }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      if (normalizeHandle(callerHandle) === normalizeHandle(cUser.handle)) {
        setActiveLiveCall({ user: recipient, isInitiator: true });
        setIncomingCall(null);
      }
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
      unsubCallAccepted();
      unsubCallEnded();
      unsubClear();
    };
  }, [currentUser, selectedUser, selectedGroupId, mutedUsers, refreshUsersAndGroups]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    ChatStorageService.saveAuthUser(user);
    setMyAccounts(ChatStorageService.getMyAccounts());
    setAddedFriends(ChatStorageService.getAddedFriends(user.handle));
    socketService.setHandle(user.handle);
    refreshUsersAndGroups();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    ChatStorageService.saveAuthUser(null);
    setAddedFriends([]);
    setActiveChatHandles([]);
    socketService.disconnect();
  };

  const isSelectedUserMuted = selectedUser
    ? Boolean(mutedUsers[selectedUser.id])
    : selectedGroupId
    ? Boolean(mutedUsers[selectedGroupId])
    : false;
  const isCurrentContactTyping = selectedUser
    ? Boolean(typingUsers[normalizeHandle(selectedUser.handle)])
    : false;

  const handleToggleMute = (userId: string) => {
    setMutedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Send Message (Direct or Group, with Reply)
  const handleSendMessage = async (text: string, attachment?: Attachment, replyTo?: QuotedMessage) => {
    if (!currentUser) return;
    if (!selectedUser && !selectedGroupId) return;

    const tempMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationKey: selectedGroupId
        ? `group__${selectedGroupId}`
        : getConversationKey(currentUser.handle, selectedUser!.handle),
      groupId: selectedGroupId || undefined,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      recipientHandle: selectedGroupId ? undefined : selectedUser!.handle,
      text,
      attachment,
      replyTo,
      reactions: {},
      timestamp: 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, tempMsg]);

    // Send to Backend API
    try {
      await ApiService.sendMessage(
        currentUser.handle,
        selectedGroupId ? null : selectedUser!.handle,
        text,
        attachment,
        replyTo,
        selectedGroupId || undefined,
        undefined,
        tempMsg.id
      );
    } catch {
      if (!selectedGroupId && selectedUser) {
        ChatStorageService.addMessage(currentUser.handle, selectedUser.handle, tempMsg);
      }
    }
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

  // Add Existing User to Friends List
  const handleAddExistingFriend = (handle: string) => {
    if (!currentUser) return;
    const updated = ChatStorageService.addFriend(currentUser.handle, handle);
    setAddedFriends(updated);
  };

  // Remove Friend from Added Friends List
  const handleRemoveFriend = (friendHandle?: string) => {
    if (!currentUser) return;
    const target = friendHandle || (selectedUser ? selectedUser.handle : '');
    if (!target) return;
    if (confirm(`Remove ${target} from your friends list?`)) {
      const updated = ChatStorageService.removeFriend(currentUser.handle, target);
      setAddedFriends(updated);
      if (selectedUser && normalizeHandle(selectedUser.handle) === normalizeHandle(target)) {
        setSelectedUserId('');
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

  const handleSelectUserByHandle = (handle: string) => {
    const target = normalizeHandle(handle);
    const matched = allUsers.find((u) => normalizeHandle(u.handle) === target);
    if (matched && currentUser && normalizeHandle(matched.handle) !== normalizeHandle(currentUser.handle)) {
      setSelectedUserId(matched.id);
      setSelectedGroupId(null);
    }
  };

  const handleUpdateCurrentUser = async (updated: User) => {
    const oldHandle = currentUser?.handle;
    setCurrentUser(updated);
    ChatStorageService.saveAuthUser(updated);
    setMyAccounts(ChatStorageService.getMyAccounts());
    try {
      await ApiService.updateProfile(updated, oldHandle);
      socketService.updateStatus(updated);
    } catch {
      // ignore
    }
    refreshUsersAndGroups();
    refreshMessages();
  };

  const handleRemoveAccount = (acc: User) => {
    const updated = ChatStorageService.removeMyAccount(acc.handle);
    setMyAccounts(updated);
  };

  const handleToggleBlock = (handle: string) => {
    const clean = normalizeHandle(handle);
    setBlockedUsers((prev) => {
      const next = prev.includes(clean) ? prev.filter((h) => h !== clean) : [...prev, clean];
      localStorage.setItem('eztalk_blocked_users', JSON.stringify(next));
      return next;
    });
  };

  // If not authenticated, render AuthScreen (Login / Register)
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="w-screen h-screen bg-[#07080a] text-slate-100 flex flex-col overflow-hidden select-none font-sans relative">
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
          className="fixed top-4 right-4 z-50 flex items-center space-x-3 bg-[#15171e] border border-[#00ff73]/40 hover:border-[#00ff73] p-3.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-white cursor-pointer transition-all animate-fade-in max-w-sm backdrop-blur-md"
        >
          <div className="relative shrink-0">
            <img
              src={toast.senderAvatar}
              alt={toast.senderHandle}
              className="w-10 h-10 rounded-full object-cover border border-[#00ff73]/50"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00ff73] border-2 border-[#15171e] shadow-[0_0_6px_#00ff73]" />
          </div>
          <div className="flex flex-col min-w-0 pr-1 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-[#00ff73] truncate">{toast.senderName}</span>
              <span className="text-[10px] text-gray-400 font-mono truncate">{toast.senderHandle}</span>
            </div>
            <p className="text-xs text-gray-200 truncate mt-0.5">{toast.text}</p>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-[10px] text-gray-400 flex items-center mr-1">
              <MessageSquare className="w-3 h-3 text-[#00ff73]" />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToast(null);
              }}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Telegram Web 2-Panel Application Body */}
      <div className="flex-1 flex overflow-hidden bg-[#0e0f12]">
        {/* Panel 1: Telegram Chats List Sidebar */}
        <div className={`h-full ${selectedUser || selectedGroup ? 'hidden md:flex' : 'flex'} w-full md:w-auto shrink-0`}>
          <FriendsList
            currentUser={currentUser}
            users={chatUsers}
            allExistingUsers={allUsers}
            groups={userGroups}
            unreadCounts={unreadCounts}
            onlineHandles={onlineHandles}
            selectedUserId={selectedUserId}
            selectedGroupId={selectedGroupId}
            onOpenMenu={() => setIsDrawerOpen(true)}
            onSelectUser={(u) => {
              setSelectedUserId(u.id);
              setSelectedGroupId(null);
              setUnreadCounts((prev) => ({ ...prev, [normalizeHandle(u.handle)]: 0, [u.id]: 0 }));
              setActiveChatHandles((prev) => [...new Set([...prev, normalizeHandle(u.handle)])]);
            }}
            onSelectGroup={(g) => {
              setSelectedGroupId(g.id);
              setSelectedUserId('');
              setUnreadCounts((prev) => ({ ...prev, [g.id]: 0 }));
            }}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>

        {/* Panel 2: Telegram Chat Window Area */}
        <div className={`flex-1 flex overflow-hidden bg-[#0b0c0e] ${!selectedUser && !selectedGroup ? 'hidden md:flex' : 'flex'}`}>
          {selectedUser || selectedGroup ? (
            <ChatWindow
              user={selectedUser}
              group={selectedGroup}
              messages={messages}
              currentUserId={currentUser.id}
              currentUserHandle={currentUser.handle}
              isMuted={isSelectedUserMuted}
              isTyping={isCurrentContactTyping}
              isFriend={isSelectedUserInFriends}
              isBlocked={Boolean(selectedUser && blockedUsers.includes(normalizeHandle(selectedUser.handle)))}
              isSavedMessages={isSavedMessages}
              onBack={() => {
                setSelectedUserId('');
                setSelectedGroupId(null);
              }}
              onToggleMute={() => {
                if (selectedGroupId) {
                  handleToggleMute(selectedGroupId);
                } else if (selectedUser) {
                  handleToggleMute(selectedUser.id);
                }
              }}
              onToggleBlock={() => selectedUser && handleToggleBlock(selectedUser.handle)}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onClearChat={handleClearChat}
              onAddFriend={() => selectedUser && handleAddExistingFriend(selectedUser.handle)}
              onRemoveFriend={() => selectedUser && handleRemoveFriend(selectedUser.handle)}
              onDeleteGroup={handleDeleteGroup}
              onStartCall={() => selectedUser && setActiveLiveCall({ user: selectedUser, isInitiator: true })}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none telegram-chat-bg relative overflow-hidden">
              <div className="bg-[#17181c]/80 backdrop-blur-md border border-white/5 p-6 rounded-3xl max-w-sm flex flex-col items-center shadow-xl">
                <div className="w-16 h-16 rounded-full bg-[#00ff73]/15 text-[#00ff73] flex items-center justify-center text-2xl mb-4 shadow-[0_0_20px_rgba(0,255,115,0.2)]">
                  <Send className="w-7 h-7 ml-0.5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Select a chat to start messaging</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Choose from your existing conversations or search for contacts to start chatting with instant sync.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Telegram Navigation Drawer */}
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
          setSelectedUserId(currentUser.id);
          setSelectedGroupId(null);
        }}
        onUpdateStatus={(st) => {
          handleUpdateCurrentUser({ ...currentUser, status: st });
        }}
        onSwitchAccount={handleLogin}
        onAddAccount={() => setCurrentUser(null)}
        onRemoveAccount={handleRemoveAccount}
        onLogout={handleLogout}
      />

      {/* Telegram Full Settings Modal */}
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
          onAccept={() => {
            if (currentUser) {
              socketService.answerCall(incomingCall.caller.handle, currentUser);
            }
            setActiveLiveCall({ user: incomingCall.caller, isInitiator: false });
            setIncomingCall(null);
          }}
          onDecline={() => {
            if (currentUser) {
              socketService.endCall(currentUser.handle, incomingCall.caller.handle);
              // Send missed/declined call message
              ApiService.sendMessage(
                incomingCall.caller.handle,
                currentUser.handle,
                '📵 Missed Voice Call',
                undefined,
                undefined,
                undefined,
                { type: 'missed', duration: 0 }
              ).then((msg) => {
                setMessages((prev) => [...prev, msg]);
                ChatStorageService.addMessage(incomingCall.caller.handle, currentUser.handle, msg);
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
