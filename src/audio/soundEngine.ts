import { GameSettings } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private screechNode: AudioBufferSourceNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechGain: GainNode | null = null;

  private nitroNode: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  private engineRunning = false;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private settings: GameSettings = {
    graphicsQuality: 'High',
    musicVolume: 0.45,
    sfxVolume: 0.75,
    sensitivity: 1.0,
    cameraMode: 'third_person',
    tiltSteering: false,
    vibration: true,
    language: 'en',
    targetFps: 60,
    difficulty: 'MEDIUM',
    controlLayout: 'auto',
    muted: false,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public updateSettings(next: GameSettings): void {
    this.settings = next;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.3, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.7, now, 0.05);
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public startEngine(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.engineRunning) return;
    this.engineRunning = true;

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.value = 55;
    this.engineOsc2.frequency.value = 110;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 300;
    this.engineFilter.Q.value = 3.0;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.06;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Tire screech / drift loop
    const noiseBuf = this.createNoiseBuffer(ctx, 2);
    this.screechNode = ctx.createBufferSource();
    this.screechNode.buffer = noiseBuf;
    this.screechNode.loop = true;

    this.screechFilter = ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.value = 1350;
    this.screechFilter.Q.value = 4.5;

    this.screechGain = ctx.createGain();
    this.screechGain.gain.value = 0;

    this.screechNode.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);
    this.screechNode.start();

    // Nitro exhaust roar loop
    this.nitroNode = ctx.createBufferSource();
    this.nitroNode.buffer = noiseBuf;
    this.nitroNode.loop = true;
    const nitroFilter = ctx.createBiquadFilter();
    nitroFilter.type = 'lowpass';
    nitroFilter.frequency.value = 880;
    this.nitroGain = ctx.createGain();
    this.nitroGain.gain.value = 0;

    this.nitroNode.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);
    this.nitroNode.start();
  }

  public updateEngine(speedRatio: number, isDrifting: boolean, nitroActive: boolean): void {
    if (!this.ctx || !this.engineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    // Simulate realistic 6-speed gear shift cadence
    const gearMod = ((clamped * 5.2) % 1) * 0.45 + 0.55;
    const baseFreq = 52 + (clamped * 95 * gearMod) + (nitroActive ? 34 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(220 + clamped * 1150 + (nitroActive ? 650 : 0), now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.055 + clamped * 0.065 + (nitroActive ? 0.035 : 0), now, 0.05);

    if (this.screechGain) {
      this.screechGain.gain.setTargetAtTime(isDrifting ? 0.08 : 0, now, 0.05);
    }

    if (this.nitroGain) {
      this.nitroGain.gain.setTargetAtTime(nitroActive ? 0.16 : 0, now, 0.04);
    }
  }

  public stopEngine(): void {
    if (!this.engineRunning) return;
    this.engineRunning = false;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.screechNode?.stop();
      this.nitroNode?.stop();
    } catch {
      // Ignore already stopped
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.screechNode = null;
    this.nitroNode = null;
  }

  public startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicTimer !== null) return;

    const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42];
    const arpNotes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 293.66];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.settings.muted || this.settings.musicVolume <= 0.01) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const step = this.musicStep % 8;
      this.musicStep++;

      const bassOsc = this.ctx.createOscillator();
      const bassEnv = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassNotes[step], now);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(340, now);
      bassEnv.gain.setValueAtTime(0.001, now);
      bassEnv.gain.linearRampToValueAtTime(0.22, now + 0.015);
      bassEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassEnv);
      bassEnv.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.21);

      if (step % 2 === 0 || this.musicStep % 16 > 8) {
        const arpOsc = this.ctx.createOscillator();
        const arpEnv = this.ctx.createGain();
        arpOsc.type = 'triangle';
        arpOsc.frequency.setValueAtTime(arpNotes[(step + Math.floor(this.musicStep / 8)) % arpNotes.length], now);
        arpEnv.gain.setValueAtTime(0.001, now);
        arpEnv.gain.linearRampToValueAtTime(0.10, now + 0.01);
        arpEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        arpOsc.connect(arpEnv);
        arpEnv.connect(this.musicGain);
        arpOsc.start(now);
        arpOsc.stop(now + 0.2);
      }
    }, 200);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.05);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playCountdown(isGo: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isGo ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.28);
    }
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.18));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (isGo ? 0.37 : 0.2));
  }

  public playBoost(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.14, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    });
  }

  public playCollision(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
    gain.gain.setValueAtTime(Math.min(0.35, 0.2 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }
}

export const soundEngine = new SoundEngine();
