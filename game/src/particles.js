// Particles, skid marks and floating score text.
export class Particles {
  constructor() {
    this.list = [];
    this.skids = [];
    this.texts = [];
  }
  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (speed || 120) * (0.4 + Math.random() * 0.8);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4 });
    }
  }
  confetti(x, y) {
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#ff6b9d'];
    for (let i = 0; i < 60; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const s = 150 + Math.random() * 260;
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 + Math.random(), max: 2, color: colors[i % colors.length], size: 3 + Math.random() * 3, gravity: 300 });
    }
  }
  addSkid(x, y, angle) {
    this.skids.push({ x, y, angle, life: 4 });
    if (this.skids.length > 220) this.skids.shift();
  }
  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color: color || '#f1c40f', life: 1.4 });
  }
  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 60) * dt;
      p.vx *= 0.98;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const s of this.skids) s.life -= dt;
    this.skids = this.skids.filter((s) => s.life > 0);
    for (const t of this.texts) { t.y -= 30 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}
