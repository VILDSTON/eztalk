import { User, Message } from '../types/chat';

export interface LiveEvent {
  id: string; // Уникальный ID события для надежной дедупликации
  type: 'NEW_MESSAGE' | 'INCOMING_CALL' | 'CALL_ACCEPTED' | 'CALL_REJECTED' | 'CALL_ENDED' | 'USER_STATUS';
  sender: User;
  recipientHandle: string;
  timestamp: number;
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
  private processedIds: Set<string> = new Set();

  constructor() {
    // 1. BroadcastChannel (мгновенный обмен между вкладками одного браузера)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('eztalk_mesh_network');
        this.channel.onmessage = (e: MessageEvent<LiveEvent>) => {
          this.emit(e.data);
        };
      } catch {
        // Fallback для старых окружений
      }
    }

    // 2. Слушатель localStorage 'storage' event как fallback для вкладок, если BroadcastChannel заблокирован
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'eztalk_tab_sync' && e.newValue) {
          try {
            const event: LiveEvent = JSON.parse(e.newValue);
            this.emit(event);
          } catch {
            // ignore JSON parse
          }
        }
      });
    }

    // 3. Vite Dev Relay (работает исключительно в режиме npm run dev)
    const viteMeta = import.meta as unknown as ViteHotMeta;
    if (viteMeta?.hot) {
      viteMeta.hot.on('eztalk:event', (data: LiveEvent) => {
        this.emit(data);
      });
    }
  }

  private emit(event: LiveEvent) {
    if (!event || !event.id) return;

    // Игнорируем события, которые мы уже обработали
    if (this.processedIds.has(event.id)) return;
    this.processedIds.add(event.id);

    // Удаляем из кэша через 8 секунд
    setTimeout(() => {
      this.processedIds.delete(event.id);
    }, 8000);

    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('[LiveSync] listener error:', err);
      }
    });
  }

  private postEvent(base: Omit<LiveEvent, 'id' | 'timestamp'>) {
    const event: LiveEvent = {
      ...base,
      id: base.payload?.message?.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    // Регистрируем локально, чтобы не среагировать на собственное эхо
    this.processedIds.add(event.id);

    // 1. BroadcastChannel
    try {
      this.channel?.postMessage(event);
    } catch {
      // ignore
    }

    // 2. Storage event fallback
    try {
      localStorage.setItem('eztalk_tab_sync', JSON.stringify(event));
      // Очищаем ключ сразу, чтобы не засорять память
      setTimeout(() => localStorage.removeItem('eztalk_tab_sync'), 100);
    } catch {
      // ignore
    }

    // 3. Vite Dev Relay
    try {
      const viteMeta = import.meta as unknown as ViteHotMeta;
      if (viteMeta?.hot) {
        viteMeta.hot.send('eztalk:broadcast', event);
      }
    } catch {
      // ignore
    }
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
}

export const liveNetwork = new LiveNetwork();
