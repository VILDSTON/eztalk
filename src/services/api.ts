import { User, Message, Attachment, QuotedMessage, Group } from '../types/chat';

const BACKEND_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '';
const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export const CURATED_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

export function normalizeUser(user: any): User {
  if (!user) return user;
  const uid = user.id || (user._id ? String(user._id) : '') || `user_${(user.handle || '').replace('@', '')}`;
  return {
    ...user,
    id: uid,
  };
}

// Хелпер для безопасного парсинга JSON и обработки 502/504/CORS ошибок
async function handleResponse(res: Response, fallbackError: string) {
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = { error: `Server error (${res.status})` };
  }
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('eztalk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class ApiService {
  // Login with identifier and password
  static async login(identifier: string, password?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await handleResponse(res, 'Login failed');
    if (data.token) {
      localStorage.setItem('eztalk_token', data.token);
    }
    const user = normalizeUser(data.user);
    if (data.token && user) {
      (user as any).token = data.token;
    }
    return user;
  }

  // Register new user with password
  static async register(user: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await handleResponse(res, 'Registration failed');
    if (data.token) {
      localStorage.setItem('eztalk_token', data.token);
    }
    const newUser = normalizeUser(data.user);
    if (data.token && newUser) {
      (newUser as any).token = data.token;
    }
    return newUser;
  }

  // Fetch all registered users
  static async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return (data.users || []).map(normalizeUser);
    } catch {
      return [];
    }
  }

  // Fetch user by handle
  static async getUserByHandle(handle: string): Promise<User | null> {
    try {
      const clean = encodeURIComponent(handle.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/users/by-handle/${clean}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.user ? normalizeUser(data.user) : null;
    } catch {
      return null;
    }
  }

  // Get current user profile from server
  static async getProfile(handleOrId: string): Promise<User | null> {
    try {
      const clean = encodeURIComponent(handleOrId.trim());
      const res = await fetch(`${API_BASE_URL}/users/profile?handle=${clean}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.user ? normalizeUser(data.user) : null;
    } catch {
      return null;
    }
  }

  // Update user profile
  static async updateProfile(user: User, oldHandle?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...user, oldHandle: oldHandle || user.handle }),
    });
    const data = await handleResponse(res, 'Failed to update profile');
    return normalizeUser(data.user || user);
  }

  // Block / Unblock user
  static async toggleBlockUser(
    userHandle: string,
    targetHandle: string,
    action: 'block' | 'unblock' | 'toggle' = 'toggle'
  ): Promise<string[]> {
    try {
      const cleanU = encodeURIComponent(userHandle.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/users/${cleanU}/block`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetHandle, action }),
      });
      const data = await res.json();
      return data.blockedUsers || [];
    } catch {
      return [];
    }
  }

  // Add / Remove / Toggle Friend
  static async toggleFriend(
    userHandle: string,
    targetHandle: string,
    action: 'add' | 'remove' | 'toggle' = 'toggle'
  ): Promise<string[]> {
    try {
      const cleanU = encodeURIComponent(userHandle.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/users/${cleanU}/friends`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetHandle, action }),
      });
      const data = await res.json();
      return data.friends || [];
    } catch {
      return [];
    }
  }

  // Fetch conversation messages between two handles
  static async getMessages(handle1: string, handle2: string): Promise<Message[]> {
    try {
      const cleanH1 = encodeURIComponent(handle1.trim().toLowerCase());
      const cleanH2 = encodeURIComponent(handle2.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/messages/${cleanH1}/${cleanH2}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  }

  // Fetch recent messages for all conversations of a user
  static async getRecentConversations(handle: string): Promise<Record<string, Message>> {
    try {
      const clean = encodeURIComponent(handle.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/conversations/recent/${clean}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.recent || {};
    } catch {
      return {};
    }
  }

  // Fetch messages for a group
  static async getGroupMessages(groupId: string): Promise<Message[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}/messages`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  }

  // Send message (direct or group)
  static async sendMessage(
    senderHandle: string,
    recipientHandle: string | null,
    text: string,
    attachment?: Attachment,
    replyTo?: QuotedMessage,
    groupId?: string,
    callInfo?: { type: 'incoming' | 'outgoing' | 'missed' | 'declined' | 'canceled'; duration?: number },
    id?: string,
    isForwarded?: boolean,
    forwardedFrom?: string,
    isSecret?: boolean,
    forwardRestricted?: boolean
  ): Promise<Message> {
    const nowIso = new Date().toISOString();
    const payload = {
      id: id || `msg_${Date.now()}`,
      senderHandle,
      recipientHandle,
      groupId,
      text,
      attachment,
      replyTo,
      callInfo,
      isForwarded,
      forwardedFrom,
      isSecret,
      forwardRestricted,
      createdAt: nowIso,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res, 'Failed to send message');
      return data.message;
    } catch (err) {
      // Возвращаем объект со статусом 'failed', чтобы UI мог показать иконку повтора
      return {
        ...payload,
        senderId: senderHandle,
        recipientHandle: recipientHandle || undefined,
        status: 'failed',
      } as Message;
    }
  }

  // Edit message
  static async editMessage(id: string, text: string): Promise<Message | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      return data.message || null;
    } catch {
      return null;
    }
  }

  // Delete message
  static async deleteMessage(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Toggle emoji reaction on message
  static async toggleReaction(id: string, emoji: string, userHandle: string): Promise<Record<string, string[]> | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${id}/reaction`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ emoji, userHandle }),
      });
      const data = await res.json();
      return data.reactions || null;
    } catch {
      return null;
    }
  }

  // Get all groups
  static async getGroups(): Promise<Group[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/groups`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.groups || [];
    } catch {
      return [];
    }
  }

  // Create new group
  static async createGroup(name: string, avatar: string, creatorHandle: string, memberHandles: string[]): Promise<Group> {
    const res = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, avatar, creatorHandle, memberHandles }),
    });
    const data = await handleResponse(res, 'Failed to create group');
    return data.group;
  }

  // Delete group
  static async deleteGroup(groupId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Clear chat
  static async clearChat(handle1: string, handle2?: string, groupId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/clear`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ handle1, handle2, groupId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
