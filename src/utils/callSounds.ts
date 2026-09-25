// EzTalk Web Audio Call Sound Manager with Absolute Immediate Stop Control

class CallSoundService {
  private activeAudio: HTMLAudioElement | null = null;
  private activeOscillators: { ctx: AudioContext, gain: GainNode, interval?: any } | null = null;

  // Fallback Web Audio API synthesizer if Audio fails (autoplay policies)
  private playSynthesizerFallback(type: 'incoming' | 'outgoing') {
    const AudioContextClass = typeof window !== 'undefined'
      ? window.AudioContext || (window as any).webkitAudioContext
      : undefined;

    if (!AudioContextClass) return;

    try {
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const playBeep = () => {
        if (ctx.state === 'closed') return;
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
        } catch { }
      };

      playBeep();
      const interval = setInterval(playBeep, type === 'incoming' ? 3000 : 3500);
      this.activeOscillators = { ctx, gain: masterGain, interval };
    } catch { }
  }

  // Play incoming phone ringing tone
  public playIncoming() {
    this.stopAll();
    try {
      const audio = new Audio('/mixkit-waiting-ringtone-1354.wav');
      audio.volume = 0.35;
      audio.loop = true;
      this.activeAudio = audio;
      audio.play().catch(() => {
        this.playSynthesizerFallback('incoming');
      });
    } catch {
      this.playSynthesizerFallback('incoming');
    }
  }

  // Play outgoing dialing tone
  public playOutgoing() {
    this.stopAll();
    this.playSynthesizerFallback('outgoing'); // Keeping synthesizer for outgoing, or we could loop the same wav. Let's use synth.
  }

  public stopIncoming() {
    this.stopAll();
  }

  public stopOutgoing() {
    this.stopAll();
  }

  // Instantly cut all sound without pops/clicks
  public stopAll() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    if (this.activeOscillators) {
      const { ctx, gain, interval } = this.activeOscillators;
      if (interval) clearInterval(interval);
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.025);
        setTimeout(() => {
          gain.disconnect();
          if (ctx.state !== 'closed') ctx.close().catch(() => {});
        }, 30);
      } catch {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      }
      this.activeOscillators = null;
    }
  }
}

export const callSoundService = new CallSoundService();

export async function playMessageChime() {
  try {
    const audio = new Audio('/mixkit-soap-bubble-sound-2925.wav');
    audio.volume = 0.55;
    audio.play().catch(() => {
      // Fallback
      const AudioContextClass = typeof window !== 'undefined'
        ? window.AudioContext || (window as any).webkitAudioContext
        : undefined;
      
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
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
      
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      }, 500);
    });
  } catch {
    // ignore
  }
}
