// EzTalk Web Audio Call Sound Manager with Absolute Immediate Stop Control

class CallSoundService {
  private activeCtx: AudioContext | null = null;
  private activeGain: GainNode | null = null;
  private ringInterval: ReturnType<typeof setInterval> | null = null;

  // Play incoming phone ringing tone (440Hz + 480Hz dual cadence)
  public playIncoming() {
    this.stopAll();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.activeCtx = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGain = masterGain;

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
          beepGain.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.2);
          osc2.stop(now + 1.2);
        } catch {
          // ignore autoplay restrictions
        }
      };

      playBeep();
      this.ringInterval = setInterval(playBeep, 3000);
    } catch {
      // ignore
    }
  }

  // Play outgoing dialing tone (440Hz + 480Hz US tone or 425Hz European tone)
  public playOutgoing() {
    this.stopAll();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.activeCtx = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGain = masterGain;

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
          ringGain.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.2);
          osc2.stop(now + 1.2);
        } catch {
          // ignore
        }
      };

      playRing();
      this.ringInterval = setInterval(playRing, 3500);
    } catch {
      // ignore
    }
  }

  public stopIncoming() {
    this.stopAll();
  }

  public stopOutgoing() {
    this.stopAll();
  }

  // Instantly cut all sound, mute master gain to 0, clear timers, suspend, and close context
  public stopAll() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }

    // Cut gain instantly to 0 and disconnect
    if (this.activeGain) {
      try {
        const ctx = this.activeCtx;
        const now = ctx ? ctx.currentTime : 0;
        this.activeGain.gain.cancelScheduledValues(0);
        this.activeGain.gain.setValueAtTime(0, now);
        this.activeGain.disconnect();
      } catch {
        // ignore
      }
      this.activeGain = null;
    }

    // Close AudioContext completely to ensure zero audio leaks
    if (this.activeCtx) {
      const ctx = this.activeCtx;
      this.activeCtx = null;
      try {
        ctx.suspend().catch(() => {});
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }
}

export const callSoundService = new CallSoundService();
