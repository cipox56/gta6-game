// Everyone else in Neon Bay: pedestrians, traffic cars and police pursuit cars.
import { CFG, CAR_COLORS, PED_SHIRTS } from './config.js';
import { clamp, dist2, angleLerp } from './random.js';

export class Pedestrian {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    this.r = 9;
    this.shirt = rng.pick(PED_SHIRTS);
    this.speed = 40 + rng.next() * 40;
    this.angle = rng.next() * Math.PI * 2;
    this.walkPhase = rng.next() * 6;
    this.fleeing = 0;
    this.down = 0;
    this.retarget = 0;
  }
  update(dt, city, playerX, playerY, playerDanger) {
    if (this.down > 0) { this.down -= dt; return; }
    this.retarget -= dt;
    const d2 = dist2(this.x, this.y, playerX, playerY);
    if (playerDanger && d2 < 220 * 220) this.fleeing = 1.2;
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      const a = Math.atan2(this.y - playerY, this.x - playerX);
      this.angle = angleLerp(this.angle, a, Math.min(1, dt * 6));
      const sp = this.speed * 2.4;
      this.x += Math.cos(this.angle) * sp * dt;
      this.y += Math.sin(this.angle) * sp * dt;
    } else {
      if (this.retarget <= 0) {
        this.retarget = 2 + Math.random() * 3;
        this.angle += (Math.random() - 0.5) * 2.2;
      }
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }
    this.walkPhase += dt * 8;
    this.x = clamp(this.x, 20, city.size - 20);
    this.y = clamp(this.y, 20, city.size - 20);
    city.collideCircle(this, this.r);
  }
}

export class TrafficCar {
  constructor(x, y, angle, rng, parked) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = parked ? 0 : 130 + rng.next() * 70;
    this.maxSpeed = 130 + rng.next() * 70;
    this.color = rng.pick(CAR_COLORS);
    this.parked = !!parked;
    this.w = 46;
    this.h = 22;
    this.stolen = false;
    this.turnTimer = 0;
  }
  update(dt, city) {
    if (this.parked || this.stolen) return;
    // Drive along the road grid; at intersections sometimes turn.
    this.turnTimer -= dt;
    const gap = CFG.roadGap;
    const nearX = Math.abs(((this.x % gap) + gap) % gap - 0) < 30 || Math.abs(((this.x % gap) + gap) % gap - gap) < 30;
    const nearY = Math.abs(((this.y % gap) + gap) % gap - 0) < 30 || Math.abs(((this.y % gap) + gap) % gap - gap) < 30;
    if (this.turnTimer <= 0 && nearX && nearY) {
      this.turnTimer = 2 + Math.random() * 3;
      if (Math.random() < 0.4) this.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    const tx = Math.cos(this.angle);
    const ty = Math.sin(this.angle);
    this.x += tx * this.speed * dt;
    this.y += ty * this.speed * dt;
    // Keep on the road: nudge back toward the road centre line.
    const half = CFG.roadWidth / 2;
    const mx = ((this.x % gap) + gap) % gap;
    const my = ((this.y % gap) + gap) % gap;
    if (Math.abs(tx) > 0.5) {
      const targetY = Math.round(this.y / gap) * gap;
      this.y += clamp(targetY - this.y, -1, 1) * dt * 40;
      if (my > half && my < gap - half) this.y = Math.round(this.y / gap) * gap + (this.y > targetY ? 20 : -20);
    } else {
      const targetX = Math.round(this.x / gap) * gap;
      this.x += clamp(targetX - this.x, -1, 1) * dt * 40;
      if (mx > half && mx < gap - half) this.x = Math.round(this.x / gap) * gap + (this.x > targetX ? 20 : -20);
    }
    if (this.x < 40 || this.x > city.size - 40 || this.y < 40 || this.y > city.size - 40) {
      this.angle += Math.PI;
      this.x = clamp(this.x, 60, city.size - 60);
      this.y = clamp(this.y, 60, city.size - 60);
    }
    city.collideCircle(this, 20);
  }
}

export class PoliceCar {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.maxSpeed = 470;
    this.color = '#1e3799';
    this.w = 48;
    this.h = 23;
    this.sirenPhase = rng.next() * 6;
  }
  update(dt, city, tx, ty) {
    // Pursuit steering: aim at the target, accelerate, ram on contact.
    const want = Math.atan2(ty - this.y, tx - this.x);
    this.angle = angleLerp(this.angle, want, Math.min(1, dt * 3.2));
    this.speed = Math.min(this.maxSpeed, this.speed + 420 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.sirenPhase += dt * 6;
    city.collideCircle(this, 20);
  }
}

// Police helicopter air support at wanted level 4-5. It hovers above the
// player with lag and a searchlight; it never damages the player.
export class Helicopter {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.rotor = 0;
    this.bobPhase = rng ? rng.next() * 6 : 0;
  }
  update(dt, tx, ty) {
    // Chase a point offset from the player, with lag: slower than a fleeing car.
    const hx = tx - 120;
    const hy = ty - 120;
    const dx = hx - this.x;
    const dy = hy - this.y;
    const d = Math.hypot(dx, dy);
    const maxStep = 420 * dt;
    if (d > 0) {
      const step = Math.min(d, maxStep);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
    this.angle = Math.atan2(ty - this.y, tx - this.x);
    this.rotor += dt * 25;
    this.bobPhase += dt * 2;
    this.x = clamp(this.x, 40, CFG.worldSize - 40);
    this.y = clamp(this.y, 40, CFG.worldSize - 40);
  }
}
