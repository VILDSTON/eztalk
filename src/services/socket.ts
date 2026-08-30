import { io, Socket } from 'socket.io-client';
import { User, Message, Group } from '../types/chat';

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
          this.socket?.emit('join', this.currentHandle);
        }
      });
    }

    if (userHandle) {
      this.currentHandle = userHandle;
      if (this.socket.connected) {
        this.socket.emit('join', userHandle);
      }
    }

    return this.socket;
  }

  public setHandle(userHandle: string) {
    this.currentHandle = userHandle;
    if (this.socket?.connected) {
      this.socket.emit('join', userHandle);
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
    this.socket?.emit('typing', { senderHandle, recipientHandle, isTyping });
  }

  public onIncomingCall(callback: (data: { caller: User; recipientHandle: string }) => void) {
    this.socket?.on('incoming_call', callback);
    return () => {
      this.socket?.off('incoming_call', callback);
    };
  }

  public sendCall(caller: User, recipientHandle: string) {
    this.socket?.emit('call_user', { caller, recipientHandle });
  }

  public onCallAccepted(callback: (data: { callerHandle: string; recipient: User }) => void) {
    this.socket?.on('call_accepted', callback);
    return () => {
      this.socket?.off('call_accepted', callback);
    };
  }

  public answerCall(callerHandle: string, recipient: User) {
    this.socket?.emit('answer_call', { callerHandle, recipient });
  }

  public onCallEnded(callback: (data?: { callerHandle?: string; recipientHandle?: string }) => void) {
    this.socket?.on('call_ended', callback);
    return () => {
      this.socket?.off('call_ended', callback);
    };
  }

  public endCall(callerHandle: string, recipientHandle: string) {
    this.socket?.emit('end_call', { callerHandle, recipientHandle });
  }

  public sendWebRTCSignal(toHandle: string, fromHandle: string, signal: any) {
    this.socket?.emit('webrtc_signal', { toHandle, fromHandle, signal });
  }

  public onWebRTCSignal(callback: (data: { toHandle: string; fromHandle: string; signal: any }) => void) {
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

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
