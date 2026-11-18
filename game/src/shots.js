// Screenshot scenes behind ?shot=title|chase|street|mission (with &seed=N).
// Each one arranges the real game state — a live city, real cars, police and HUD —
// then lets it settle for a few fixed steps so the frame is what play looks like.
import { TrafficCar, PoliceCar, Pedestrian } from './entities.js';
import { CAR_COLORS } from './config.js';

function givePlayerCar(game, x, y, angle, color) {
  const car = new TrafficCar(x, y, angle, game.rng, true);
  car.color = color || game.rng.pick(CAR_COLORS);
  car.parked = false;
  car.stolen = true;
  game.traffic.push(car);
  const p = game.player;
  p.car = car;
  p.onFoot = false;
  p.x = x;
  p.y = y;
  p.angle = angle;
  p.speed = 380;
  p.carHealth = 100;
  return car;
}

function scatterTraffic(game, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const p = game.city.randomRoadPoint(game.rng);
    const near = Math.abs(p.x - cx) < 500 && Math.abs(p.y - cy) < 500;
    const spot = near ? p : { x: cx + game.rng.range(-450, 450), y: cy + game.rng.range(-450, 450) };
    game.traffic.push(new TrafficCar(spot.x, spot.y, game.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), game.rng, false));
  }
}

function settle(game, steps) {
  for (let i = 0; i < steps; i++) game.update(1 / 60);
}

export function stageShot(game, name) {
  const p = game.player;
  if (name === 'title') {
    game.state = 'title';
    p.x = 1200;
    p.y = 1200;
    game.camera.x = 1200;
    game.camera.y = 1200;
    scatterTraffic(game, 1200, 1200, 8);
    return;
  }
  if (name === 'street') {
    game.state = 'playing';
    p.x = 1200;
    p.y = 1200;
    p.onFoot = true;
    p.angle = Math.PI / 4;
    game.camera.x = 1200;
    game.camera.y = 1200;
    game.missions.start(0);
    scatterTraffic(game, 1200, 1200, 7);
    for (let i = 0; i < 10; i++) {
      game.peds.push(new Pedestrian(1200 + game.rng.range(-260, 260), 1200 + game.rng.range(-260, 260), game.rng));
    }
    settle(game, 25);
    return;
  }
  if (name === 'mission') {
    game.state = 'playing';
    givePlayerCar(game, 1560, 2960, -Math.PI / 2, '#f1c40f');
    p.cash = 750;
    game.camera.x = p.x;
    game.camera.y = p.y;
    game.missions.index = 1;
    game.missions.phase = 'done';
    game.missions.target = null;
    game.banner('Mission complete!', 'Package Run — you earned $500.', 30);
    game.particles.confetti(p.x, p.y - 40);
    scatterTraffic(game, 1600, 2900, 4);
    settle(game, 12);
    game.banner('Mission complete!', 'Package Run — you earned $500.', 30);
    return;
  }
  // Default: 'chase' — the cover shot. Driving fast east on the 1200 road, 4 stars,
  // police on the tail, a helicopter overhead, traffic ahead, mission marker on the minimap.
  game.state = 'playing';
  givePlayerCar(game, 1200, 1200, 0, '#e74c3c');
  game.camera.x = 1200;
  game.camera.y = 1200;
  p.addWanted(4);
  p.cash = 1250;
  game.missions.index = 1;
  game.missions.phase = 'active';
  game.missions.stage = 1;
  game.missions.timer = 58;
  game.missions.target = { x: game.city.boardwalk.x, y: game.city.boardwalk.y, label: 'Deliver to the Boardwalk' };
  scatterTraffic(game, 1200, 1200, 8);
  for (let i = 0; i < 3; i++) {
    const pc = new PoliceCar(1200 - 260 - i * 90, 1200 + (i - 1) * 40, game.rng);
    pc.angle = 0;
    pc.speed = 380;
    game.police.push(pc);
  }
  game.input.keys.add('w');
  settle(game, 20);
  game.input.keys.delete('w');
  game.camera.x = p.x;
  game.camera.y = p.y;
  game.banner('Package secured', 'Lose the cops and deliver it to the boardwalk.', 30);
}
