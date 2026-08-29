import { User, Message } from '../types/chat';
import { INITIAL_USERS } from '../data/mockData';

export const DEFAULT_CURRENT_USER: User = {
  id: 'user_alex',
  name: 'Alex Rivera',
  handle: '@AlexR',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  status: 'Online',
  email: 'alex@eztalk.app',
  bio: 'EzTalk power user & designer',
};

// Normalize handle to lowercase with leading '@'
export function normalizeHandle(handle: string): string {
  if (!handle) return '';
  const trimmed = handle.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

// Universal handle-based two-way conversation key
export function getConversationKey(handle1: string, handle2: string): string {
  const h1 = normalizeHandle(handle1);
  const h2 = normalizeHandle(handle2);
  return [h1, h2].sort().join('__');
}

// Initial mockup messages matching image_0.png
const INITIAL_SHARED_CONVERSATIONS: Record<string, Message[]> = {
  [getConversationKey('@AlexR', '@User_A')]: [
    {
      id: 'msg_1',
      senderId: 'user_alex',
      senderHandle: '@AlexR',
      text: 'Hi cnn hate message',
      timestamp: '18:30',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'msg_2',
      senderId: 'user_a',
      senderHandle: '@User_A',
      text: "What's not the message thread?",
      timestamp: '18:32',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'msg_3',
      senderId: 'user_alex',
      senderHandle: '@AlexR',
      text: 'Why is a mow important?',
      timestamp: '11:15',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg_4',
      senderId: 'user_a',
      senderHandle: '@User_A',
      text: 'I not mportant conseting time. What thanks on message.ns',
      timestamp: '11:20',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg_5',
      senderId: 'user_alex',
      senderHandle: '@AlexR',
      text: 'Hi, fmlwwvo you eanre I have 10 minutes informations?',
      timestamp: '11:25',
      createdAt: new Date().toISOString(),
    },
  ],
  [getConversationKey('@AlexR', '@User_B')]: [
    {
      id: 'msg_b1',
      senderId: 'user_b',
      senderHandle: '@User_B',
      text: 'Hey! Are we still syncing up for the design review today?',
      timestamp: '14:20',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'msg_b2',
      senderId: 'user_alex',
      senderHandle: '@AlexR',
      text: 'Yes, I just finished the EzTalk UI prototype mockup. Here is the preview screenshot:',
      attachment: {
        id: 'att_b1',
        name: 'design_mockup.png',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
        size: '245 KB',
      },
      timestamp: '10:05',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg_b3',
      senderId: 'user_b',
      senderHandle: '@User_B',
      text: 'Awesome, looks super clean with the neon green theme!',
      timestamp: '10:10',
      createdAt: new Date().toISOString(),
    },
  ],
  [getConversationKey('@AlexR', '@User_C')]: [
    {
      id: 'msg_c1',
      senderId: 'user_c',
      senderHandle: '@User_C',
      text: 'Hello, check out the new dark mode color palette.',
      attachment: {
        id: 'att_c1',
        name: 'palette_moodboard.jpg',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
        size: '312 KB',
      },
      timestamp: 'Received',
    },
    {
      id: 'msg_c2',
      senderId: 'user_alex',
      senderHandle: '@AlexR',
      text: 'Checking it right now, the contrast is spot on.',
      attachment: {
        id: 'att_c2',
        name: 'abstract_waves.jpg',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80',
        size: '420 KB',
      },
      timestamp: 'Sent PM',
    },
  ],
};

// Storage Keys (v3 for clean handle-based database)
const STORAGE_ALL_USERS = 'eztalk_all_users_v3';
const STORAGE_MY_ACCOUNTS = 'eztalk_my_accounts_v3';
const STORAGE_CONVERSATIONS = 'eztalk_conversations_v3';
const STORAGE_AUTH_USER = 'eztalk_auth_user_v3';

function normalizeStorageUser(u: any): User {
  if (!u) return u;
  const uid = u.id || (u._id ? String(u._id) : '') || `user_${(u.handle || '').replace('@', '')}`;
  return {
    ...u,
    id: uid,
    handle: normalizeHandle(u.handle || ''),
  };
}

export class ChatStorageService {
  // Get all registered users and contacts
  static getAllUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_ALL_USERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeStorageUser);
        }
      }
    } catch {
      // fallback
    }
    const initial = [...INITIAL_USERS, DEFAULT_CURRENT_USER].map(normalizeStorageUser);
    this.saveAllUsers(initial);
    return initial;
  }

  static saveAllUsers(users: User[]) {
    localStorage.setItem(STORAGE_ALL_USERS, JSON.stringify(users.map(normalizeStorageUser)));
  }

  // Get user by handle
  static getUserByHandle(handle: string): User | undefined {
    const all = this.getAllUsers();
    const target = normalizeHandle(handle);
    return all.find((u) => normalizeHandle(u.handle) === target);
  }

  // Save or update user
  static upsertUser(user: User): User[] {
    const all = this.getAllUsers();
    const formatted = normalizeStorageUser(user);
    const targetHandle = formatted.handle;
    const existingIndex = all.findIndex((u) => normalizeHandle(u.handle) === targetHandle || u.id === formatted.id);
    let updated: User[];
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = { ...all[existingIndex], ...formatted };
    } else {
      updated = [...all, formatted];
    }
    this.saveAllUsers(updated);
    return updated;
  }

  // Get list of user's own registered accounts
  static getMyAccounts(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_MY_ACCOUNTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return [];
  }

  static saveMyAccounts(accounts: User[]) {
    localStorage.setItem(STORAGE_MY_ACCOUNTS, JSON.stringify(accounts));
  }

  static addMyAccount(account: User) {
    const current = this.getMyAccounts();
    const targetHandle = normalizeHandle(account.handle);
    const exists = current.some((a) => normalizeHandle(a.handle) === targetHandle || a.id === account.id);
    let updated: User[];
    if (!exists) {
      updated = [...current, { ...account, handle: targetHandle }];
    } else {
      updated = current.map((a) =>
        normalizeHandle(a.handle) === targetHandle || a.id === account.id ? { ...a, ...account, handle: targetHandle } : a
      );
    }
    this.saveMyAccounts(updated);
  }

  static removeMyAccount(handleOrId: string): User[] {
    const current = this.getMyAccounts();
    const target = normalizeHandle(handleOrId);
    const updated = current.filter(
      (a) => a.id !== handleOrId && normalizeHandle(a.handle) !== target
    );
    this.saveMyAccounts(updated);
    return updated;
  }

  // Get active authenticated user
  static getAuthUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_AUTH_USER);
      if (data) {
        return normalizeStorageUser(JSON.parse(data));
      }
    } catch {
      // fallback
    }
    return null;
  }

  static saveAuthUser(user: User | null) {
    if (user) {
      const formatted = normalizeStorageUser(user);
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(formatted));
      this.addMyAccount(formatted);
      this.upsertUser(formatted);
    } else {
      localStorage.removeItem(STORAGE_AUTH_USER);
    }
  }

  static getAddedFriends(myHandle: string): string[] {
    try {
      const key = `eztalk_friends_${normalizeHandle(myHandle)}`;
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  }

  static addFriend(myHandle: string, friendHandle: string): string[] {
    const current = this.getAddedFriends(myHandle);
    const target = normalizeHandle(friendHandle);
    if (!current.includes(target) && target !== normalizeHandle(myHandle)) {
      const updated = [...current, target];
      try {
        localStorage.setItem(`eztalk_friends_${normalizeHandle(myHandle)}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    }
    return current;
  }

  static removeFriend(myHandle: string, friendHandle: string): string[] {
    const current = this.getAddedFriends(myHandle);
    const target = normalizeHandle(friendHandle);
    const updated = current.filter((h) => h !== target);
    try {
      localStorage.setItem(`eztalk_friends_${normalizeHandle(myHandle)}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  }

  // Get all two-way conversations
  static getConversations(): Record<string, Message[]> {
    try {
      const data = localStorage.getItem(STORAGE_CONVERSATIONS);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...INITIAL_SHARED_CONVERSATIONS, ...parsed };
      }
    } catch {
      // fallback
    }
    this.saveConversations(INITIAL_SHARED_CONVERSATIONS);
    return INITIAL_SHARED_CONVERSATIONS;
  }

  static saveConversations(conversations: Record<string, Message[]>) {
    localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations));
  }

  // Get conversation messages between two handles
  static getMessages(handle1: string, handle2: string): Message[] {
    const key = getConversationKey(handle1, handle2);
    const convs = this.getConversations();
    return convs[key] || [];
  }

  // Save a message into a two-way conversation between handle1 and handle2
  static addMessage(handle1: string, handle2: string, message: Message): Record<string, Message[]> {
    const convKey = getConversationKey(handle1, handle2);
    const allConversations = this.getConversations();
    const currentList = allConversations[convKey] || [];
    const updatedList = [...currentList, message];
    const updatedConversations = {
      ...allConversations,
      [convKey]: updatedList,
    };
    this.saveConversations(updatedConversations);
    return updatedConversations;
  }

  // Clear messages for a two-way conversation
  static clearConversation(handle1: string, handle2: string): Record<string, Message[]> {
    const convKey = getConversationKey(handle1, handle2);
    const allConversations = this.getConversations();
    const updatedConversations = {
      ...allConversations,
      [convKey]: [],
    };
    this.saveConversations(updatedConversations);
    return updatedConversations;
  }
}
