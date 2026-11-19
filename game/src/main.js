// Boot and the one loop: fixed 1/60 s steps, camera, police director, car stealing,
// collisions, save/load and the menu states. ?shot=chase|street|mission|title stages a
// screenshot scene instead of running the loop.
import { CFG, MISSIONS } from './config.js';
import { Rng } from './random.js';
import { City } from './world.js';
import { Pedestrian, TrafficCar, PoliceCar, Helicopter } from './entities.js';
import { Player } from './player.js';
import { MissionManager } from './missions.js';
import { Particles } from './particles.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';
import { CAR_COLORS } from './config.js';
import { Shop } from './shop.js';
import { DayNight } from './daynight.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.city = new City(seed);
    this.player = new Player(this.city.garage.x + 120, this.city.garage.y + 40);
    this.peds = [];
    this.traffic = [];
    this.police = [];
    this.helicopters = [];
    this.particles = new Particles();
    this.sound = new SoundEngine();
    this.missions = new MissionManager(this);
    this.shop = new Shop();
    this.daynight = new DayNight();
    this.roadblocks = [];
    this.sportsSpawned = false;
    this.camera = { x: this.player.x, y: this.player.y };
    this.state = 'title';
    this.time = 0;
    this.bannerTitle = '';
    this.bannerBody = '';
    this.bannerUntil = 0;
    this.overReason = 'wasted';
    this.saveExists = false;
    this.ramCooldown = 0;
    this.missionDelay = 0;
    this.spawnPeds();
    this.spawnTraffic();
  }

  spawnPeds() {
    for (let i = 0; i < 42; i++) {
      const p = this.city.randomRoadPoint(this.rng);
      this.peds.push(new Pedestrian(p.x + this.rng.range(-40, 40), p.y + this.rng.range(-40, 40), this.rng));
    }
  }
  spawnTraffic() {
    for (let i = 0; i < 12; i++) {
      const p = this.city.randomRoadPoint(this.rng);
      // A couple of vans in the mix so all three vehicle classes are on the road.
      const cls = i % 6 === 0 ? 'van' : 'sedan';
      this.traffic.push(new TrafficCar(p.x, p.y, this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), this.rng, false, cls));
    }
    for (let i = 0; i < 6; i++) {
      const s = this.city.randomParkedSpot(this.rng);
      this.traffic.push(new TrafficCar(s.x, s.y, s.angle, this.rng, true));
    }
  }

  banner(title, body, secs) {
    this.bannerTitle = title;
    this.bannerBody = body;
    this.bannerUntil = this.time + secs;
  }

  startNew() {
    this.player = new Player(this.city.garage.x + 120, this.city.garage.y + 40);
    this.police = [];
    this.helicopters = [];
    this.roadblocks = [];
    this.sportsSpawned = false;
    this.daynight.setTime(10);
    this.particles = new Particles();
    this.missions = new MissionManager(this);
    this.state = 'playing';
    this.missions.start(0);
    this.sound.ensure();
    this.sound.startMusic();
    this.save();
  }
  continueGame() {
    const save = this.loadSave();
    this.startNew();
    if (save) {
      this.player.cash = save.cash || 0;
      this.player.respect = save.respect || 0;
      this.player.upgrades = save.upgrades || { engine: 0, armor: 0, tires: 0 };
      if (save.stationIndex != null) this.sound.stationIndex = save.stationIndex;
      this.missions.start(Math.min(save.missionIndex || 0, MISSIONS.length - 1));
    }
  }
  loadSave() {
    try {
      const raw = window.localStorage.getItem(CFG.saveKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  save() {
    try {
      window.localStorage.setItem(CFG.saveKey, JSON.stringify({
        cash: this.player.cash,
        missionIndex: this.missions.index,
        respect: this.player.respect,
        upgrades: this.player.upgrades,
        stationIndex: this.sound.stationIndex,
      }));
    } catch (e) { /* storage unavailable */ }
  }
  clearSave() {
    try { window.localStorage.removeItem(CFG.saveKey); } catch (e) { /* ignore */ }
  }

  tryEnterCar(player) {
    let best = null;
    let bestD = 70 * 70;
    for (const c of this.traffic) {
      if (c.stolen) continue;
      const d2 = (c.x - player.x) ** 2 + (c.y - player.y) ** 2;
      if (d2 < bestD && (c.parked || Math.abs(c.speed) < 60)) { best = c; bestD = d2; }
    }
    if (!best) return;
    const wasParked = best.parked;
    best.parked = false;
    best.stolen = true;
    player.car = best;
    player.onFoot = false;
    player.angle = best.angle;
    player.speed = 0;
    player.carHealth = player.carHealthMax();
    this.sound.blip();
    if (!wasParked) {
      player.addWanted(1);
      this.banner('Car stolen!', 'That was someone\'s ride. The law noticed.', 3);
    }
  }
  exitCar(player) {
    const car = player.car;
    if (!car) return;
    car.parked = true;
    car.stolen = false;
    car.speed = 0;
    player.car = null;
    player.onFoot = true;
    player.x += Math.cos(player.angle + Math.PI / 2) * 34;
    player.y += Math.sin(player.angle + Math.PI / 2) * 34;
    player.speed = 0;
    this.city.collideCircle(player, 14);
  }
  tryPunch(player) {
    for (const ped of this.peds) {
      if (ped.down > 0) continue;
      const d2 = (ped.x - player.x) ** 2 + (ped.y - player.y) ** 2;
      if (d2 < 48 * 48) {
        ped.down = 3;
        ped.fleeing = 0;
        this.particles.burst(ped.x, ped.y, '#ffffff', 8, 90);
        this.sound.thud();
        player.addWanted(1);
        this.banner('Assault!', 'You decked a pedestrian. Someone called the cops.', 3);
        return;
      }
    }
  }
  onCrash(impact) {
    this.sound.crash();
    this.particles.burst(this.player.x, this.player.y, '#ffb142', 14, 160);
    if (this.player.carHealth <= 0 && this.player.car) {
      this.particles.burst(this.player.x, this.player.y, '#ff6b6b', 40, 260);
      this.sound.crash();
      this.player.takeDamage(25, this);
      this.player.car.color = '#2d3436';
      this.exitCar(this.player);
      this.banner('Car wrecked!', 'Your ride is scrap. Find another one.', 3);
    }
  }
  onMissionComplete() {
    this.save();
    if (this.missions.allDone) {
      this.state = 'win';
      this.sound.jingle();
      this.clearSave();
    } else {
      this.missionDelay = 1.2;
    }
  }

  updatePolice(dt) {
    const want = this.player.wanted;
    while (this.police.length < want) {
      const p = this.city.randomRoadPoint(this.rng);
      // Spawn away from the player so they arrive with sirens, not on top of them.
      const dx = p.x - this.player.x;
      const dy = p.y - this.player.y;
      if (dx * dx + dy * dy < 420 * 420) continue;
      this.police.push(new PoliceCar(p.x, p.y, this.rng));
    }
    if (want === 0 && this.police.length > 0) this.police = [];
    while (this.police.length > want) this.police.pop();
    for (const pc of this.police) pc.update(dt, this.city, this.player.x, this.player.y);
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    for (const pc of this.police) {
      const d2 = (pc.x - this.player.x) ** 2 + (pc.y - this.player.y) ** 2;
      if (d2 < 44 * 44 && this.ramCooldown <= 0) {
        this.ramCooldown = 0.8;
        // Heat Wave mission: ramming a police car at speed smashes it.
        if (!this.player.onFoot && Math.abs(this.player.speed) > 150
          && this.missions.current && this.missions.current.kind === 'smash' && !pc.smashed) {
          pc.smashed = true;
          this.missions.smashes += 1;
          this.particles.burst(pc.x, pc.y, '#ff6b6b', 20, 200);
          this.banner('Police car smashed!', `${this.missions.smashes}/3 — keep hitting them!`, 2);
        }
        if (this.player.onFoot) {
          this.gameOver('busted');
          return;
        }
        this.player.takeDamage(10, this);
        this.player.carHealth = Math.max(0, this.player.carHealth - 12);
        this.sound.crash();
        this.particles.burst(this.player.x, this.player.y, '#74b9ff', 12, 140);
        if (this.player.carHealth <= 0) this.onCrash(999);
      }
    }
  }

  // Police roadblocks: at 3+ stars two police cars park across the road ahead
  // of the player's heading. They despawn when the heat drops below 3.
  spawnRoadblocks() {
    const p = this.player;
    const fx = Math.cos(p.angle);
    const fy = Math.sin(p.angle);
    const px = -fy;
    const py = fx;
    const ahead = 330;
    for (const side of [-1, 1]) {
      const pc = new PoliceCar(p.x + fx * ahead + px * side * 32, p.y + fy * ahead + py * side * 32, this.rng);
      pc.angle = Math.atan2(fy, fx) + Math.PI / 2; // parked across the road
      pc.roadblock = true;
      this.roadblocks.push(pc);
    }
  }
  updateRoadblocks(dt) {
    const want = this.player.wanted;
    if (want >= 3 && this.roadblocks.length === 0) {
      this.spawnRoadblocks();
      this.banner('Roadblock ahead!', 'PCPD set up a roadblock. Ram through it or go around.', 3);
    } else if (want < 3 && this.roadblocks.length > 0) {
      this.roadblocks = [];
    }
    for (const pc of this.roadblocks) pc.update(dt, this.city, 0, 0);
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    for (const pc of this.roadblocks) {
      const d2 = (pc.x - this.player.x) ** 2 + (pc.y - this.player.y) ** 2;
      if (d2 < 48 * 48 && this.ramCooldown <= 0) {
        this.ramCooldown = 0.8;
        if (!this.player.onFoot && Math.abs(this.player.speed) > 150
          && this.missions.current && this.missions.current.kind === 'smash' && !pc.smashed) {
          pc.smashed = true;
          this.missions.smashes += 1;
          this.particles.burst(pc.x, pc.y, '#ff6b6b', 20, 200);
          this.banner('Police car smashed!', `${this.missions.smashes}/3 — keep hitting them!`, 2);
        }
        if (this.player.onFoot) { this.gameOver('busted'); return; }
        this.player.takeDamage(10, this);
        this.player.carHealth = Math.max(0, this.player.carHealth - 15);
        this.player.speed *= 0.3;
        this.sound.crash();
        this.particles.burst(this.player.x, this.player.y, '#74b9ff', 14, 150);
        if (this.player.carHealth <= 0) this.onCrash(999);
      }
    }
  }

  // Respect ≥2: a sports car appears parked at the marina, free to steal.
  maybeSpawnSportsCar() {
    if (this.sportsSpawned || this.player.respect < 2) return;
    this.sportsSpawned = true;
    const car = new TrafficCar(this.city.marina.x + 60, this.city.marina.y - 40, 0, this.rng, true, 'sports');
    this.traffic.push(car);
    this.banner('Respect pays off', 'A sports car is parked at the marina — yours if you can take it.', 4);
  }

  updateHelicopters(dt) {
    if (this.player.wanted >= 4) {
      if (this.helicopters.length === 0) {
        this.helicopters.push(new Helicopter(this.player.x - 300, this.player.y - 300, this.rng));
      }
    } else if (this.helicopters.length > 0) {
      this.helicopters = [];
    }
    for (const h of this.helicopters) h.update(dt, this.player.x, this.player.y);
  }

  update(dt) {
    this.time += dt;
    this.daynight.update(dt);
    this.player.update(dt, this.input, this.city, this);
    // Pedestrians: flee from a speeding player car, get hit by it.
    const danger = !this.player.onFoot && Math.abs(this.player.speed) > 120;
    for (const ped of this.peds) {
      ped.update(dt, this.city, this.player.x, this.player.y, danger);
      if (danger && ped.down <= 0) {
        const d2 = (ped.x - this.player.x) ** 2 + (ped.y - this.player.y) ** 2;
        if (d2 < 28 * 28) {
          ped.down = 3;
          this.particles.burst(ped.x, ped.y, '#ffffff', 10, 120);
          this.sound.thud();
          this.player.addWanted(1);
          this.banner('Pedestrian down!', 'You hit a pedestrian. The heat is on.', 3);
        }
      }
    }
    for (const c of this.traffic) {
      c.update(dt, this.city);
      if (!this.player.onFoot && this.player.car !== c && !c.stolen) {
        const d2 = (c.x - this.player.x) ** 2 + (c.y - this.player.y) ** 2;
        if (d2 < 40 * 40) {
          const impact = Math.abs(this.player.speed - c.speed);
          if (impact > 120) {
            this.sound.crash();
            this.particles.burst(c.x, c.y, '#ffb142', 10, 130);
            this.player.speed *= 0.4;
            this.player.carHealth = Math.max(0, this.player.carHealth - impact * 0.03);
          }
          const push = Math.atan2(this.player.y - c.y, this.player.x - c.x);
          this.player.x += Math.cos(push) * 12;
          this.player.y += Math.sin(push) * 12;
        }
      }
    }
    this.updatePolice(dt);
    this.updateRoadblocks(dt);
    this.updateHelicopters(dt);
    this.maybeSpawnSportsCar();
    if (this.state !== 'playing') return;
    this.missions.update(dt);
    if (this.missionDelay > 0) {
      this.missionDelay -= dt;
      if (this.missionDelay <= 0 && !this.missions.allDone) this.missions.start(this.missions.index);
    }
    if (this.player.health <= 0) this.gameOver('wasted');
    // Camera follows the player, clamped to the world.
    const tx = Math.max(CFG.canvasW / 2, Math.min(this.city.size - CFG.canvasW / 2, this.player.x));
    const ty = Math.max(CFG.canvasH / 2, Math.min(this.city.size - CFG.canvasH / 2, this.player.y));
    this.camera.x += (tx - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (ty - this.camera.y) * Math.min(1, dt * 5);
    this.particles.update(dt);
    // Audio follows the action.
    this.sound.engine(this.player.onFoot ? 0 : Math.abs(this.player.speed) / this.player.carTopSpeed());
    this.sound.siren(this.player.wanted > 0 && this.state === 'playing');
  }

  gameOver(reason) {
    this.overReason = reason;
    this.state = 'over';
    this.sound.busted();
    this.sound.siren(false);
    this.sound.engine(0);
    this.save();
  }

  handleMenuClick() {
    if (!this.input.clicked) return;
    const mx = this.input.mouseX;
    const my = this.input.mouseY;
    for (const b of this.renderer.menuButtons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.sound.ensure();
        if (b.id === 'start') this.startNew();
        else if (b.id === 'continue') this.continueGame();
        else if (b.id === 'howto') this.state = 'howto';
        else if (b.id === 'back') this.state = 'title';
        else if (b.id === 'resume') this.state = 'playing';
        else if (b.id === 'restart') this.startNew();
        else if (b.id === 'title') { this.state = 'title'; this.saveExists = !!this.loadSave(); }
        else if (b.id === 'close-shop') this.state = 'playing';
        else if (b.id.startsWith('buy:')) this.shop.buy(this, b.id.slice(4));
        return;
      }
    }
  }

  handleKeys() {
    const input = this.input;
    if (input.wasPressed('m')) {
      this.sound.ensure();
      this.sound.setMuted(!this.sound.muted);
    }
    if (this.state === 'title' || this.state === 'howto') {
      if (input.wasPressed('Enter', ' ')) this.startNew();
      return;
    }
    if (this.state === 'over' || this.state === 'win') {
      if (input.wasPressed('Enter', ' ')) this.startNew();
      return;
    }
    if (this.state === 'shop') {
      if (input.wasPressed('p', 'Escape', 'e', 'Enter')) this.state = 'playing';
      return;
    }
    if (input.wasPressed('q') && this.state === 'playing') {
      const name = this.sound.cycleStation();
      this.banner('Radio', `♪ ${name} — ${this.sound.station.desc}`, 2);
    }
    // E near Rosa's Garage (on foot) opens the upgrade shop instead of stealing a car.
    if (this.state === 'playing' && input.wasPressed('e') && Shop.nearGarage(this)) {
      this.state = 'shop';
      input.pressed.delete('e');
      this.sound.blip();
      return;
    }
    if (input.wasPressed('p', 'Escape')) {
      this.state = this.state === 'paused' ? 'playing' : 'paused';
    }
    if (input.wasPressed('r')) this.startNew();
    if (this.state === 'paused' && input.wasPressed('Enter')) this.state = 'playing';
  }

  run() {
    const canvas = document.getElementById('game');
    this.input = new Input();
    this.input.attach(canvas);
    this.renderer = new Renderer(canvas);
    this.saveExists = !!this.loadSave();
    window.__game = this; // debug handle used by automated play-tests
    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      requestAnimationFrame(frame);
      acc += Math.min((now - last) / 1000, MAX_FRAME);
      last = now;
      // If no fixed step will run this frame while playing, defer input
      // handling to the next frame: endFrame() clears edge-triggered
      // presses, so clearing on a step-less frame could drop a keypress
      // (e.g. E to steal a car) before any update ever saw it. The gate
      // uses the state at frame start: a press that flips paused -> playing
      // must still be cleared on that same frame, or it would fire twice.
      const wasPlaying = this.state === 'playing';
      const willStep = wasPlaying && acc >= STEP;
      if (!wasPlaying || willStep) {
        this.handleKeys();
        this.handleMenuClick();
      }
      if (this.state === 'playing') {
        while (acc >= STEP) { this.update(STEP); acc -= STEP; }
      } else {
        acc = 0;
        if (this.state === 'title') {
          // Gentle ambient traffic behind the title screen.
          this.time += STEP;
          for (const c of this.traffic) c.update(STEP, this.city);
          for (const ped of this.peds) ped.update(STEP, this.city, -9999, -9999, false);
        }
      }
      this.renderer.draw(this);
      if (!wasPlaying || willStep) this.input.endFrame();
    };
    requestAnimationFrame(frame);
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

window.addEventListener('error', (e) => {
  const div = document.createElement('div');
  div.id = 'game-error';
  div.textContent = `GAME ERROR: ${e.message}`;
  document.body.appendChild(div);
});

if (shot) {
  const game = new Game(seed);
  window.__game = game; // debug handle used by automated play-tests
  const canvas = document.getElementById('game');
  game.input = new Input();
  game.input.attach(canvas);
  game.renderer = new Renderer(canvas);
  stageShot(game, shot);
  game.renderer.draw(game);
  requestAnimationFrame(() => {
    game.renderer.draw(game);
    window.__shotReady = true;
  });
} else {
  const game = new Game(seed);
  game.run();
}
