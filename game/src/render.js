// Drawing only: the city, the people and cars in it, the HUD, the minimap and the menus.
// The 1280x720 playfield is scaled to fit the window; the camera follows the player.
import { CFG, DISTRICTS } from './config.js';
import { clamp } from './random.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, x, y, angle, w, h, color, police) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -w / 2 + 3, -h / 2 + 4, w, h, 6);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#1b2a3a';
  roundRect(ctx, -w / 2 + 8, -h / 2 + 5, w * 0.32, h - 10, 3);
  ctx.fill();
  ctx.fillStyle = '#dfe9f5';
  roundRect(ctx, w * 0.08, -h / 2 + 5, w * 0.18, h - 10, 3);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(w / 2 - 2, -h / 2 + 3, 3, 5);
  ctx.fillRect(w / 2 - 2, h / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-w / 2, -h / 2 + 3, 3, 5);
  ctx.fillRect(-w / 2, h / 2 - 8, 3, 5);
  if (police) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -h / 2 - 1, 12, h + 2);
    ctx.fillStyle = '#0a84ff';
    ctx.fillRect(-6, -h / 2 - 1, 12, 4);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-6, h / 2 - 3, 12, 4);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, walking) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(1, 3, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = walking ? Math.sin(walking) * 1.5 : 0;
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3 + bob * 0.3, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2d3436';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4 + bob * 0.3 - 1, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { scale: 1, x: 0, y: 0 };
    this.menuButtons = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    this.canvas.width = w;
    this.canvas.height = h;
    this.view.scale = Math.min(w / CFG.canvasW, h / CFG.canvasH);
    this.view.x = (w - CFG.canvasW * this.view.scale) / 2;
    this.view.y = (h - CFG.canvasH * this.view.scale) / 2;
  }
  text(value, x, y, size, color, align, bold) {
    const ctx = this.ctx;
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  draw(game) {
    const ctx = this.ctx;
    const W = CFG.canvasW;
    const H = CFG.canvasH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, this.view.x, this.view.y);
    const cam = game.camera;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W / 2 - cam.x, H / 2 - cam.y);
    this.drawWorld(ctx, game);
    ctx.restore();
    this.drawHud(ctx, game);
    if (game.state === 'title') this.drawTitle(ctx, game);
    else if (game.state === 'howto') this.drawHowTo(ctx, game);
    else if (game.state === 'paused') this.drawPaused(ctx, game);
    else if (game.state === 'over') this.drawOver(ctx, game);
    else if (game.state === 'win') this.drawWin(ctx, game);
    if (game.bannerTitle && game.bannerUntil > game.time) this.drawBanner(ctx, game);
    if (game.player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,0,0,${game.player.hurtFlash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawWorld(ctx, game) {
    const city = game.city;
    const cam = game.camera;
    const vx0 = cam.x - CFG.canvasW / 2 - 80;
    const vy0 = cam.y - CFG.canvasH / 2 - 80;
    const vx1 = cam.x + CFG.canvasW / 2 + 80;
    const vy1 = cam.y + CFG.canvasH / 2 + 80;
    // Ground: grass blocks, sand beach and sea at the south edge.
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    ctx.fillStyle = '#f2d492';
    ctx.fillRect(vx0, 2960, vx1 - vx0, 240);
    ctx.fillStyle = '#1e90d6';
    ctx.fillRect(vx0, 3120, vx1 - vx0, 200);
    ctx.fillStyle = '#7fb8e8';
    for (let x = Math.floor(vx0 / 90) * 90; x < vx1; x += 90) {
      ctx.fillRect(x, 3130 + ((x * 7) % 50), 46, 5);
    }
    // District tint wash.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.tint;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.globalAlpha = 1;
    }
    // Parks.
    for (const p of city.parks) {
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#81c784';
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, Math.min(p.w, p.h) / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Roads.
    const half = CFG.roadWidth / 2;
    ctx.fillStyle = '#3a3f4a';
    for (const r of city.roads) {
      if (r.vertical) ctx.fillRect(r.at - half, 0, CFG.roadWidth, city.size);
      else ctx.fillRect(0, r.at - half, city.size, CFG.roadWidth);
    }
    // Lane dashes.
    ctx.fillStyle = '#f5d76e';
    for (const r of city.roads) {
      if (r.vertical) {
        for (let y = 0; y < city.size; y += 64) ctx.fillRect(r.at - 2, y, 4, 30);
      } else {
        for (let x = 0; x < city.size; x += 64) ctx.fillRect(x, r.at - 2, 30, 4);
      }
    }
    // Sidewalk edges.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (const r of city.roads) {
      ctx.beginPath();
      if (r.vertical) { ctx.moveTo(r.at - half, 0); ctx.lineTo(r.at - half, city.size); ctx.moveTo(r.at + half, 0); ctx.lineTo(r.at + half, city.size); }
      else { ctx.moveTo(0, r.at - half); ctx.lineTo(city.size, r.at - half); ctx.moveTo(0, r.at + half); ctx.lineTo(city.size, r.at + half); }
      ctx.stroke();
    }
    // Buildings with a fake 3D top edge and windows.
    for (const b of city.buildings) {
      if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      ctx.fillStyle = 'rgba(255,255,180,0.75)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 26));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if ((i * 7 + j * 3 + b.floors) % 4 === 0) continue;
          ctx.fillRect(b.x + 10 + i * 26, b.y + 10 + j * 26, 12, 12);
        }
      }
    }
    // Palm trees.
    for (const p of city.palms) {
      if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 10);
      ctx.fillStyle = '#27ae60';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.ellipse(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9 - 4, 10, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Landmark pads.
    this.landmark(ctx, city.garage, '#2ecc71', 'GARAGE');
    this.landmark(ctx, city.marina, '#3498db', 'MARINA');
    this.landmark(ctx, city.bank, '#f1c40f', 'BANK');
    this.landmark(ctx, city.hideout, '#9b59b6', 'HIDEOUT');
    this.landmark(ctx, city.boardwalk, '#e67e22', 'BOARDWALK');
    this.landmark(ctx, city.yacht, '#1abc9c', 'YACHT');
    // Mission target beacon.
    const t = game.missions.target;
    if (t && game.state === 'playing') {
      const pulse = 1 + Math.sin(game.time * 5) * 0.12;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(0, -58);
      ctx.lineTo(12, -34);
      ctx.lineTo(-12, -34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      this.text(t.label, t.x, t.y - 66, 15, '#ffffff', 'center', true);
    }
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.lineWidth = 4;
    for (const s of game.particles.skids) {
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 8, s.y - Math.sin(s.angle) * 8);
      ctx.lineTo(s.x + Math.cos(s.angle) * 8, s.y + Math.sin(s.angle) * 8);
      ctx.stroke();
    }
    // Traffic and parked cars.
    for (const c of game.traffic) {
      if (c.stolen) continue;
      drawCarShape(ctx, c.x, c.y, c.angle, c.w, c.h, c.color, false);
    }
    // Police.
    for (const p of game.police) {
      const flash = Math.sin(p.sirenPhase) > 0;
      drawCarShape(ctx, p.x, p.y, p.angle, p.w, p.h, p.color, true);
      ctx.fillStyle = flash ? '#ff3b30' : '#0a84ff';
      ctx.beginPath();
      ctx.arc(p.x - Math.cos(p.angle) * 10, p.y - Math.sin(p.angle) * 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pedestrians.
    for (const ped of game.peds) {
      if (ped.down > 0) {
        ctx.fillStyle = ped.shirt;
        ctx.beginPath();
        ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.walkPhase);
    }
    // Player.
    const pl = game.player;
    if (pl.onFoot) {
      drawPerson(ctx, pl.x, pl.y, pl.angle, '#ff4757', pl.walkPhase || 0);
      if (pl.punchTimer > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pl.x + Math.cos(pl.angle) * 22, pl.y + Math.sin(pl.angle) * 22, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (pl.car) {
      drawCarShape(ctx, pl.x, pl.y, pl.angle, 48, 24, pl.car.color, false);
    }
    // Particles.
    for (const p of game.particles.list) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const t2 of game.particles.texts) {
      ctx.globalAlpha = clamp(t2.life, 0, 1);
      this.text(t2.text, t2.x, t2.y, 20, t2.color, 'center', true);
    }
    ctx.globalAlpha = 1;
  }

  landmark(ctx, spot, color, label) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.stroke();
    this.text(label, spot.x, spot.y + 4, 14, '#ffffff', 'center', true);
  }

  drawHud(ctx, game) {
    if (game.state === 'title' || game.state === 'howto') return;
    const p = game.player;
    // Top-left: cash and mission.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 12, 12, 330, 88, 10);
    ctx.fill();
    this.text(`$${p.cash.toLocaleString('en-US')}`, 26, 40, 26, '#2ecc71', 'left', true);
    const m = game.missions.current;
    const mLabel = game.missions.allDone ? 'All missions complete!' : m ? `${game.missions.index + 1}/6 ${m.title}` : 'Free roam';
    this.text(mLabel, 26, 64, 15, '#ffffff', 'left');
    if (game.missions.phase === 'active' && game.missions.target) {
      this.text(`▸ ${game.missions.target.label}`, 26, 86, 15, '#f1c40f', 'left');
    }
    // Top-right: wanted stars + health.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, CFG.canvasW - 252, 12, 240, 64, 10);
    ctx.fill();
    let stars = '';
    for (let i = 0; i < CFG.maxWanted; i++) stars += i < p.wanted ? '★' : '☆';
    const blink = p.wanted > 0 && Math.sin(game.time * 6) > 0;
    this.text(stars, CFG.canvasW - 238, 42, 24, blink ? '#ff6b6b' : '#f1c40f', 'left', true);
    ctx.fillStyle = '#333';
    roundRect(ctx, CFG.canvasW - 238, 52, 212, 12, 6);
    ctx.fill();
    ctx.fillStyle = p.health > 30 ? '#2ecc71' : '#e74c3c';
    roundRect(ctx, CFG.canvasW - 238, 52, 212 * (p.health / CFG.maxHealth), 12, 6);
    ctx.fill();
    this.text(`HP ${Math.ceil(p.health)}`, CFG.canvasW - 26, 42, 13, '#ffffff', 'right');
    // Mission timer.
    if (game.missions.phase === 'active' && game.missions.timer > 0) {
      const t = Math.ceil(game.missions.timer);
      this.text(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, CFG.canvasW / 2, 44, 30, t < 15 ? '#ff6b6b' : '#ffffff', 'center', true);
    }
    // Speed when driving.
    if (!p.onFoot) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, 12, CFG.canvasH - 58, 150, 46, 10);
      ctx.fill();
      this.text(`${Math.round(Math.abs(p.speed) * 0.36)} km/h`, 26, CFG.canvasH - 26, 22, '#ffffff', 'left', true);
    }
    // Controls hint.
    this.text('WASD move/drive · E enter car · Space punch/brake · Shift run · P pause · M mute', 14, CFG.canvasH - 12, 13, 'rgba(255,255,255,0.65)', 'left');
    this.drawMinimap(ctx, game);
  }

  drawMinimap(ctx, game) {
    const size = 190;
    const x0 = CFG.canvasW - size - 14;
    const y0 = CFG.canvasH - size - 14;
    const s = size / CFG.worldSize;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x0 - 6, y0 - 6, size + 12, size + 12, 10);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();
    ctx.fillStyle = '#1f7a3a';
    ctx.fillRect(x0, y0, size, size);
    ctx.fillStyle = '#f2d492';
    ctx.fillRect(x0, 2960 * s + y0, size, 160 * s);
    ctx.fillStyle = '#1e90d6';
    ctx.fillRect(x0, 3120 * s + y0, size, 80 * s);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    for (const r of game.city.roads) {
      ctx.beginPath();
      if (r.vertical) { ctx.moveTo(x0 + r.at * s, y0); ctx.lineTo(x0 + r.at * s, y0 + size); }
      else { ctx.moveTo(x0, y0 + r.at * s); ctx.lineTo(x0 + size, y0 + r.at * s); }
      ctx.stroke();
    }
    const t = game.missions.target;
    if (t && game.state === 'playing') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x0 + t.x * s, y0 + t.y * s, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const pc of game.police) {
      ctx.fillStyle = '#0a84ff';
      ctx.beginPath();
      ctx.arc(x0 + pc.x * s, y0 + pc.y * s, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = game.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x0 + p.x * s, y0 + p.y * s - 7);
    ctx.lineTo(x0 + p.x * s + 6, y0 + p.y * s + 5);
    ctx.lineTo(x0 + p.x * s - 6, y0 + p.y * s + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this.text('NEON BAY', x0 + size / 2, y0 - 12, 12, '#ffffff', 'center', true);
  }

  drawBanner(ctx, game) {
    // Word-wrap the body so long briefings stay inside the box.
    const words = game.bannerBody.split(' ');
    const lines = [''];
    for (const w of words) {
      const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
      if (trial.length > 78 && lines[lines.length - 1]) lines.push(w);
      else lines[lines.length - 1] = trial;
    }
    const h = 52 + lines.length * 24;
    const y0 = 92;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, CFG.canvasW / 2 - 330, y0, 660, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    roundRect(ctx, CFG.canvasW / 2 - 330, y0, 660, h, 12);
    ctx.stroke();
    this.text(game.bannerTitle, CFG.canvasW / 2, y0 + 32, 24, '#f1c40f', 'center', true);
    lines.forEach((line, i) => this.text(line, CFG.canvasW / 2, y0 + 60 + i * 24, 15, '#ffffff', 'center'));
  }

  panel(ctx, title, lines, buttons) {
    ctx.fillStyle = 'rgba(5,8,20,0.72)';
    ctx.fillRect(0, 0, CFG.canvasW, CFG.canvasH);
    ctx.fillStyle = 'rgba(16,20,36,0.96)';
    roundRect(ctx, CFG.canvasW / 2 - 340, 110, 680, 500, 16);
    ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    roundRect(ctx, CFG.canvasW / 2 - 340, 110, 680, 500, 16);
    ctx.stroke();
    this.text(title, CFG.canvasW / 2, 175, 44, '#f1c40f', 'center', true);
    let y = 225;
    for (const line of lines) {
      this.text(line, CFG.canvasW / 2, y, 17, '#e8ecf1', 'center');
      y += 28;
    }
    this.menuButtons = [];
    let by = 480;
    for (const b of buttons) {
      const bw = 300;
      const bx = CFG.canvasW / 2 - bw / 2;
      ctx.fillStyle = '#f1c40f';
      roundRect(ctx, bx, by, bw, 46, 10);
      ctx.fill();
      this.text(b.label, CFG.canvasW / 2, by + 31, 20, '#111111', 'center', true);
      this.menuButtons.push({ id: b.id, x: bx, y: by, w: bw, h: 46 });
      by += 58;
    }
  }

  drawTitle(ctx, game) {
    ctx.fillStyle = 'rgba(5,8,20,0.55)';
    ctx.fillRect(0, 0, CFG.canvasW, CFG.canvasH);
    this.text('NEON BAY', CFG.canvasW / 2, 150, 84, '#f1c40f', 'center', true);
    this.text('HEIST', CFG.canvasW / 2, 225, 84, '#ff6b9d', 'center', true);
    this.text('An original open-world crime game — drive, steal, run missions, outrun the law.', CFG.canvasW / 2, 268, 18, '#ffffff', 'center');
    this.text('Sun-soaked streets. Six story missions. One last big score.', CFG.canvasW / 2, 294, 16, '#cfd8dc', 'center');
    const buttons = [{ id: 'start', label: '▶  START GAME' }];
    if (game.saveExists) buttons.push({ id: 'continue', label: 'CONTINUE (saved game)' });
    buttons.push({ id: 'howto', label: 'HOW TO PLAY' });
    this.menuButtons = [];
    let by = 350;
    for (const b of buttons) {
      const bw = 340;
      const bx = CFG.canvasW / 2 - bw / 2;
      ctx.fillStyle = '#f1c40f';
      roundRect(ctx, bx, by, bw, 50, 10);
      ctx.fill();
      this.text(b.label, CFG.canvasW / 2, by + 34, 21, '#111111', 'center', true);
      this.menuButtons.push({ id: b.id, x: bx, y: by, w: bw, h: 50 });
      by += 64;
    }
    this.text('WASD / Arrows — move & drive · E — enter / steal car · Space — punch / handbrake', CFG.canvasW / 2, by + 18, 15, '#ffffff', 'center');
    this.text('Shift — run · P — pause · M — mute · R — restart', CFG.canvasW / 2, by + 42, 15, '#ffffff', 'center');
    this.text('A fan-made original. Not affiliated with Rockstar Games.', CFG.canvasW / 2, CFG.canvasH - 24, 13, 'rgba(255,255,255,0.55)', 'center');
  }

  drawHowTo(ctx, game) {
    this.panel(ctx, 'HOW TO PLAY', [
      'You are Dash Cole, a wheelman new to Neon Bay.',
      'Follow Rosa\'s missions: steal cars, run packages,',
      'drive getaways and pull off the big bank score.',
      '',
      'On foot: WASD to move, Shift to run, Space to punch.',
      'Near a car press E to get in — parked cars are free,',
      'stealing one with a driver inside raises your wanted level.',
      'Driving: W accelerate, S brake / reverse, A D steer,',
      'Space handbrake. Hitting pedestrians or cops raises heat.',
      'Police chase you while you have stars. Break line of sight',
      'to cool down, or reach the hideout with zero stars.',
      'Complete all 6 missions to own Neon Bay. Good luck, Dash.',
    ], [{ id: 'back', label: 'BACK' }]);
  }

  drawPaused(ctx, game) {
    this.panel(ctx, 'PAUSED', [
      `Cash $${game.player.cash.toLocaleString('en-US')} · Mission ${Math.min(game.missions.index + 1, 6)}/6`,
      'Take a breath. Neon Bay will wait.',
      '',
      'P — resume · R — restart · M — mute',
    ], [{ id: 'resume', label: 'RESUME' }, { id: 'restart', label: 'RESTART' }]);
  }

  drawOver(ctx, game) {
    const busted = game.overReason === 'busted';
    this.panel(ctx, busted ? 'BUSTED!' : 'WASTED!', [
      busted ? 'Detective Hale finally caught up with you.' : 'Neon Bay chewed you up, Dash.',
      `Cash kept: $${game.player.cash.toLocaleString('en-US')} · Missions done: ${game.missions.index}/6`,
      '',
      'Press Enter or click below to try again.',
    ], [{ id: 'restart', label: 'TRY AGAIN' }, { id: 'title', label: 'MAIN MENU' }]);
  }

  drawWin(ctx, game) {
    this.panel(ctx, 'YOU OWN NEON BAY!', [
      'Six missions. One big score. The yacht is yours, Dash.',
      `Final cash: $${game.player.cash.toLocaleString('en-US')}`,
      '',
      'Thanks for playing Neon Bay Heist.',
    ], [{ id: 'restart', label: 'PLAY AGAIN' }, { id: 'title', label: 'MAIN MENU' }]);
  }
}
