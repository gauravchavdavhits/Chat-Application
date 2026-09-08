/**
 * Web Audio API based notification chime for messages and calls
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: ReturnType<typeof setInterval> | null = null;
  private dialtoneInterval: ReturnType<typeof setInterval> | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  /**
   * Play a clean message notification chime
   */
  public playMessageSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio context might be restricted before first user interaction
    }
  }

  /**
   * Play Incoming Call Ringtone loop
   */
  public playRingtone() {
    this.stopCallSounds();
    const playRingBurst = () => {
      try {
        this.initCtx();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch {
        // ignore
      }
    };

    playRingBurst();
    this.ringtoneInterval = setInterval(playRingBurst, 2500);
  }

  /**
   * Play Outgoing Call Dialtone loop
   */
  public playDialtone() {
    this.stopCallSounds();
    const playDialBurst = () => {
      try {
        this.initCtx();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(350, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.08, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.0);
        osc2.stop(now + 1.0);
      } catch {
        // ignore
      }
    };

    playDialBurst();
    this.dialtoneInterval = setInterval(playDialBurst, 3000);
  }

  /**
   * Stop all call ringtone/dialtone audio
   */
  public stopCallSounds() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.dialtoneInterval) {
      clearInterval(this.dialtoneInterval);
      this.dialtoneInterval = null;
    }
  }
}

export const soundService = new SoundService();

