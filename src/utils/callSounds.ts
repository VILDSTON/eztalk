// EzTalk Web Audio Call Sound Manager with Absolute Immediate Stop Control

class CallSoundService {
  private activeCtx: AudioContext | null = null;
  private activeGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private ringInterval: ReturnType<typeof setInterval> | null = null;
  private ringTimeout: ReturnType<typeof setTimeout> | null = null;

  private getContext(): AudioContext {
    if (!this.activeCtx || this.activeCtx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.activeCtx = new AudioCtx();
    }
    if (this.activeCtx.state === 'suspended') {
      this.activeCtx.resume().catch(() => {});
    }
    return this.activeCtx;
  }

  // Play incoming phone ringing tone (440Hz + 480Hz dual cadence)
  public playIncoming() {
    this.stopAll();
    try {
      const playBeep = () => {
        try {
          const ctx = this.getContext();
          const now = ctx.currentTime;

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          this.activeGain = gain;
          this.activeOscillators = [osc1, osc2];

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

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
      const playRing = () => {
        try {
          const ctx = this.getContext();
          const now = ctx.currentTime;

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          this.activeGain = gain;
          this.activeOscillators = [osc1, osc2];

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

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

  // Instantly cut all sound, stop all oscillators, mute gain to 0, clear timers, and close context
  public stopAll() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    // Stop active oscillators immediately
    if (this.activeOscillators.length > 0) {
      this.activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // already stopped
        }
      });
      this.activeOscillators = [];
    }

    // Cut gain instantly to 0 and disconnect
    if (this.activeGain) {
      try {
        this.activeGain.gain.cancelScheduledValues(0);
        this.activeGain.gain.setValueAtTime(0, 0);
        this.activeGain.disconnect();
      } catch {
        // ignore
      }
      this.activeGain = null;
    }

    // Close AudioContext completely to ensure zero audio leaks
    if (this.activeCtx) {
      try {
        if (this.activeCtx.state !== 'closed') {
          this.activeCtx.close().catch(() => {});
        }
      } catch {
        // ignore
      }
      this.activeCtx = null;
    }
  }
}

export const callSoundService = new CallSoundService();
