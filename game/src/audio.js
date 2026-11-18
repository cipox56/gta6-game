// All sound is synthesized with WebAudio — no audio files, no network.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.sirenNodes = null;
    this.engineNodes = null;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  noise(dur, vol, lowpass) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass || 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.25;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }
  blip() { this.tone(880, 0.09, 'square', 0.12, 1320); }
  coin() { this.tone(987, 0.1, 'sine', 0.2); setTimeout(() => this.tone(1318, 0.16, 'sine', 0.2), 90); }
  thud() { this.tone(140, 0.12, 'sine', 0.3, 60); this.noise(0.08, 0.15, 500); }
  crash() { this.noise(0.35, 0.4, 900); this.tone(90, 0.25, 'sawtooth', 0.2, 40); }
  pickup() { this.tone(523, 0.08, 'triangle', 0.2); setTimeout(() => this.tone(784, 0.12, 'triangle', 0.2), 80); }
  jingle() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.22), i * 110));
  }
  busted() {
    [392, 311, 233].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sawtooth', 0.18), i * 220));
  }
  engine(speed01) {
    if (!this.ctx) return;
    if (!this.engineNodes) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 60;
      g.gain.value = 0;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      o.connect(f);
      f.connect(g);
      g.connect(this.master);
      o.start();
      this.engineNodes = { o, g };
    }
    const n = this.engineNodes;
    n.o.frequency.value = 55 + speed01 * 160;
    n.g.gain.value = speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0;
  }
  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenNodes) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 700;
      g.gain.value = 0.045;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lg = this.ctx.createGain();
      lg.gain.value = 220;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(g);
      g.connect(this.master);
      o.start();
      lfo.start();
      this.sirenNodes = { o, g, lfo };
    } else if (!on && this.sirenNodes) {
      try { this.sirenNodes.o.stop(); this.sirenNodes.lfo.stop(); } catch (e) { /* already stopped */ }
      this.sirenNodes = null;
    }
  }
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // Simple sun-soaked groove: bass line + hats on a 8-step loop.
    const bass = [55, 0, 55, 65.4, 55, 0, 82.4, 73.4];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const f = bass[this.musicStep % bass.length];
      if (f) this.tone(f, 0.22, 'triangle', 0.16);
      if (this.musicStep % 2 === 0) this.noise(0.03, 0.05, 6000);
      this.musicStep++;
    }, 210);
  }
  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
