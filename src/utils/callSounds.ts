// EzTalk Web Audio Call Sound Manager with Immediate Stop Control

class CallSoundService {
  private incomingCtx: AudioContext | null = null;
  private incomingGain: GainNode | null = null;
  private outgoingCtx: AudioContext | null = null;
  private outgoingGain: GainNode | null = null;

  // Play incoming phone ringing tone (440Hz + 480Hz dual cadence)
  public playIncoming() {
    this.stopIncoming();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.incomingCtx = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      this.incomingGain = gain;

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      for (let i = 0; i < 30; i++) {
        const t = now + i * 3.0;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.setValueAtTime(0, t + 1.2);
      }

      osc1.start();
      osc2.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Instantly cancel all incoming ringtone oscillators and close audio context
  public stopIncoming() {
    try {
      if (this.incomingGain) {
        this.incomingGain.gain.cancelScheduledValues(0);
        this.incomingGain.gain.value = 0;
        this.incomingGain.disconnect();
        this.incomingGain = null;
      }
      if (this.incomingCtx && this.incomingCtx.state !== 'closed') {
        this.incomingCtx.close();
        this.incomingCtx = null;
      }
    } catch {
      // ignore
    }
  }

  // Play outgoing dialing tone (Tuuuut... Tuuuut...)
  public playOutgoing() {
    this.stopOutgoing();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.outgoingCtx = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      this.outgoingGain = gain;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      for (let i = 0; i < 30; i++) {
        const t = now + i * 3.5;
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.setValueAtTime(0, t + 1.2);
      }

      osc.start();
    } catch {
      // fallback
    }
  }

  // Instantly cancel all outgoing dial tone oscillators and close audio context
  public stopOutgoing() {
    try {
      if (this.outgoingGain) {
        this.outgoingGain.gain.cancelScheduledValues(0);
        this.outgoingGain.gain.value = 0;
        this.outgoingGain.disconnect();
        this.outgoingGain = null;
      }
      if (this.outgoingCtx && this.outgoingCtx.state !== 'closed') {
        this.outgoingCtx.close();
        this.outgoingCtx = null;
      }
    } catch {
      // ignore
    }
  }

  // Stop everything immediately
  public stopAll() {
    this.stopIncoming();
    this.stopOutgoing();
  }
}

export const callSoundService = new CallSoundService();
