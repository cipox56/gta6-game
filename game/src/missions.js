// The story chain: one mission at a time, with a target marker, timers and payouts.
// The manager owns mission state; the game owns the world it points at.
import { MISSIONS } from './config.js';
import { dist2 } from './random.js';

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.phase = 'idle'; // idle | active | done | failed
    this.stage = 0; // sub-step inside a mission (pickup -> deliver, etc.)
    this.timer = 0;
    this.target = null; // {x, y, label}
    this.faresDone = 0;
    this.faresTotal = 3;
    this.holdTimer = 0;
    this.surviveTimer = 0;
    this.message = '';
    this.checkpoint = 0; // race: next checkpoint index
    this.smashes = 0; // smash: police cars smashed so far
    this.racePoints = [];
  }

  get current() {
    return MISSIONS[this.index] || null;
  }
  get allDone() {
    return this.index >= MISSIONS.length;
  }

  start(index) {
    this.index = index;
    const m = this.current;
    if (!m) return;
    this.phase = 'active';
    this.stage = 0;
    this.timer = m.timeLimit;
    this.holdTimer = 0;
    this.surviveTimer = 0;
    this.faresDone = 0;
    this.checkpoint = 0;
    this.smashes = 0;
    this.racePoints = [];
    this.message = m.brief;
    this.setTargetForStage();
    this.game.banner(m.title, m.brief, 5);
    this.game.sound.blip();
  }

  setTargetForStage() {
    const g = this.game;
    const m = this.current;
    if (!m) { this.target = null; return; }
    const c = g.city;
    if (m.kind === 'deliver-car') this.target = { x: c.garage.x, y: c.garage.y, label: "Rosa's Garage" };
    else if (m.kind === 'race') {
      // Five checkpoints in order, weaving through the city grid.
      this.racePoints = [
        { x: 1200, y: 800, label: 'Checkpoint 1/5' },
        { x: 2400, y: 1200, label: 'Checkpoint 2/5' },
        { x: 800, y: 2000, label: 'Checkpoint 3/5' },
        { x: 2000, y: 2400, label: 'Checkpoint 4/5' },
        { x: 1600, y: 3050, label: 'Finish — Boardwalk 5/5' },
      ];
      this.target = this.racePoints[this.checkpoint];
    } else if (m.kind === 'smash') this.target = { x: g.player.x, y: g.player.y, label: `Smash police cars: ${this.smashes}/3` };
    else if (m.kind === 'pickup-deliver') this.target = this.stage === 0 ? { x: c.marina.x, y: c.marina.y, label: 'Pick up the package' } : { x: c.boardwalk.x, y: c.boardwalk.y, label: 'Deliver to the Boardwalk' };
    else if (m.kind === 'pickup-escape') this.target = this.stage === 0 ? { x: 1200, y: 800, label: 'Pick up Milo' } : { x: c.hideout.x, y: c.hideout.y, label: 'Reach the Hideout' };
    else if (m.kind === 'fares') {
      const spots = [{ x: 600, y: 1800, label: 'Fare 1' }, { x: 2200, y: 600, label: 'Fare 2' }, { x: 2600, y: 1800, label: 'Fare 3' }];
      const drop = [{ x: 1000, y: 2200, label: 'Drop off Fare 1' }, { x: 1800, y: 1400, label: 'Drop off Fare 2' }, { x: 600, y: 2600, label: 'Drop off Fare 3' }];
      this.target = this.stage === 0 ? spots[this.faresDone] : drop[this.faresDone];
    } else if (m.kind === 'survive') this.target = { x: g.player.x, y: g.player.y, label: 'Survive the chase!' };
    else if (m.kind === 'heist') this.target = this.stage === 0 ? { x: c.bank.x, y: c.bank.y, label: 'Reach the Bank Vault' } : { x: c.yacht.x, y: c.yacht.y, label: 'Escape to the Yacht' };
  }

  arriveRadius() {
    return this.current && this.current.kind === 'heist' && this.stage === 1 ? 90 : 70;
  }

  update(dt) {
    if (this.phase !== 'active' || !this.current) return;
    const g = this.game;
    const p = g.player;
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) { this.fail('Out of time.'); return; }
    }
    const m = this.current;
    if (m.kind === 'survive') {
      this.surviveTimer += dt;
      if (this.surviveTimer >= 60) { this.complete(); return; }
      this.target = { x: p.x, y: p.y, label: `Survive! ${Math.ceil(60 - this.surviveTimer)}s` };
      return;
    }
    if (m.kind === 'race') {
      // Arrive at checkpoints in order; the mission timer is the race clock.
      if (this.target && dist2(p.x, p.y, this.target.x, this.target.y) < 80 * 80) {
        this.checkpoint += 1;
        g.sound.pickup();
        g.particles.confetti(p.x, p.y - 20);
        if (this.checkpoint >= this.racePoints.length) { this.complete(); return; }
        this.target = this.racePoints[this.checkpoint];
        g.banner(`Checkpoint ${this.checkpoint + 1}/5`, this.target.label, 2);
      }
      return;
    }
    if (m.kind === 'smash') {
      this.target = { x: p.x, y: p.y, label: `Smash police cars: ${this.smashes}/3` };
      if (this.smashes >= 3) { this.complete(); return; }
      return;
    }
    if (m.kind === 'heist' && this.stage === 0 && this.target && dist2(p.x, p.y, this.target.x, this.target.y) < 70 * 70) {
      // Holding the vault: stand in the circle while the timer runs.
      this.holdTimer += dt;
      if (this.holdTimer >= 10) {
        this.stage = 1;
        this.holdTimer = 0;
        g.player.addWanted(3);
        g.banner('Vault cracked!', 'The alarm is screaming. Run for the yacht at the marina!', 4);
        this.setTargetForStage();
      }
      return;
    }
    if (m.kind === 'pickup-escape' && this.stage === 1) {
      // Escape stage: reach the hideout only once the heat is gone.
      if (this.target && dist2(p.x, p.y, this.target.x, this.target.y) < 80 * 80 && p.wanted === 0) { this.complete(); return; }
      return;
    }
    if (!this.target) return;
    if (dist2(p.x, p.y, this.target.x, this.target.y) < this.arriveRadius() * this.arriveRadius()) {
      this.onArrive();
    }
  }

  onArrive() {
    const g = this.game;
    const m = this.current;
    if (m.kind === 'deliver-car') {
      if (!g.player.car) {
        // Remind at most once per banner lifetime, not every frame.
        if (g.time >= g.bannerUntil) g.banner('Need wheels', 'You must arrive in a car. Steal one first!', 3);
        return;
      }
      this.complete();
    } else if (m.kind === 'pickup-deliver') {
      if (this.stage === 0) {
        this.stage = 1;
        g.sound.pickup();
        g.banner('Package secured', 'Now deliver it to the boardwalk before the timer runs out.', 4);
        this.setTargetForStage();
      } else this.complete();
    } else if (m.kind === 'pickup-escape') {
      if (this.stage === 0) {
        this.stage = 1;
        g.player.addWanted(2);
        g.banner('Milo is in!', 'Cops are on you. Lose the wanted level, then reach the hideout.', 4);
        this.setTargetForStage();
      }
    } else if (m.kind === 'fares') {
      if (this.stage === 0) {
        this.stage = 1;
        g.sound.pickup();
        this.setTargetForStage();
      } else {
        this.faresDone += 1;
        g.player.cash += 150;
        g.player.addRespect(0.5);
        g.particles.addText(g.player.x, g.player.y - 30, '+$150 fare', '#2ecc71');
        g.sound.coin();
        if (this.faresDone >= this.faresTotal) this.complete();
        else { this.stage = 0; this.setTargetForStage(); }
      }
    } else if (m.kind === 'heist') {
      if (this.stage === 1) this.complete();
    }
  }

  complete() {
    const g = this.game;
    const m = this.current;
    g.player.cash += m.reward;
    g.player.addRespect(1); // every finished job builds your name in Neon Bay
    g.particles.confetti(g.player.x, g.player.y - 20);
    g.particles.addText(g.player.x, g.player.y - 40, `+$${m.reward}`, '#f1c40f');
    g.sound.jingle();
    g.banner('Mission complete!', `${m.title} — you earned $${m.reward}. Respect ${g.player.respect}/5.`, 4);
    this.phase = 'done';
    this.index += 1;
    this.target = null;
    g.onMissionComplete();
  }

  fail(reason) {
    const g = this.game;
    this.phase = 'failed';
    this.message = reason;
    g.banner('Mission failed', `${reason} Talk to Rosa to try again.`, 4);
    g.sound.busted();
  }

  retry() {
    this.start(this.index);
  }
}
