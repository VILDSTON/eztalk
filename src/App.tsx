import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { EditContactNameModal } from './components/Chat/EditContactNameModal';
import { User, Group, Message, Attachment, QuotedMessage } from './types/chat';
import { ChatStorageService, getConversationKey, normalizeHandle, sanitizeDisplayName } from './utils/chatStorage';
import { ApiService } from './services/api';
import { socketService } from './services/socket';
import { callSoundService, playMessageChime } from './utils/callSounds';
import { applyTheme, applyCompactMode } from './utils/theme';
import { LegalModal } from './components/Legal/LegalModal';
import { CookieBanner } from './components/Common/CookieBanner';
import { NotFoundScreen } from './components/Common/NotFoundScreen';
import { X, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useMatch, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useLocalizedNavigate } from './hooks/useLocalizedNavigate';
import { useTranslation } from './context/LanguageContext';
import { LandingPage } from './components/Landing/LandingPage';
import { BanScreen } from './components/UI/BanScreen';
import { DEFAULT_AVATAR } from './constants/avatars';

const SUPPORTED_LANGS = ['en', 'ru', 'uz'] as const;

function RootRedirect() {
  const location = useLocation();
  const savedLang = localStorage.getItem('eztalk_language') || (navigator.language.slice(0, 2).toLowerCase() === 'ru' ? 'ru' : navigator.language.slice(0, 2).toLowerCase() === 'uz' ? 'uz' : 'en');
  const validLang = SUPPORTED_LANGS.includes(savedLang as any) ? savedLang : 'en';
  // preserve path but fallback legacy /direct to language
  const targetPath = location.pathname === '/' ? `/${validLang}/` : `/${validLang}${location.pathname}`;
  return <Navigate to={`${targetPath}${location.search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/:lang/*" element={<MainApp />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
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

function MainApp() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { setLanguage, t } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGS.includes(lang as any)) {
      setLanguage(lang as any);
    }
  }, [lang, setLanguage]);

  if (!lang || !SUPPORTED_LANGS.includes(lang as any)) {
    return <RootRedirect />;
  }

  const match = useMatch('/:lang/t/direct/:chatId');
  const legacyMatch = useMatch('/:lang/t/direct/t/:chatId');
  const urlChatId = match?.params.chatId || legacyMatch?.params.chatId;

  // Authentication & Global Users State
  const [currentUser, setCurrentUser] = useState<User | null>(() => ChatStorageService.getAuthUser());
  const [allUsers, setAllUsers] = useState<User[]>(() => ChatStorageService.getAllUsers());
  const [groups, setGroups] = useState<Group[]>([]);
  const [myAccounts, setMyAccounts] = useState<User[]>(() => ChatStorageService.getMyAccounts());
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; tab: 'privacy' | 'terms' }>({
    isOpen: false,
    tab: 'privacy',
  });
  const [editingAliasUser, setEditingAliasUser] = useState<User | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const [showPwaInstall, setShowPwaInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && !isStandalone) {
      const hideBannerUntil = localStorage.getItem('eztalk_hide_install_banner_until');
      if (!hideBannerUntil || Date.now() > parseInt(hideBannerUntil, 10)) {
        setShowPwaInstall(true);
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hideBannerUntil = localStorage.getItem('eztalk_hide_install_banner_until');
      if (!hideBannerUntil || Date.now() > parseInt(hideBannerUntil, 10)) {
        setShowPwaInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPwaInstall(false);
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        alert("To install on iOS:\n\n1. Tap the Share button (⍐) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'.");
      } else {
        alert("To install:\n\nTap the browser menu (⋮) and select 'Install app' or 'Add to Home Screen'.");
      }
    }
  };

  const closePwaBanner = () => {
    // 24 hours in ms
    const nextTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('eztalk_hide_install_banner_until', nextTime.toString());
    setShowPwaInstall(false);
  };

  useEffect(() => {
    const path = location.pathname.toLowerCase();

    const handleMatch = path.match(new RegExp(`^/${lang}/@([^/]+)`));
    const chatMatch = path.match(new RegExp(`^/${lang}/chat/([^/]+)`));

    const legacyDirectMatch = path.match(new RegExp(`^/${lang}/t/direct/t/([^/]+)`));

    if (legacyDirectMatch) {
      navigate(`/t/direct/${legacyDirectMatch[1]}`, { replace: true });
      return;
    }
    if (handleMatch) {
      navigate(`/t/direct/${handleMatch[1]}`, { replace: true });
      return;
    }
    if (chatMatch) {
      navigate(`/t/direct/${chatMatch[1]}`, { replace: true });
      return;
    }

    if (path === '/privacy') {
      setLegalModal({ isOpen: true, tab: 'privacy' });
    } else if (path === '/terms') {
      setLegalModal({ isOpen: true, tab: 'terms' });
    } else if (path !== '/' && path !== `/${lang}` && path !== `/${lang}/` && !path.startsWith(`/${lang}/chat`) && !path.startsWith(`/${lang}/direct`) && !path.startsWith(`/${lang}/@`) && !path.startsWith(`/${lang}/login`) && !path.startsWith(`/${lang}/about`) && !path.startsWith(`/${lang}/t`)) {
      setIsNotFound(true);
    } else {
      setIsNotFound(false);
    }
  }, [location.pathname, lang, navigate]);
  const [addedFriends, setAddedFriends] = useState<string[]>(() =>
    currentUser?.friends && currentUser.friends.length > 0
      ? currentUser.friends.map(normalizeHandle)
      : (currentUser ? ChatStorageService.getAddedFriends(currentUser.handle) : [])
  );
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeChatHandles, setActiveChatHandles] = useState<string[]>([]);
  // Chat messages stored in memory dictionary by conversation key (0ms instant chat switching, no empty flicker)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(() => {
    return ChatStorageService.getConversations();
  });
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>(() => {
    const map: Record<string, Message> = {};
    try {
      const convs = ChatStorageService.getConversations();
      const myHandle = normalizeHandle(currentUser?.handle || '').toLowerCase();
      for (const [key, msgs] of Object.entries(convs)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          map[key] = last;
          if (key.startsWith('group__')) {
            map[key.replace('group__', '')] = last;
          } else {
            const parts = key.split('__');
            if (parts.length === 2) {
              const other = parts[0] === myHandle ? parts[1] : parts[0];
              map[other] = last;
              map[`@${other}`] = last;
              if (parts[0] === parts[1]) {
                map['saved_messages'] = last;
              }
            }
          }
        }
      }
    } catch { }
    return map;
  });

  const selectedGroupId = urlChatId?.startsWith('group__') ? urlChatId : null;
  const selectedUserId = urlChatId && !urlChatId.startsWith('group__') ? urlChatId : '';

  const setSelectedUserId = useCallback((id: string | null) => {
    if (!id) {
      navigate('/t/direct');
    } else {
      navigate(`/t/direct/${id}`);
    }
  }, [navigate]);

  const setSelectedGroupId = useCallback((id: string | null) => {
    if (id) {
      navigate(`/t/direct/${id}`);
    }
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) {
      if (urlChatId) {
        sessionStorage.setItem('eztalk_redirect_after_login', `/t/direct/${urlChatId}`);
      }
    } else {
      const pendingRedirect = sessionStorage.getItem('eztalk_redirect_after_login');
      if (pendingRedirect) {
        sessionStorage.removeItem('eztalk_redirect_after_login');
        navigate(pendingRedirect, { replace: true });
      } else {
        const path = location.pathname.toLowerCase();
        if (path === '/' || path === '/t/direct' || path === '/t/direct/') {
          navigate('/t/direct', { replace: true });
        }
      }
    }
  }, [currentUser, location.pathname, navigate, urlChatId]);

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

  const [pinnedChats, setPinnedChats] = useState<string[]>(() =>
    currentUser ? ChatStorageService.getPinnedChats(currentUser.id) : []
  );

  useEffect(() => {
    if (currentUser) {
      setPinnedChats(ChatStorageService.getPinnedChats(currentUser.id));
    } else {
      setPinnedChats([]);
    }
  }, [currentUser]);

  const handleTogglePin = useCallback((chatKey: string) => {
    if (!currentUser) return;
    const updated = ChatStorageService.togglePinnedChat(currentUser.id, chatKey);
    setPinnedChats(updated);
  }, [currentUser]);

  // Voice Call State
  const [incomingCall, setIncomingCall] = useState<{ caller: User } | null>(null);
  const [activeLiveCall, setActiveLiveCall] = useState<{ user: User; isInitiator?: boolean } | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Drawer & Modals State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [addFriendHandle, setAddFriendHandle] = useState<string>('');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const handleBan = () => setIsBanned(true);
    const handleUnban = () => setIsBanned(false);

    window.addEventListener('ez:banned', handleBan);
    window.addEventListener('ez:unbanned', handleUnban);

    return () => {
      window.removeEventListener('ez:banned', handleBan);
      window.removeEventListener('ez:unbanned', handleUnban);
    };
  }, []);

  // Message pagination & Infinite scroll states
  const [hasMoreByChat, setHasMoreByChat] = useState<Record<string, boolean>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingChat, setIsFetchingChat] = useState(false);
  const currentChatKeyRef = useRef<string>('');

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
  const activeLiveCallRef = useRef(activeLiveCall);
  activeLiveCallRef.current = activeLiveCall;
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Request browser notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { });
    }
  }, []);

  // Ensure JWT token exists for current user session
  useEffect(() => {
    if (!currentUser?.handle) return;
    const token = localStorage.getItem('eztalk_token');
    if (!token) {
      const savedToken = ChatStorageService.getAccountToken(currentUser.handle);
      if (savedToken) {
        localStorage.setItem('eztalk_token', savedToken);
      }
    }
  }, [currentUser?.handle]);

  // Fetch latest message previews for chat list
  useEffect(() => {
    if (!currentUser?.handle) return;
    ApiService.getRecentConversations(currentUser.handle).then((recent) => {
      if (recent && Object.keys(recent).length > 0) {
        setLastMessages((prev) => ({ ...prev, ...recent }));
      }
    });
  }, [currentUser?.handle]);

  // Update dynamic document title with unread count or incoming/active call alert
  useEffect(() => {
    if (incomingCall) {
      let isFlashing = false;
      const callerName = incomingCall.caller.name || incomingCall.caller.handle;
      const flashInterval = setInterval(() => {
        isFlashing = !isFlashing;
        document.title = isFlashing
          ? `📞 Incoming Call from ${callerName}!`
          : `🔔 EzTalk Messenger`;
      }, 1000);
      return () => {
        clearInterval(flashInterval);
      };
    }

    if (activeLiveCall) {
      const peer = activeLiveCall.user.name || activeLiveCall.user.handle;
      document.title = `📞 In Call with ${peer} • EzTalk`;
      return;
    }

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) EzTalk — Ultra-Fast Private Messenger`;
    } else {
      document.title = 'EzTalk — Ultra-Fast Private Messenger & Web Calls';
    }
  }, [unreadCounts, incomingCall, activeLiveCall]);

  const aliasedAllUsers = useMemo(() => {
    return allUsers.map((u) => {
      const alias = currentUser?.contactAliases?.[normalizeHandle(u.handle).toLowerCase()];
      if (alias) {
        return { ...u, name: alias };
      }
      return u;
    });
  }, [allUsers, currentUser?.contactAliases]);

  // Filter friends list (ONLY explicitly added friends)
  const friendsList = aliasedAllUsers.filter(
    (u) =>
      normalizeHandle(u.handle) !== normalizeHandle(currentUser?.handle || '') &&
      addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(u.handle))
  );

  // Filter chat list (Friends + active chats)
  const chatUsers = aliasedAllUsers.filter(
    (u) => {
      const handleClean = normalizeHandle(u.handle).toLowerCase();
      const myHandle = normalizeHandle(currentUser?.handle || '').toLowerCase();
      if (handleClean === myHandle) return false;
      
      const isFriend = addedFriends.some((f) => normalizeHandle(f).toLowerCase() === handleClean);
      const hasActiveConv = activeConversations.some((c) => 
        c.participants.map(p => normalizeHandle(p).toLowerCase()).includes(handleClean)
      );
      const hasMessages = Boolean(lastMessages[handleClean] || lastMessages[u.id]);
      
      return isFriend || hasActiveConv || hasMessages;
    }
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

  const selectedUser = useMemo(() => {
    if (!urlChatId || urlChatId.startsWith('group__')) return null;
    const cleanUrl = normalizeHandle(urlChatId).toLowerCase();
    if (currentUser && normalizeHandle(currentUser.handle).toLowerCase() === cleanUrl) {
      return currentUser; // Saved Messages
    }
    return aliasedAllUsers.find(u => normalizeHandle(u.handle).toLowerCase() === cleanUrl) || null;
  }, [urlChatId, aliasedAllUsers, currentUser]);

  selectedUserRef.current = selectedUser;

  const selectedGroup = selectedGroupId
    ? userGroups.find((g) => g.id === selectedGroupId) || null
    : null;

  const isSelectedUserInFriends = selectedUser
    ? addedFriends.some((f) => normalizeHandle(f) === normalizeHandle(selectedUser.handle))
    : true;

  // Active conversation key and 0ms instantaneous message resolution
  const currentChatKey = selectedGroupId
    ? `group__${selectedGroupId}`
    : selectedUser && currentUser
      ? getConversationKey(currentUser.handle, selectedUser.handle)
      : '';

  const messages = useMemo(() => {
    if (!currentChatKey) return [];
    return messagesByChat[currentChatKey] || ChatStorageService.getConversations()[currentChatKey] || [];
  }, [currentChatKey, messagesByChat]);

  // Mark unread messages as read when viewing a chat
  useEffect(() => {
    if (!currentUser || !currentChatKey || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (m) => m.senderHandle !== currentUser.handle && m.status !== 'read'
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach((m) => {
        socketService.markMessageRead(m.id, currentUser.handle, currentChatKey);
      });
    }
  }, [currentChatKey, messages, currentUser]);

  // Fetch all users, groups, and current user profile from Backend API
  const refreshUsersAndGroups = useCallback(async () => {
    const token = localStorage.getItem('eztalk_token');
    if (!token) return; // Prevent spamming API when unauthenticated

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

  const fetchConversations = useCallback(async () => {
    const token = localStorage.getItem('eztalk_token');
    if (!currentUser || !token) return; // Prevent spamming API without token

    try {
      setIsLoadingConversations(true);
      const convs = await ApiService.getConversations();
      setActiveConversations(convs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    } else {
      setActiveConversations([]);
      setIsLoadingConversations(false);
    }
  }, [currentUser, fetchConversations]);

  // Fetch messages from Backend API with Local-First 0ms instant cache rendering & smooth background merge
  const refreshMessages = useCallback(async () => {
    const cUser = currentUserRef.current;
    if (!cUser) return;

    if (selectedGroupId) {
      const convKey = `group__${selectedGroupId}`;
      currentChatKeyRef.current = convKey;

      const cached = ChatStorageService.getConversation(convKey);
      if (!cached || cached.length === 0) {
        setIsFetchingChat(true);
      } else {
        setMessagesByChat((prev) => ({ ...prev, [convKey]: cached }));
        setIsFetchingChat(false);
      }

      try {
        const res = await ApiService.getGroupMessages(selectedGroupId, undefined, 30);
        if (currentChatKeyRef.current !== convKey) return;

        if (res.messages && res.messages.length > 0) {
          setMessagesByChat((prev) => {
            const existing = prev[convKey] || ChatStorageService.getConversations()[convKey] || [];
            const map = new Map<string, Message>();
            existing.forEach((m) => map.set(m.id, m));
            res.messages.forEach((m) => map.set(m.id, m));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            ChatStorageService.saveConversation(convKey, merged);
            return { ...prev, [convKey]: merged };
          });
        }
        setHasMoreByChat((prev) => ({ ...prev, [convKey]: res.hasMore }));
      } catch {
        // ignore
      } finally {
        if (currentChatKeyRef.current === convKey) setIsFetchingChat(false);
      }
    } else if (selectedUser) {
      const convKey = getConversationKey(cUser.handle, selectedUser.handle);
      currentChatKeyRef.current = convKey;

      const cached = ChatStorageService.getConversation(convKey);
      if (!cached || cached.length === 0) {
        setIsFetchingChat(true);
      } else {
        setMessagesByChat((prev) => ({ ...prev, [convKey]: cached }));
        setIsFetchingChat(false);
      }

      try {
        const res = await ApiService.getMessages(cUser.handle, selectedUser.handle, undefined, 30);
        if (currentChatKeyRef.current !== convKey) return;

        if (res.messages && res.messages.length > 0) {
          setMessagesByChat((prev) => {
            const existing = prev[convKey] || ChatStorageService.getConversations()[convKey] || [];
            const map = new Map<string, Message>();
            existing.forEach((m) => map.set(m.id, m));
            res.messages.forEach((m) => map.set(m.id, m));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            ChatStorageService.saveConversation(convKey, merged);
            return { ...prev, [convKey]: merged };
          });
        }
        setHasMoreByChat((prev) => ({ ...prev, [convKey]: res.hasMore }));
      } catch {
        // ignore
      } finally {
        if (currentChatKeyRef.current === convKey) setIsFetchingChat(false);
      }
    }
  }, [selectedUser, selectedGroupId]);

  // Infinite scroll loader: fetch older message slices and prepend without scroll jumping
  const handleLoadMoreMessages = useCallback(async () => {
    const cUser = currentUserRef.current;
    if (!cUser || isLoadingMore || !currentChatKey) return;
    
    // Default to true if not loaded yet
    const hasMore = hasMoreByChat[currentChatKey] ?? true;
    if (!hasMore) return;

    const currentMessages = messagesByChat[currentChatKey] || [];
    if (currentMessages.length === 0) return;

    const before = currentMessages[0].createdAt;
    if (!before) return;

    setIsLoadingMore(true);
    try {
      if (selectedGroupId) {
        const res = await ApiService.getGroupMessages(selectedGroupId, before, 30);
        if (!res.hasMore || res.messages.length === 0) {
          setHasMoreByChat((prev) => ({ ...prev, [currentChatKey]: false }));
        } else {
          setHasMoreByChat((prev) => ({ ...prev, [currentChatKey]: res.hasMore }));
        }
        if (res.messages && res.messages.length > 0) {
          setMessagesByChat((prev) => {
            const existing = prev[currentChatKey] || [];
            const map = new Map<string, Message>();
            res.messages.forEach((m) => map.set(m.id, m));
            existing.forEach((m) => map.set(m.id, m));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            ChatStorageService.saveConversation(currentChatKey, merged);
            return { ...prev, [currentChatKey]: merged };
          });
        }
      } else if (selectedUser) {
        const res = await ApiService.getMessages(cUser.handle, selectedUser.handle, before, 30);
        if (!res.hasMore || res.messages.length === 0) {
          setHasMoreByChat((prev) => ({ ...prev, [currentChatKey]: false }));
        } else {
          setHasMoreByChat((prev) => ({ ...prev, [currentChatKey]: res.hasMore }));
        }
        if (res.messages && res.messages.length > 0) {
          setMessagesByChat((prev) => {
            const existing = prev[currentChatKey] || [];
            const map = new Map<string, Message>();
            res.messages.forEach((m) => map.set(m.id, m));
            existing.forEach((m) => map.set(m.id, m));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            ChatStorageService.saveConversation(currentChatKey, merged);
            return { ...prev, [currentChatKey]: merged };
          });
        }
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, currentChatKey, hasMoreByChat, messagesByChat, selectedGroupId, selectedUser]);

  // Apply user theme and density settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('eztalk_theme');
    const savedCompact = localStorage.getItem('eztalk_compact_mode') === 'true';

    if (currentUser) {
      const serverTheme = currentUser.theme || currentUser.settings?.theme;
      const serverCompact = currentUser.settings?.compactMode;

      // If server returned a valid theme, use it and update local storage.
      // Otherwise, keep the saved theme from local storage.
      if (serverTheme) {
        applyTheme(serverTheme);
        if (serverTheme !== savedTheme) localStorage.setItem('eztalk_theme', serverTheme);
      } else {
        applyTheme(savedTheme || 'neon');
        // Optional: you can sync savedTheme to backend here if needed
      }

      applyCompactMode(serverCompact !== undefined ? Boolean(serverCompact) : savedCompact);
    } else {
      applyTheme(savedTheme || 'neon');
      applyCompactMode(savedCompact);
    }
  }, [currentUser?.theme, currentUser?.settings?.compactMode, currentUser?.settings?.theme]);

  useEffect(() => {
    refreshUsersAndGroups();
  }, [refreshUsersAndGroups]);

  const syncOutbox = useCallback(async () => {
    if (!currentUser) return;
    const outbox = ChatStorageService.getOutbox();
    if (outbox.length === 0) return;

    for (const msg of outbox) {
      try {
        const serverMsg = await ApiService.sendMessage(
          currentUser.handle,
          msg.recipientHandle || '',
          msg.text,
          msg.attachment,
          msg.replyTo,
          msg.groupId,
          undefined,
          msg.id,
          msg.isForwarded,
          msg.forwardedFrom,
          undefined,
          undefined,
          msg.tempId
        );
        if (serverMsg && serverMsg.status !== 'failed') {
          ChatStorageService.removeFromOutbox(msg.id);
          setMessagesByChat((prev) => {
            const existing = prev[msg.conversationKey] || [];
            const updated = existing.map((m) =>
              m.id === msg.id ? { ...m, ...serverMsg, status: 'sent' as const } : m
            );
            ChatStorageService.saveConversation(msg.conversationKey, updated);
            return { ...prev, [msg.conversationKey]: updated };
          });
        }
      } catch (err) {
        // Still failing, leave in outbox
      }
    }
  }, [currentUser]);

  useEffect(() => {
    window.addEventListener('online', syncOutbox);
    if (navigator.onLine) {
      syncOutbox();
    }
    return () => window.removeEventListener('online', syncOutbox);
  }, [syncOutbox]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    const handleReconnectSync = () => {
      if (currentUser) {
        refreshUsersAndGroups();
        fetchConversations();
        refreshMessages();
      }
    };
    window.addEventListener('ez:reconnect_sync', handleReconnectSync);
    return () => window.removeEventListener('ez:reconnect_sync', handleReconnectSync);
  }, [currentUser, refreshUsersAndGroups, fetchConversations, refreshMessages]);

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

      // Update last message preview for the chat list
      setLastMessages((prev) => {
        const updated = { ...prev };
        if (isForGroup) {
          updated[newMsg.groupId!] = newMsg;
          updated[`group__${newMsg.groupId!}`] = newMsg;
        } else {
          const otherHandle = sHandle === myHandle ? rHandle : sHandle;
          if (otherHandle) {
            const clean = normalizeHandle(otherHandle).toLowerCase();
            updated[clean] = newMsg;
            updated[normalizeHandle(otherHandle)] = newMsg;
            if (sHandle === myHandle && rHandle === myHandle) {
              updated['saved_messages'] = newMsg;
            }
          }
        }
        return updated;
      });

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
      } else if (sHandle !== myHandle && isCurrentChatOpen) {
        // Chat is open, mark as read immediately
        const convKey = isForGroup ? `group__${newMsg.groupId}` : getConversationKey(sHandle, rHandle);
        socketService.markMessageRead(newMsg.id, myHandle, convKey);
      }

      // Add to conversation cache immediately whether chat is active or not
      const targetConvKey = isForGroup
        ? `group__${newMsg.groupId}`
        : getConversationKey(sHandle, rHandle);

      setMessagesByChat((prev) => {
        const existing = prev[targetConvKey] || ChatStorageService.getConversations()[targetConvKey] || [];

        // 1. Exact ID match
        let matchIndex = existing.findIndex((m) => m.id === newMsg.id);

        // 2. Race condition deduplication: If message is from current user, merge with matching optimistic temp message
        if (matchIndex === -1 && sHandle === myHandle) {
          matchIndex = existing.findIndex((m) => {
            // Match by tempId if passed by backend
            if ((newMsg as any).tempId && ((m as any).tempId === (newMsg as any).tempId || m.id === (newMsg as any).tempId)) {
              return true;
            }
            // Match by pending optimistic state and matching content
            if (m.id.startsWith('temp_') || m.status === 'sending') {
              const sameText = (m.text || '').trim() === (newMsg.text || '').trim();
              const sameAttachment =
                (!m.attachment && !newMsg.attachment) ||
                (Boolean(m.attachment) &&
                  Boolean(newMsg.attachment) &&
                  (m.attachment?.url === newMsg.attachment?.url || m.attachment?.name === newMsg.attachment?.name));
              return sameText && sameAttachment;
            }
            return false;
          });
        }

        let updated: Message[];
        if (matchIndex >= 0) {
          // Replace temp_* optimistic message in-place with confirmed server message (preventing duplicate bubbles)
          updated = [...existing];
          updated[matchIndex] = {
            ...newMsg,
            status: newMsg.status || 'sent',
          };
        } else {
          // New message from remote sender
          updated = [...existing, newMsg];
        }

        ChatStorageService.saveConversation(targetConvKey, updated);
        return { ...prev, [targetConvKey]: updated };
      });

      // Check if notifications are muted for this sender or group
      const isMuted =
        mutedUsersRef.current[newMsg.senderId] ||
        mutedUsersRef.current[sHandle] ||
        (isForGroup && mutedUsersRef.current[newMsg.groupId!]);

      // If message is from someone else and NOT muted, handle sound, desktop notifications, and floating toasts
      if (sHandle !== myHandle && !isMuted) {
        // 1. Audible Chimes: Trigger chime if enabled and chat not focused or app in background
        if (currentUserRef.current?.settings?.soundNotifications !== false) {
          if (!isCurrentChatOpen || document.hidden) {
            playMessageChime();
          }
        }

        const sender = allUsersRef.current.find((u) => normalizeHandle(u.handle) === sHandle);
        const senderName = sender?.name || sHandle;
        const senderAvatar = sender?.avatar || DEFAULT_AVATAR;
        const senderId = sender?.id || sHandle;

        // 2. In-App Floating Toasts: Render animated floating toast if enabled and chat is NOT open
        if (currentUserRef.current?.settings?.floatingToasts !== false && !isCurrentChatOpen) {
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
          currentUserRef.current?.settings?.desktopNotifications !== false &&
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
      setMessagesByChat((prev) => {
        const next = { ...prev };
        let modified = false;
        for (const [convKey, msgList] of Object.entries(next)) {
          const idx = msgList.findIndex((m) => m.id === id);
          if (idx >= 0) {
            const updated = [...msgList];
            updated[idx] = { ...updated[idx], text, isEdited };
            next[convKey] = updated;
            ChatStorageService.saveConversation(convKey, updated);
            modified = true;
          }
        }
        return modified ? next : prev;
      });
      setLastMessages((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const [k, m] of Object.entries(updated)) {
          if (m.id === id) {
            updated[k] = { ...m, text, isEdited };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    });

    // Message deleted event
    const unsubDel = socketService.onMessageDeleted(({ id }) => {
      setMessagesByChat((prev) => {
        const next = { ...prev };
        let modified = false;
        for (const [convKey, msgList] of Object.entries(next)) {
          if (msgList.some((m) => m.id === id)) {
            const updated = msgList.filter((m) => m.id !== id);
            next[convKey] = updated;
            ChatStorageService.saveConversation(convKey, updated);
            modified = true;
          }
        }
        return modified ? next : prev;
      });
    });

    // Reaction updated event
    const unsubReact = socketService.onReactionUpdated(({ id, reactions }) => {
      setMessagesByChat((prev) => {
        const next = { ...prev };
        let modified = false;
        for (const [convKey, msgList] of Object.entries(next)) {
          const idx = msgList.findIndex((m) => m.id === id);
          if (idx >= 0) {
            const updated = [...msgList];
            updated[idx] = { ...updated[idx], reactions };
            next[convKey] = updated;
            ChatStorageService.saveConversation(convKey, updated);
            modified = true;
          }
        }
        return modified ? next : prev;
      });
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
      setOnlineHandles(Array.from(new Set([...handles, '@ai'])));
    });

    // Typing state event
    const unsubTyping = socketService.onTyping(({ senderHandle, recipientHandle, isTyping }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      if (normalizeHandle(recipientHandle || '') === normalizeHandle(cUser.handle)) {
        const sender = normalizeHandle(senderHandle);

        // Clear any existing timeout for this sender
        if (typingTimeoutsRef.current[sender]) {
          clearTimeout(typingTimeoutsRef.current[sender]);
          delete typingTimeoutsRef.current[sender];
        }

        setTypingUsers((prev) => ({
          ...prev,
          [sender]: isTyping,
        }));

        // Set a new timeout if they are typing
        if (isTyping) {
          typingTimeoutsRef.current[sender] = setTimeout(() => {
            setTypingUsers((prev) => ({
              ...prev,
              [sender]: false,
            }));
            delete typingTimeoutsRef.current[sender];
          }, 4000);
        }
      }
    });

    // Incoming Call event (Filtered to target recipient only & non-blocked)
    const unsubCall = socketService.onIncomingCall((data: any) => {
      const callerRaw = data.caller || data.from;
      const callerHandle = typeof callerRaw === 'string'
        ? callerRaw
        : callerRaw?.handle || data.callerHandle || data.from;
      const recipientHandle = data.recipientHandle || data.to;
      const cUser = currentUserRef.current;
      if (!cUser || !callerHandle) return;
      if (normalizeHandle(recipientHandle || '') === normalizeHandle(cUser.handle)) {
        if (!blockedUsersRef.current.includes(normalizeHandle(callerHandle))) {
          // If already in an active call, auto-decline so caller receives busy signal
          if (activeLiveCallRef.current) {
            socketService.declineCall(callerHandle, cUser.handle);
            return;
          }

          // Resolve full caller object: check if callerRaw is already a full object with avatar/name,
          // or look up from allUsersRef
          const foundUser = allUsersRef.current.find(
            (u) => normalizeHandle(u.handle) === normalizeHandle(callerHandle)
          );
          const resolvedAvatar = (typeof callerRaw === 'object' && callerRaw?.avatar)
            || foundUser?.avatar
            || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callerHandle)}`;
          const resolvedName = (typeof callerRaw === 'object' && callerRaw?.name)
            || foundUser?.name
            || callerHandle;

          const fullCaller: User = {
            id: foundUser?.id || callerHandle,
            ...(foundUser || {}),
            ...(typeof callerRaw === 'object' ? callerRaw : {}),
            name: resolvedName,
            handle: normalizeHandle(callerHandle),
            avatar: resolvedAvatar,
          };

          setIncomingCall({ caller: fullCaller });
        }
      }
    });

    // Call declined event
    const unsubCallDeclined = socketService.onCallDeclined(() => {
      callSoundService.stopAll();
      setIncomingCall(null);
      // Give CallModal 1.2s to show status and record chat history, with fallback timeout
      setTimeout(() => {
        if (activeLiveCallRef.current) {
          setActiveLiveCall(null);
        }
      }, 2500);
    });

    // Call ended event
    const unsubCallEnded = socketService.onCallEnded(() => {
      callSoundService.stopAll();
      setIncomingCall(null);
      // Give CallModal 1.2s to show status and record chat history, with fallback timeout
      setTimeout(() => {
        if (activeLiveCallRef.current) {
          setActiveLiveCall(null);
        }
      }, 2500);
    });

    // Chat cleared event
    const unsubClear = socketService.onChatCleared((data: any) => {
      const key = data?.key || currentChatKey;
      if (key) {
        setMessagesByChat((prev) => {
          const updated = { ...prev, [key]: [] };
          ChatStorageService.saveConversation(key, []);
          return updated;
        });
      }
    });

    const unsubHistoryCleared = socketService.onHistoryCleared(({ targetId, isGroup }) => {
      const cUser = currentUserRef.current;
      if (!cUser) return;
      const convKey = isGroup
        ? `group__${targetId}`
        : getConversationKey(cUser.handle, targetId);

      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[convKey];
        return next;
      });

      setLastMessages((prev) => {
        const next = { ...prev };
        delete next[convKey];
        if (!isGroup) delete next[normalizeHandle(targetId)];
        return next;
      });

      const all = ChatStorageService.getConversations();
      if (all[convKey]) {
        delete all[convKey];
        ChatStorageService.saveConversations(all);
      }
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
      setMessagesByChat((prev) => {
        const next = { ...prev };
        let modified = false;
        for (const [convKey, msgList] of Object.entries(next)) {
          const idx = msgList.findIndex((m) => m.id === messageId);
          if (idx >= 0) {
            const updated = [...msgList];
            updated[idx] = { ...updated[idx], status: 'read' as const };
            next[convKey] = updated;
            ChatStorageService.saveConversation(convKey, updated);
            modified = true;
          }
        }
        return modified ? next : prev;
      });
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
      unsubHistoryCleared();
      unsubProfile();
      unsubUserUpdated();
      unsubFriends();
      unsubDraft();
      unsubRead();
    };
  }, [currentUser, selectedUser, selectedGroupId, mutedUsers, refreshUsersAndGroups]);

  const handleLogin = (user: User) => {
    const activeToken = (user as any).token || localStorage.getItem('eztalk_token');
    if (activeToken) {
      ChatStorageService.setAccountToken(user.handle, activeToken);
      localStorage.setItem('eztalk_token', activeToken);
    }
    setSelectedUserId('');
    setSelectedGroupId(null);
    setMessagesByChat(ChatStorageService.getConversations());
    setUnreadCounts({});
    setActiveSection('chats');
    setCurrentUser(user);
    currentUserRef.current = user;
    ChatStorageService.saveAuthUser(user);
    ChatStorageService.addMyAccount(user);
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
    socketService.disconnect();

    // Switch active JWT token for target account
    const targetToken =
      (targetAccount as any).token ||
      ChatStorageService.getAccountToken(targetAccount.handle);
    if (targetToken) {
      localStorage.setItem('eztalk_token', targetToken);
      (targetAccount as any).token = targetToken;
    }

    setSelectedUserId('');
    setSelectedGroupId(null);
    setUnreadCounts({});
    setDrafts({});
    setActiveChatHandles([]);
    setActiveSection('chats');
    setIsDrawerOpen(false);

    const storedAccounts = ChatStorageService.getMyAccounts();
    const latestAccount =
      storedAccounts.find(
        (a) => normalizeHandle(a.handle).toLowerCase() === normalizeHandle(targetAccount.handle).toLowerCase()
      ) || targetAccount;

    let userToSet = latestAccount;
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
    ChatStorageService.addMyAccount(userToSet);

    // Now that auth user is saved, load their conversations
    const userConvs = ChatStorageService.getConversations();
    setMessagesByChat(userConvs);
    setMyAccounts(ChatStorageService.getMyAccounts());

    // Recalculate lastMessages
    const map: Record<string, Message> = {};
    const myHandle = normalizeHandle(userToSet.handle);
    for (const [key, msgs] of Object.entries(userConvs)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        map[key] = last;
        if (key.startsWith('group__')) {
          map[key.replace('group__', '')] = last;
        } else {
          const parts = key.split('__');
          if (parts.length === 2) {
            const other = parts[0] === myHandle ? parts[1] : parts[0];
            map[other] = last;
            map[`@${other}`] = last;
            if (parts[0] === parts[1]) {
              map['saved_messages'] = last;
            }
          }
        }
      }
    }
    setLastMessages(map);

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
    socketService.disconnect();
    if (currentUser?.handle) {
      ChatStorageService.removeAccountToken(currentUser.handle);
    }
    localStorage.removeItem('eztalk_token');
    setCurrentUser(null);
    ChatStorageService.saveAuthUser(null);
    setSelectedUserId('');
    setSelectedGroupId(null);
    setMessagesByChat({});
    setLastMessages({});
    setDrafts({});
    setUnreadCounts({});
    setAddedFriends([]);
    setActiveChatHandles([]);
  };

  const handleAddAccount = () => {
    // 1. Preserve current account in myAccounts list with its token so user can easily switch back
    if (currentUser) {
      ChatStorageService.addMyAccount(currentUser);
      const activeToken = localStorage.getItem('eztalk_token');
      if (activeToken && currentUser.handle) {
        ChatStorageService.setAccountToken(currentUser.handle, activeToken);
      }
    }

    // 2. Disconnect socket
    socketService.disconnect();

    // 3. Clear active auth credentials
    localStorage.removeItem('eztalk_token');
    ChatStorageService.saveAuthUser(null);
    setCurrentUser(null);
    currentUserRef.current = null;

    // 4. Reset in-memory chat session
    setSelectedUserId('');
    setSelectedGroupId(null);
    setMessagesByChat({});
    setLastMessages({});
    setDrafts({});
    setUnreadCounts({});
    setAddedFriends([]);
    setActiveChatHandles([]);
    setIsDrawerOpen(false);

    // 5. Navigate straight to login route
    navigate('/login');
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

  const handleClearHistory = async (targetIdOrHandle: string, isGroup: boolean) => {
    // 1. Backend call
    await ApiService.clearChatHistory(targetIdOrHandle, isGroup);

    // 2. Client update
    const convKey = isGroup
      ? `group__${targetIdOrHandle}`
      : getConversationKey(currentUser?.handle || '', targetIdOrHandle);

    setMessagesByChat((prev) => {
      const next = { ...prev };
      delete next[convKey];
      return next;
    });

    setLastMessages((prev) => {
      const next = { ...prev };
      delete next[convKey];
      if (!isGroup) delete next[normalizeHandle(targetIdOrHandle)];
      return next;
    });

    const all = ChatStorageService.getConversations();
    if (all[convKey]) {
      delete all[convKey];
      ChatStorageService.saveConversations(all);
    }
  };

  const handleDeleteChat = async (targetIdOrHandle: string, isGroup: boolean) => {
    // 1. Clear history completely
    await handleClearHistory(targetIdOrHandle, isGroup);

    // 2. Remove from active chats if not a group
    if (!isGroup) {
      const handle = normalizeHandle(targetIdOrHandle);
      setActiveChatHandles((prev) => prev.filter(h => h !== handle));
      await ApiService.deleteConversation(handle);
      setActiveConversations((prev) => prev.filter(c => !c.participants.includes(handle)));
    }

    // 3. Reset active dialogue and navigate away if it's currently open
    if (
      (isGroup && selectedGroupId === targetIdOrHandle) ||
      (!isGroup && normalizeHandle(selectedUserId) === normalizeHandle(targetIdOrHandle))
    ) {
      setSelectedUserId('');
      setSelectedGroupId(null);
      navigate('/t/direct');
    }
  };

  // Send Message (Direct or Group, with Reply, Forwarding & Optimistic UI)
  const handleSendMessage = async (
    text: string,
    attachment?: Attachment,
    replyTo?: QuotedMessage,
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

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempMsg: Message = {
      id: tempId,
      tempId,
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
      status: 'sending',
      timestamp: 'Sent PM',
      createdAt: new Date().toISOString(),
    };

    // Save to local cache & messagesByChat immediately (Optimistic Update)
    setMessagesByChat((prev) => {
      const existing = prev[convKey] || ChatStorageService.getConversations()[convKey] || [];
      const updated = [...existing, tempMsg];
      ChatStorageService.saveConversation(convKey, updated);
      return { ...prev, [convKey]: updated };
    });

    // Update last message preview for sidebar
    setLastMessages((prev) => {
      const updated = { ...prev };
      if (targetGroupId) {
        updated[targetGroupId] = tempMsg;
        updated[`group__${targetGroupId}`] = tempMsg;
      } else if (targetRecipient) {
        const norm = normalizeHandle(targetRecipient);
        updated[norm] = tempMsg;
        updated[norm.toLowerCase()] = tempMsg;
        if (norm.toLowerCase() === normalizeHandle(currentUser.handle).toLowerCase()) {
          updated['saved_messages'] = tempMsg;
        }
      }
      return updated;
    });

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
        tempId,
        isForwarded,
        forwardedFrom,
        undefined,
        undefined,
        tempId
      );

      const isFailed = !serverMsg || serverMsg.status === 'failed';

      // Update status in place (matching tempId or server id)
      setMessagesByChat((prev) => {
        const existing = prev[convKey] || [];
        const updated: Message[] = existing.map((m) => {
          if (m.id === tempId || (m as any).tempId === tempId || (serverMsg && m.id === serverMsg.id)) {
            return {
              ...m,
              ...(serverMsg || {}),
              status: isFailed ? ('failed' as const) : ('sent' as const),
            } as Message;
          }
          return m;
        });
        ChatStorageService.saveConversation(convKey, updated);
        return { ...prev, [convKey]: updated };
      });
    } catch {
      // Offline Outbox Queue: Mark as pending and save to outbox
      setMessagesByChat((prev) => {
        const existing = prev[convKey] || [];
        const updated: Message[] = existing.map((m) =>
          m.id === tempId ? { ...m, status: 'pending' as const } : m
        );
        ChatStorageService.saveConversation(convKey, updated);
        return { ...prev, [convKey]: updated };
      });
      ChatStorageService.addToOutbox({ ...tempMsg, status: 'pending' as const });
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMsg: Message) => {
    if (!currentUser) return;
    const convKey = failedMsg.conversationKey || currentChatKey;
    if (!convKey) return;

    // Reset status back to 'sending'
    setMessagesByChat((prev) => {
      const existing = prev[convKey] || [];
      const updated = existing.map((m) => (m.id === failedMsg.id ? { ...m, status: 'sending' as const } : m));
      ChatStorageService.saveConversation(convKey, updated);
      return { ...prev, [convKey]: updated };
    });

    try {
      const serverMsg = await ApiService.sendMessage(
        currentUser.handle,
        failedMsg.recipientHandle || null,
        failedMsg.text,
        failedMsg.attachment,
        failedMsg.replyTo,
        failedMsg.groupId,
        failedMsg.callInfo,
        failedMsg.id,
        failedMsg.isForwarded,
        failedMsg.forwardedFrom,
        failedMsg.isSecret,
        failedMsg.forwardRestricted,
        (failedMsg as any).tempId || failedMsg.id
      );

      const isFailed = !serverMsg || serverMsg.status === 'failed';

      setMessagesByChat((prev) => {
        const existing = prev[convKey] || [];
        const updated = existing.map((m) =>
          m.id === failedMsg.id
            ? ({
              ...m,
              ...(serverMsg || {}),
              status: isFailed ? ('failed' as const) : ('sent' as const),
            } as Message)
            : m
        );
        ChatStorageService.saveConversation(convKey, updated);
        return { ...prev, [convKey]: updated };
      });
    } catch {
      setMessagesByChat((prev) => {
        const existing = prev[convKey] || [];
        const updated = existing.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' as const } : m));
        ChatStorageService.saveConversation(convKey, updated);
        return { ...prev, [convKey]: updated };
      });
    }
  };

  // Forward Message to User or Group
  const handleForwardMessage = async (message: Message, targetUser?: User, targetGroup?: Group) => {
    if (!currentUser) return;
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
      targetHandle || undefined,
      targetGroupId,
      true,
      originalSender
    );

    setToast({
      id: Date.now().toString(),
      senderName: targetGroup ? targetGroup.name : (targetUser?.name || targetUser?.handle || 'Recipient'),
      senderHandle: targetGroup ? targetGroup.name : (targetUser?.handle || 'Recipient'),
      senderAvatar: targetGroup ? targetGroup.avatar : (targetUser?.avatar || DEFAULT_AVATAR),
      text: `↪ Forwarded message from ${originalSender}`,
      groupId: targetGroupId,
    });
  };

  // Edit Message
  const handleEditMessage = async (id: string, newText: string) => {
    if (currentChatKey) {
      setMessagesByChat((prev) => {
        const existing = prev[currentChatKey] || [];
        const updated = existing.map((m) => (m.id === id ? { ...m, text: newText, isEdited: true } : m));
        ChatStorageService.saveConversation(currentChatKey, updated);
        return { ...prev, [currentChatKey]: updated };
      });
    }
    setLastMessages((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const [k, m] of Object.entries(updated)) {
        if (m.id === id) {
          updated[k] = { ...m, text: newText, isEdited: true };
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
    await ApiService.editMessage(id, newText);
  };

  // Delete Message
  const handleDeleteMessage = async (id: string) => {
    if (currentChatKey) {
      setMessagesByChat((prev) => {
        const existing = prev[currentChatKey] || [];
        const updated = existing.filter((m) => m.id !== id);
        ChatStorageService.saveConversation(currentChatKey, updated);
        return { ...prev, [currentChatKey]: updated };
      });
    }
    await ApiService.deleteMessage(id);
  };

  // Toggle Emoji Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !currentChatKey) return;
    const userHandle = normalizeHandle(currentUser.handle);

    setMessagesByChat((prev) => {
      const existing = prev[currentChatKey] || [];
      const updated = existing.map((m) => {
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
      });
      ChatStorageService.saveConversation(currentChatKey, updated);
      return { ...prev, [currentChatKey]: updated };
    });

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

      // Reset custom alias to normal/default when friend is removed
      const normalizedTarget = clean.toLowerCase();
      if (currentUser.contactAliases && currentUser.contactAliases[normalizedTarget]) {
        const newAliases = { ...currentUser.contactAliases };
        delete newAliases[normalizedTarget];
        handleUpdateCurrentUser({ ...currentUser, contactAliases: newAliases });
        ApiService.setContactAlias(currentUser.handle, clean, '').catch(() => {});
      }

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

  const handleSaveContactAlias = async (targetHandle: string, newAlias: string) => {
    if (!currentUser) return;
    const cleanTarget = normalizeHandle(targetHandle);
    const normalizedKey = cleanTarget.toLowerCase();
    const cleanAlias = sanitizeDisplayName(newAlias).trim();

    const currentAliases = currentUser.contactAliases || {};
    const newAliases = { ...currentAliases };

    if (cleanAlias) {
      newAliases[normalizedKey] = cleanAlias;
    } else {
      delete newAliases[normalizedKey];
    }

    handleUpdateCurrentUser({ ...currentUser, contactAliases: newAliases });

    try {
      await ApiService.setContactAlias(currentUser.handle, cleanTarget, cleanAlias);
    } catch (err) {
      console.error('Failed to save contact alias on server:', err);
    }
  };

  const handleClearChat = async () => {
    if (!currentUser) return;
    if (currentChatKey) {
      setMessagesByChat((prev) => {
        const updated = { ...prev, [currentChatKey]: [] };
        ChatStorageService.saveConversation(currentChatKey, []);
        return updated;
      });
    }
    if (selectedGroupId) {
      await ApiService.clearChat(currentUser.handle, undefined, selectedGroupId);
    } else if (selectedUser) {
      ChatStorageService.clearConversation(currentUser.handle, selectedUser.handle);
      await ApiService.clearChat(currentUser.handle, selectedUser.handle);
    }
  };

  const handleAddNewFriend = async (newFriend: User, alias?: string) => {
    if (!currentUser) return;
    
    const updateAliasSettings = (targetHandle: string) => {
      const normalizedHandle = normalizeHandle(targetHandle).toLowerCase();
      const currentAliases = currentUser.contactAliases || {};
      const newAliases = { ...currentAliases };
      
      if (alias && alias.trim()) {
        newAliases[normalizedHandle] = alias.trim();
      } else {
        delete newAliases[normalizedHandle];
      }
      
      handleUpdateCurrentUser({ ...currentUser, contactAliases: newAliases });
    };

    try {
      const registered = await ApiService.register(newFriend);
      const updated = ChatStorageService.upsertUser(registered);
      setAllUsers(updated);
      const friends = ChatStorageService.addFriend(currentUser.handle, registered.handle);
      setAddedFriends(friends);
      
      if (alias !== undefined) {
        updateAliasSettings(registered.handle);
      }

      setSelectedUserId(registered.id);
      setSelectedGroupId(null);
      await ApiService.toggleFriend(currentUser.handle, registered.handle, 'add');
    } catch {
      const updated = ChatStorageService.upsertUser(newFriend);
      setAllUsers(updated);
      const friends = ChatStorageService.addFriend(currentUser.handle, newFriend.handle);
      setAddedFriends(friends);
      
      if (alias !== undefined) {
        updateAliasSettings(newFriend.handle);
      }

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
    ChatStorageService.addMyAccount(updated);
    ChatStorageService.upsertUser(updated);
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
        ChatStorageService.addMyAccount(serverUser);
        ChatStorageService.upsertUser(serverUser);
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
    ChatStorageService.removeAccountToken(acc.handle);
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

  // Custom 404 handler for invalid routes
  if (isNotFound) {
    return (
      <NotFoundScreen
        onReturnHome={() => {
          setIsNotFound(false);
          navigate('/t/direct');
        }}
      />
    );
  }

  const token = localStorage.getItem('eztalk_token');
  const isAuth = Boolean(currentUser && token);

  if (isBanned) {
    return <BanScreen />;
  }

  const authContent = (
    <>
      <AuthScreen
        onLogin={(u) => { handleLogin(u); navigate('/t/direct', { replace: true }); }}
        onOpenLegal={(tab) => setLegalModal({ isOpen: true, tab })}
        onCancel={myAccounts.length > 0 ? () => {
          handleSwitchAccount(myAccounts[0]);
          navigate('/t/direct');
        } : undefined}
      />
      <LegalModal
        isOpen={legalModal.isOpen}
        initialTab={legalModal.tab}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
      />
      <CookieBanner
        onOpenPrivacy={() => setLegalModal({ isOpen: true, tab: 'privacy' })}
      />
    </>
  );

  const mainContent = (
    <div className="w-full h-full min-h-[100dvh] h-[100dvh] bg-ez-base text-slate-100 flex flex-col overflow-hidden font-sans relative">
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
              className="w-6 h-6 flex items-center justify-center text-ez-muted hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
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
                navigate(`/t/direct/${normalizeHandle(currentUser.handle).replace('@', '')}`);
              }
            }}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onSelectSavedMessages={() => {
              if (currentUser) {
                navigate(`/t/direct/${normalizeHandle(currentUser.handle).replace('@', '')}`);
                setActiveSection('saved');
              }
            }}
            onSwitchUser={handleSwitchAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddAccount={handleAddAccount}
            onLogout={handleLogout}
          />
        </div>

        {/* Panel 2: Friends & Conversations Panel */}
        <div className={`h-full ${selectedUser || selectedGroup ? 'hidden md:flex' : 'flex'} w-full md:w-auto shrink-0`}>
          <FriendsList
            key={currentUser?.id || 'guest'}
            currentUser={currentUser}
            users={chatUsers}
            addedFriends={addedFriends}
            isLoading={isLoadingConversations}
            allExistingUsers={aliasedAllUsers}
            groups={userGroups}
            unreadCounts={unreadCounts}
            onlineHandles={onlineHandles}
            blockedUsers={blockedUsers}
            lastMessages={lastMessages}
            selectedUserId={selectedUserId}
            selectedGroupId={selectedGroupId}
            onOpenMenu={() => setIsDrawerOpen(true)}
            onSelectUser={(u) => {
              const handle = normalizeHandle(u.handle);
              navigate(`/t/direct/${handle.replace('@', '')}`);
              setActiveSection(currentUser && (handle === normalizeHandle(currentUser.handle)) ? 'saved' : 'chats');
              setUnreadCounts((prev) => ({ ...prev, [handle]: 0, [u.id || handle]: 0 }));
              setActiveChatHandles((prev) => [...new Set([...prev, handle])]);
            }}
            onSelectGroup={(g) => {
              navigate(`/t/direct/${g.id}`);
              setActiveSection('chats');
              setUnreadCounts((prev) => ({ ...prev, [g.id]: 0 }));
            }}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
            pinnedChats={pinnedChats}
            mutedUsers={mutedUsers}
            onTogglePin={handleTogglePin}
            onToggleMute={handleToggleMute}
            onClearHistory={handleClearHistory}
            onDeleteChat={handleDeleteChat}
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
              draftText={
                selectedGroupId
                  ? drafts[`group__${selectedGroupId}`] || ChatStorageService.getDraft(`group__${selectedGroupId}`)
                  : selectedUser
                    ? drafts[getConversationKey(currentUser.handle, selectedUser.handle)] ||
                    ChatStorageService.getDraft(getConversationKey(currentUser.handle, selectedUser.handle))
                    : ''
              }
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
                navigate('/t/direct');
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
              hasMore={Boolean(currentChatKey && hasMoreByChat[currentChatKey])}
              isLoadingMore={isLoadingMore}
              isLoadingInitial={isFetchingChat}
              onLoadMore={handleLoadMoreMessages}
              onRetryMessage={handleRetryMessage}
              currentAlias={selectedUser ? currentUser?.contactAliases?.[normalizeHandle(selectedUser.handle).toLowerCase()] : undefined}
              originalName={selectedUser ? allUsers.find((u) => normalizeHandle(u.handle) === normalizeHandle(selectedUser.handle))?.name : undefined}
              onSaveAlias={(newAlias) => selectedUser && handleSaveContactAlias(selectedUser.handle, newAlias)}
              onEditAlias={() => {
                if (selectedUser) {
                  setEditingAliasUser(selectedUser);
                }
              }}
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
        onAddAccount={handleAddAccount}
        onRemoveAccount={handleRemoveAccount}
        onLogout={handleLogout}
        onOpenLegal={(tab) => setLegalModal({ isOpen: true, tab })}
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
          existingUsers={aliasedAllUsers}
          initialHandle={addFriendHandle}
          onClose={() => {
            setIsAddFriendOpen(false);
            setAddFriendHandle('');
          }}
          onAddFriend={(friend, alias) => {
            handleAddNewFriend(friend, alias);
            setIsAddFriendOpen(false);
            setAddFriendHandle('');
          }}
        />
      )}

      {/* Edit Contact Name / Alias Modal */}
      {editingAliasUser && currentUser && (
        <EditContactNameModal
          isOpen={Boolean(editingAliasUser)}
          user={editingAliasUser}
          currentAlias={currentUser.contactAliases?.[normalizeHandle(editingAliasUser.handle).toLowerCase()]}
          originalName={allUsers.find((u) => normalizeHandle(u.handle) === normalizeHandle(editingAliasUser.handle))?.name}
          onClose={() => setEditingAliasUser(null)}
          onSave={(newAlias) => {
            handleSaveContactAlias(editingAliasUser.handle, newAlias);
            setEditingAliasUser(null);
          }}
        />
      )}

      {/* Real-time Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          isOpen={Boolean(incomingCall)}
          callRingtonesEnabled={currentUser?.settings?.callRingtones !== false}
          onAccept={() => {
            callSoundService.stopAll();
            if (currentUser) {
              socketService.acceptCall(incomingCall.caller.handle, currentUser.handle, currentUser);
            }
            setActiveLiveCall({ user: incomingCall.caller, isInitiator: false });
            setIncomingCall(null);
          }}
          onDecline={(reason) => {
            callSoundService.stopAll();
            if (currentUser) {
              socketService.declineCall(incomingCall.caller.handle, currentUser.handle, reason || 'declined');
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
                const resolvedType: 'outgoing' | 'canceled' | 'declined' | 'missed' =
                  callInfo.duration && callInfo.duration > 0
                    ? 'outgoing'
                    : callInfo.type === 'declined'
                      ? 'declined'
                      : callInfo.type === 'missed'
                        ? 'missed'
                        : 'canceled';

                const finalCallInfo = {
                  type: resolvedType,
                  duration: callInfo.duration || 0,
                };

                const text = callInfo.duration
                  ? `📞 Voice Call (${Math.floor(callInfo.duration / 60)}:${(callInfo.duration % 60)
                    .toString()
                    .padStart(2, '0')})`
                  : resolvedType === 'missed'
                    ? '📵 Missed Voice Call'
                    : resolvedType === 'declined'
                      ? '📞 Declined Call'
                      : '📞 Canceled Call';

                ApiService.sendMessage(
                  currentUser.handle,
                  activeLiveCall.user.handle,
                  text,
                  undefined,
                  undefined,
                  undefined,
                  finalCallInfo
                ).catch((err) => {
                  console.error('Failed to log call end message:', err);
                });
              }
            }
            setActiveLiveCall(null);
          }}
        />
      )}

      {/* Legal Privacy & Terms Modal */}
      <LegalModal
        isOpen={legalModal.isOpen}
        initialTab={legalModal.tab}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Cookie Consent Banner */}
      <CookieBanner
        onOpenPrivacy={() => setLegalModal({ isOpen: true, tab: 'privacy' })}
      />

      {/* PWA Install Banner */}
      {showPwaInstall && (
        <div className="fixed bottom-6 sm:bottom-auto sm:top-4 left-0 right-0 mx-auto z-[100] w-[92%] sm:w-auto max-w-sm bg-ez-elevated border border-ez-border shadow-glass-lg rounded-2xl p-3.5 flex items-center justify-between gap-4 animate-slide-up sm:animate-fade-in backdrop-blur-xl">
          <div className="flex-1">
            <p className="text-xs text-white font-medium">
              {t.pwa?.installBannerText || 'Install EzTalk Web for a faster, full-screen app experience.'}
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleInstallPwa}
              className="px-3 py-1.5 bg-neon-green text-black text-xs font-bold rounded-xl shadow-neon-sm hover:scale-105 transition-transform"
            >
              {t.pwa?.install || 'Install'}
            </button>
            <button
              onClick={closePwaBanner}
              className="w-7 h-7 flex items-center justify-center text-ez-muted hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      {/* Main Routes */}
      <Route path="about" element={<LandingPage />} />
      <Route path="login" element={isAuth ? <Navigate to={`/${lang}/t/direct`} replace /> : authContent} />
      <Route path="t/*" element={!isAuth ? <Navigate to={`/${lang}/login`} replace /> : mainContent} />
      <Route path="direct/*" element={<Navigate to={`/${lang}/t/direct`} replace />} />
      <Route path="@:handle" element={<Navigate to={`/${lang}/t/direct`} replace />} />
      <Route path="*" element={<Navigate to={`/${lang}/${isAuth ? 't/direct' : 'about'}`} replace />} />
    </Routes>
  );
}
