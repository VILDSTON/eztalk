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
  settings?: UserSettings;
  lastSeen?: string;
  friends?: string[];
  blockedUsers?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'file' | 'audio';
  url: string;
  size?: string;
  duration?: number;
  peaks?: number[]; // Normalized audio amplitude array (0-100) for waveform visualization
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

export interface ReactionItem {
  emoji: string;
  count: number;
  users: string[]; // array of handles
}

export interface Message {
  id: string;
  tempId?: string;
  conversationKey?: string;
  groupId?: string;
  senderId: string;
  senderHandle?: string; // e.g. "@AlexR"
  recipientHandle?: string; // e.g. "@User_A"
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timeFormatted?: string;
  attachment?: Attachment;
  replyTo?: QuotedMessage;
  callInfo?: CallInfo;
  reactions?: ReactionItem[] | Record<string, string[]>; // Поддерживает массив ReactionItem[] и legacy Record
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  isSecret?: boolean;
  forwardRestricted?: boolean;
  readAt?: string;
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

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

/** Unified chat application state */
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
  drafts?: Record<string, string>;
}
