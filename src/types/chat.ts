export type StatusType = 'Online' | 'Offline' | 'Away' | 'Busy';

export interface UserSettings {
  soundNotifications?: boolean;
  desktopNotifications?: boolean;
  floatingToasts?: boolean;
  callRingtones?: boolean;
  theme?: string;
  accentColor?: string;
  enterToSend?: boolean;
  compactMode?: boolean;
}

export interface User {
  id: string;
  name: string;
  handle: string; // e.g. "@AlexR"
  avatar: string;
  status: StatusType;
  statusEmoji?: string;
  customStatusText?: string;
  banner?: string;
  website?: string;
  accentColor?: string;
  email?: string;
  bio?: string;
  theme?: string;
  soundNotifications?: boolean;
  desktopNotifications?: boolean;
  floatingToasts?: boolean;
  callRingtones?: boolean;
  enterToSend?: boolean;
  compactMode?: boolean;
  settings?: UserSettings;
  lastSeen?: string;
  friends?: string[];
  blockedUsers?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  size?: string;
  duration?: number;
}

export interface QuotedMessage {
  id: string;
  senderHandle: string;
  text: string;
}

export interface CallInfo {
  type: 'incoming' | 'outgoing' | 'missed' | 'declined' | 'canceled';
  duration?: number;
}

export interface Message {
  id: string;
  conversationKey?: string;
  groupId?: string;
  senderId: string;
  senderHandle?: string; // e.g. "@AlexR"
  recipientHandle?: string; // e.g. "@User_A"
  text: string;
  timestamp: string; // e.g. "Sent PM", "Received"
  status?: 'sent' | 'delivered' | 'read';
  timeFormatted?: string;
  attachment?: Attachment;
  replyTo?: QuotedMessage;
  callInfo?: CallInfo;
  reactions?: Record<string, string[]>; // emoji -> array of handles
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  creatorHandle: string;
  memberHandles: string[];
  createdAt: string;
}

export interface Conversation {
  userId: string;
  messages: Message[];
}

export type ActiveTab = 'eztalk' | 'google';

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

/** Unified chat application state (documentation type) */
export interface ChatState {
  currentUser: User | null;
  allUsers: User[];
  groups: Group[];
  messages: Message[];
  selectedUserId: string;
  selectedGroupId: string | null;
  onlineHandles: string[];
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, boolean>;
  mutedUsers: Record<string, boolean>;
  blockedUsers: string[];
}
