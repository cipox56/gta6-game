// Dash Cole: on foot and behind the wheel. Health, cash, wanted level and car handling.
import { CFG } from './config.js';
import { clamp, dist2 } from './random.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.speed = 0;
    this.onFoot = true;
    this.car = null;
    this.health = CFG.maxHealth;
    this.cash = 0;
    this.wanted = 0;
    this.wantedHeat = 0; // 0..1 within the current star, drives decay
    this.unseenTimer = 0;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.hurtFlash = 0;
    this.carHealth = 100;
  }

  addWanted(n) {
    this.wanted = clamp(this.wanted + n, 0, CFG.maxWanted);
    this.wantedHeat = 1;
    this.unseenTimer = 0;
  }

  update(dt, input, city, game) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.onFoot) this.updateOnFoot(dt, input, city, game);
    else this.updateDriving(dt, input, city, game);
    // Wanted decays only while no police can see the player.
    if (this.wanted > 0) {
      const seen = game.police.some((p) => dist2(p.x, p.y, this.x, this.y) < 520 * 520)
        || (game.helicopters || []).some((h) => dist2(h.x, h.y, this.x, this.y) < 700 * 700);
      if (seen) { this.unseenTimer = 0; this.wantedHeat = 1; }
      else {
        this.unseenTimer += dt;
        if (this.unseenTimer > 4) {
          this.wantedHeat -= dt / 14;
          if (this.wantedHeat <= 0) { this.wanted -= 1; this.wantedHeat = this.wanted > 0 ? 1 : 0; this.unseenTimer = 0; }
        }
      }
    }
  }

  updateOnFoot(dt, input, city, game) {
    let dx = 0;
    let dy = 0;
    if (input.down('w', 'ArrowUp')) dy -= 1;
    if (input.down('s', 'ArrowDown')) dy += 1;
    if (input.down('a', 'ArrowLeft')) dx -= 1;
    if (input.down('d', 'ArrowRight')) dx += 1;
    const moving = dx !== 0 || dy !== 0;
    const run = input.down('Shift');
    const sp = run ? CFG.runSpeed : CFG.walkSpeed;
    if (moving) {
      const len = Math.hypot(dx, dy);
      this.angle = Math.atan2(dy / len, dx / len);
      this.x += (dx / len) * sp * dt;
      this.y += (dy / len) * sp * dt;
      this.walkPhase = (this.walkPhase || 0) + dt * 10;
    }
    city.collideCircle(this, CFG.playerRadius);
    if (input.take(' ')) {
      this.punchTimer = 0.25;
      this.punchCooldown = 0.4;
      game.tryPunch(this);
    }
    if (input.take('e')) game.tryEnterCar(this);
  }

  updateDriving(dt, input, city, game) {
    const car = this.car;
    if (!car) { this.onFoot = true; return; }
    const fwd = input.down('w', 'ArrowUp') ? 1 : 0;
    const rev = input.down('s', 'ArrowDown') ? 1 : 0;
    const steer = (input.down('a', 'ArrowLeft') ? -1 : 0) + (input.down('d', 'ArrowRight') ? 1 : 0);
    const handbrake = input.down(' ');
    if (fwd) this.speed += CFG.carAccel * dt;
    if (rev) this.speed -= (this.speed > 10 ? CFG.carBrake : CFG.carAccel * 0.6) * dt;
    if (!fwd && !rev) this.speed -= this.speed * CFG.carDrag * dt;
    if (handbrake) this.speed -= this.speed * 3 * dt;
    this.speed = clamp(this.speed, -CFG.carReverseMax, CFG.carMaxSpeed);
    const dir = this.speed >= 0 ? 1 : -1;
    const grip = handbrake ? 1.8 : 1;
    this.angle += steer * CFG.carTurn * grip * (Math.min(Math.abs(this.speed), 300) / 300) * dir * dt;
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    this.x = nx;
    this.y = ny;
    const beforeX = this.x;
    const beforeY = this.y;
    if (city.collideCircle(this, 20)) {
      const impact = Math.abs(this.speed);
      if (impact > 240) {
        this.speed *= -0.25;
        this.carHealth = Math.max(0, this.carHealth - impact * 0.04);
        game.onCrash(impact);
      } else {
        this.speed *= 0.5;
      }
      this.x = beforeX;
      this.y = beforeY;
      city.collideCircle(this, 20);
    }
    car.x = this.x;
    car.y = this.y;
    car.angle = this.angle;
    car.speed = this.speed;
    if (Math.abs(this.speed) > 320 && (steer !== 0 || handbrake)) {
      game.particles.addSkid(this.x - Math.cos(this.angle) * 14, this.y - Math.sin(this.angle) * 14, this.angle);
    }
    if (input.take('e')) game.exitCar(this);
  }

  takeDamage(n, game) {
    this.health = Math.max(0, this.health - n);
    this.hurtFlash = 0.4;
    if (game && game.sound) game.sound.thud();
  }
}
