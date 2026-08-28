import { User, Message } from '../types/chat';

export interface LiveEvent {
  type: 'NEW_MESSAGE' | 'INCOMING_CALL' | 'CALL_ACCEPTED' | 'CALL_REJECTED' | 'CALL_ENDED' | 'USER_STATUS';
  sender: User;
  recipientHandle: string;
  payload?: {
    message?: Message;
    status?: User['status'];
  };
}

interface ViteHotMeta {
  hot?: {
    on: (event: string, cb: (data: LiveEvent) => void) => void;
    send: (event: string, data: LiveEvent) => void;
  };
}

class LiveNetwork {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: LiveEvent) => void)[] = [];
  private recentEventIds: Set<string> = new Set();

  constructor() {
    // 1. BroadcastChannel (fast local tab-to-tab)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('eztalk_mesh_network');
      this.channel.onmessage = (e: MessageEvent<LiveEvent>) => {
        this.emit(e.data);
      };
    }

    // 2. Vite WebSocket Relay (Works seamlessly between Incognito, Regular tabs, other browsers & Wi-Fi devices)
    const viteMeta = import.meta as unknown as ViteHotMeta;
    if (viteMeta.hot) {
      viteMeta.hot.on('eztalk:event', (data: LiveEvent) => {
        this.emit(data);
      });
    }
  }

  private emit(event: LiveEvent) {
    // Deduplicate event if received by both BroadcastChannel and WebSocket
    const eventKey = event.payload?.message?.id || `${event.type}_${event.sender.handle}_${Date.now()}`;
    if (this.recentEventIds.has(eventKey)) return;
    this.recentEventIds.add(eventKey);
    setTimeout(() => this.recentEventIds.delete(eventKey), 5000);

    this.listeners.forEach((callback) => callback(event));
  }

  public sendMessage(sender: User, recipientHandle: string, message: Message) {
    this.postEvent({
      type: 'NEW_MESSAGE',
      sender,
      recipientHandle,
      payload: { message },
    });
  }

  public sendCall(sender: User, recipientHandle: string) {
    this.postEvent({
      type: 'INCOMING_CALL',
      sender,
      recipientHandle,
    });
  }

  public answerCall(sender: User, recipientHandle: string) {
    this.postEvent({
      type: 'CALL_ACCEPTED',
      sender,
      recipientHandle,
    });
  }

  public endCall(sender: User, recipientHandle: string) {
    this.postEvent({
      type: 'CALL_ENDED',
      sender,
      recipientHandle,
    });
  }

  public onEvent(callback: (event: LiveEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private postEvent(event: LiveEvent) {
    // 1. BroadcastChannel
    try {
      this.channel?.postMessage(event);
    } catch {
      // ignore
    }

    // 2. Vite WebSocket Relay for Incognito & Cross-device
    try {
      const viteMeta = import.meta as unknown as ViteHotMeta;
      if (viteMeta.hot) {
        viteMeta.hot.send('eztalk:broadcast', event);
      }
    } catch {
      // ignore
    }
  }
}

export const liveNetwork = new LiveNetwork();
