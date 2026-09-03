// EzTalk Web Audio Call Sound Manager with Absolute Immediate Stop Control

const AudioContextClass =
  typeof window !== 'undefined'
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    : undefined;

class CallSoundService {
  private activeCtx: AudioContext | null = null;
  private activeGain: GainNode | null = null;
  private ringInterval: ReturnType<typeof setInterval> | null = null;

  private async initContext() {
    this.stopAll();
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    this.activeCtx = ctx;

    // Снятие блокировки autoplay для звонка
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Autoplay policy block
      }
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.activeGain = masterGain;

    return ctx;
  }

  // Play incoming phone ringing tone (440Hz + 480Hz dual cadence)
  public async playIncoming() {
    const ctx = await this.initContext();
    if (!ctx) return;

    const playBeep = () => {
      if (!this.activeCtx || this.activeCtx.state === 'closed' || !this.activeGain) return;
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const beepGain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        beepGain.gain.setValueAtTime(1.0, now);
        beepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(beepGain);
        osc2.connect(beepGain);
        beepGain.connect(this.activeGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch {
        // ignore errors
      }
    };

    playBeep();
    this.ringInterval = setInterval(playBeep, 3000);
  }

  // Play outgoing dialing tone (440Hz + 480Hz US tone)
  public async playOutgoing() {
    const ctx = await this.initContext();
    if (!ctx) return;

    const playRing = () => {
      if (!this.activeCtx || this.activeCtx.state === 'closed' || !this.activeGain) return;
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const ringGain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        ringGain.gain.setValueAtTime(1.0, now);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(ringGain);
        osc2.connect(ringGain);
        ringGain.connect(this.activeGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch {
        // ignore errors
      }
    };

    playRing();
    this.ringInterval = setInterval(playRing, 3500);
  }

  public stopIncoming() {
    this.stopAll();
  }

  public stopOutgoing() {
    this.stopAll();
  }

  // Instantly cut all sound without pops/clicks, clear timers, suspend, and close context
  public stopAll() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }

    if (this.activeGain && this.activeCtx) {
      try {
        const now = this.activeCtx.currentTime;
        this.activeGain.gain.cancelScheduledValues(now);
        // Мягкое быстрое затухание за 25мс предотвращает неприятный щелчок
        this.activeGain.gain.linearRampToValueAtTime(0.0001, now + 0.025);
        setTimeout(() => {
          this.activeGain?.disconnect();
          this.activeGain = null;
        }, 30);
      } catch {
        this.activeGain = null;
      }
    }

    if (this.activeCtx) {
      const ctx = this.activeCtx;
      this.activeCtx = null;
      try {
        if (ctx.state !== 'closed') {
          setTimeout(() => {
            ctx.close().catch(() => {});
          }, 35);
        }
      } catch {
        // ignore
      }
    }
  }
}

export const callSoundService = new CallSoundService();

// Глобальный переиспользуемый AudioContext для коротких звуков уведомлений (без утечек памяти)
let sharedNotificationCtx: AudioContext | null = null;

export async function playMessageChime() {
  try {
    if (!AudioContextClass) return;

    if (!sharedNotificationCtx || sharedNotificationCtx.state === 'closed') {
      sharedNotificationCtx = new AudioContextClass();
    }

    if (sharedNotificationCtx.state === 'suspended') {
      await sharedNotificationCtx.resume();
    }

    const ctx = sharedNotificationCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // ignore
  }
}
