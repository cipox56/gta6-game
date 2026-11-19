// Day/night cycle for Neon Bay: the clock advances slowly during play, and at
// night the city goes dark — lit windows, streetlight glow and headlight cones.
// Deterministic: stageShot sets the hour directly, so screenshots are stable.
export class DayNight {
  constructor() {
    this.hour = 10; // 0..24, morning by default
    this.dayLengthSec = 480; // one full day = 8 minutes of play
  }
  setTime(hour) {
    this.hour = ((hour % 24) + 24) % 24;
  }
  update(dt) {
    this.hour = (this.hour + (dt / this.dayLengthSec) * 24) % 24;
  }
  get isNight() {
    return this.hour >= 20 || this.hour < 6;
  }
  get isDusk() {
    return (this.hour >= 17.5 && this.hour < 20) || (this.hour >= 6 && this.hour < 7.5);
  }
  // 0 in daylight, up to ~0.62 at deep night.
  get darkness() {
    if (this.hour >= 21 || this.hour < 5) return 0.62;
    if (this.hour >= 20 || this.hour < 6) return 0.45;
    if (this.isDusk) return 0.18;
    return 0;
  }
  get label() {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    const suffix = this.isNight ? 'NIGHT' : 'DAY';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
