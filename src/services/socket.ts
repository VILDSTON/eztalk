import { io, Socket } from 'socket.io-client';
import { User, Message, Group } from '../types/chat';
import { normalizeHandle } from '../utils/chatStorage';

const SOCKET_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : window.location.origin;

class SocketService {
  private socket: Socket | null = null;
  private currentHandle: string | null = null;

  public connect(userHandle?: string) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        if (this.currentHandle) {
          this.socket?.emit('join', normalizeHandle(this.currentHandle));
        }
      });
    }

    if (userHandle) {
      const cleanHandle = normalizeHandle(userHandle);
      this.currentHandle = cleanHandle;
      if (this.socket.connected) {
        this.socket.emit('join', cleanHandle);
      }
    }

    return this.socket;
  }

  public setHandle(userHandle: string) {
    const cleanHandle = normalizeHandle(userHandle);
    this.currentHandle = cleanHandle;
    if (this.socket?.connected) {
      this.socket.emit('join', cleanHandle);
    }
  }

  public onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new_message', callback);
    return () => {
      this.socket?.off('new_message', callback);
    };
  }

  public onMessageEdited(callback: (data: { id: string; text: string; isEdited: boolean }) => void) {
    this.socket?.on('message_edited', callback);
    return () => {
      this.socket?.off('message_edited', callback);
    };
  }

  public onMessageDeleted(callback: (data: { id: string }) => void) {
    this.socket?.on('message_deleted', callback);
    return () => {
      this.socket?.off('message_deleted', callback);
    };
  }

  public onReactionUpdated(callback: (data: { id: string; reactions: Record<string, string[]> }) => void) {
    this.socket?.on('reaction_updated', callback);
    return () => {
      this.socket?.off('reaction_updated', callback);
    };
  }

  public onNewGroup(callback: (group: Group) => void) {
    this.socket?.on('new_group', callback);
    return () => {
      this.socket?.off('new_group', callback);
    };
  }

  public onGroupDeleted(callback: (data: { groupId: string }) => void) {
    this.socket?.on('group_deleted', callback);
    return () => {
      this.socket?.off('group_deleted', callback);
    };
  }

  public onChatCleared(callback: (data: { key: string }) => void) {
    this.socket?.on('chat_cleared', callback);
    return () => {
      this.socket?.off('chat_cleared', callback);
    };
  }

  public onTyping(callback: (data: { senderHandle: string; recipientHandle?: string; isTyping: boolean }) => void) {
    this.socket?.on('user_typing', callback);
    return () => {
      this.socket?.off('user_typing', callback);
    };
  }

  public sendTyping(senderHandle: string, recipientHandle: string, isTyping: boolean) {
    this.socket?.emit('typing', {
      senderHandle: normalizeHandle(senderHandle),
      recipientHandle: normalizeHandle(recipientHandle),
      isTyping,
    });
  }

  public onIncomingCall(callback: (data: { caller: User; recipientHandle: string; from?: User; to?: string }) => void) {
    this.socket?.on('incoming_call', callback);
    return () => {
      this.socket?.off('incoming_call', callback);
    };
  }

  public sendCall(caller: User, recipientHandle: string) {
    const rHandle = normalizeHandle(recipientHandle);
    this.socket?.emit('call_user', {
      caller,
      from: caller,
      recipientHandle: rHandle,
      to: rHandle,
    });
  }

  public onCallAccepted(callback: (data: { callerHandle: string; recipient?: User; recipientHandle?: string; to?: string; from?: string }) => void) {
    this.socket?.on('call_accepted', callback);
    return () => {
      this.socket?.off('call_accepted', callback);
    };
  }

  public acceptCall(callerHandle: string, recipientHandle: string, recipient?: User) {
    const cHandle = normalizeHandle(callerHandle);
    const rHandle = normalizeHandle(recipientHandle);
    this.socket?.emit('accept_call', {
      callerHandle: cHandle,
      recipientHandle: rHandle,
      to: cHandle,
      from: rHandle,
      recipient,
    });
  }

  public answerCall(callerHandle: string, recipient: User) {
    this.acceptCall(callerHandle, recipient.handle, recipient);
  }

  public declineCall(callerHandle: string, recipientHandle: string) {
    const cHandle = normalizeHandle(callerHandle);
    const rHandle = normalizeHandle(recipientHandle);
    this.socket?.emit('decline_call', {
      callerHandle: cHandle,
      recipientHandle: rHandle,
      to: cHandle,
      from: rHandle,
    });
  }

  public onCallDeclined(callback: (data: { callerHandle: string; recipientHandle?: string }) => void) {
    this.socket?.on('call_declined', callback);
    return () => {
      this.socket?.off('call_declined', callback);
    };
  }

  public onCallEnded(callback: (data?: { callerHandle?: string; recipientHandle?: string }) => void) {
    this.socket?.on('call_ended', callback);
    return () => {
      this.socket?.off('call_ended', callback);
    };
  }

  public endCall(callerHandle: string, recipientHandle: string) {
    const cHandle = normalizeHandle(callerHandle);
    const rHandle = normalizeHandle(recipientHandle);
    this.socket?.emit('end_call', {
      callerHandle: cHandle,
      recipientHandle: rHandle,
      to: cHandle,
      from: rHandle,
    });
  }

  public sendWebRTCSignal(toHandle: string, fromHandle: string, signal: any) {
    const target = normalizeHandle(toHandle);
    const source = normalizeHandle(fromHandle);
    this.socket?.emit('webrtc_signal', {
      toHandle: target,
      fromHandle: source,
      to: target,
      from: source,
      signal,
    });
  }

  public onWebRTCSignal(callback: (data: { toHandle?: string; fromHandle: string; to?: string; from?: string; signal: any }) => void) {
    this.socket?.on('webrtc_signal', callback);
    return () => {
      this.socket?.off('webrtc_signal', callback);
    };
  }

  public onProfileUpdated(callback: (user: User) => void) {
    this.socket?.on('profile_updated', callback);
    return () => {
      this.socket?.off('profile_updated', callback);
    };
  }

  public onUserUpdated(callback: (user: User) => void) {
    this.socket?.on('user_updated', callback);
    return () => {
      this.socket?.off('user_updated', callback);
    };
  }

  public onFriendsUpdated(callback: (data: { friends: string[] }) => void) {
    this.socket?.on('friends_updated', callback);
    return () => {
      this.socket?.off('friends_updated', callback);
    };
  }

  public onOnlineUsers(callback: (onlineHandles: string[]) => void) {
    this.socket?.on('online_users', callback);
    return () => {
      this.socket?.off('online_users', callback);
    };
  }

  public updateStatus(user: User) {
    this.socket?.emit('update_status', user);
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public sendDraft(senderHandle: string, recipientHandle: string, text: string) {
    this.socket?.emit('save_draft', {
      senderHandle: normalizeHandle(senderHandle),
      recipientHandle: normalizeHandle(recipientHandle),
      text,
    });
  }

  public onDraftSynced(callback: (data: { senderHandle: string; recipientHandle: string; text: string }) => void) {
    this.socket?.on('draft_synced', callback);
    return () => {
      this.socket?.off('draft_synced', callback);
    };
  }

  public markMessageRead(messageId: string, readerHandle: string, conversationKey?: string) {
    this.socket?.emit('mark_read', {
      messageId,
      readerHandle: normalizeHandle(readerHandle),
      conversationKey,
    });
  }

  public onMessageRead(callback: (data: { messageId: string; readerHandle: string; readAt: string }) => void) {
    this.socket?.on('message_read', callback);
    return () => {
      this.socket?.off('message_read', callback);
    };
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
