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

export class ApiService {
  // Login with identifier and password
  static async login(identifier: string, password?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return normalizeUser(data.user);
  }

  // Register new user with password
  static async register(user: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return normalizeUser(data.user);
  }

  // Fetch all registered users
  static async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
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
      const res = await fetch(`${API_BASE_URL}/users/by-handle/${clean}`);
      const data = await res.json();
      return data.user ? normalizeUser(data.user) : null;
    } catch {
      return null;
    }
  }

  // Update user profile
  static async updateProfile(user: User, oldHandle?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, oldHandle: oldHandle || user.handle }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return normalizeUser(data.user || user);
  }

  // Block / Unblock user
  static async toggleBlockUser(userHandle: string, targetHandle: string, action: 'block' | 'unblock' | 'toggle' = 'toggle'): Promise<string[]> {
    try {
      const cleanU = encodeURIComponent(userHandle.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/users/${cleanU}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetHandle, action }),
      });
      const data = await res.json();
      return data.blockedUsers || [];
    } catch {
      return [];
    }
  }

  // Fetch conversation messages between two handles
  static async getMessages(handle1: string, handle2: string): Promise<Message[]> {
    try {
      const cleanH1 = encodeURIComponent(handle1.trim().toLowerCase());
      const cleanH2 = encodeURIComponent(handle2.trim().toLowerCase());
      const res = await fetch(`${API_BASE_URL}/messages/${cleanH1}/${cleanH2}`);
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  }

  // Fetch messages for a group
  static async getGroupMessages(groupId: string): Promise<Message[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}/messages`);
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
    id?: string
  ): Promise<Message> {
    const payload = {
      id,
      senderHandle,
      recipientHandle,
      groupId,
      text,
      attachment,
      replyTo,
      callInfo,
      timestamp: 'Sent PM',
    };
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.message;
    } catch {
      return {
        id: id || `msg_${Date.now()}`,
        senderId: senderHandle,
        senderHandle,
        recipientHandle: recipientHandle || undefined,
        groupId,
        text,
        attachment,
        replyTo,
        callInfo,
        timestamp: 'Sent PM',
      };
    }
  }

  // Edit message
  static async editMessage(id: string, text: string): Promise<Message | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE_URL}/groups`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar, creatorHandle, memberHandles }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create group');
    return data.group;
  }

  // Delete group
  static async deleteGroup(groupId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle1, handle2, groupId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
