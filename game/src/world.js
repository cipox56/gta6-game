// Neon Bay: a seeded grid city — roads, building blocks, beach, marina, parks and landmarks.
// Pure data + collision queries; all drawing lives in render.js.
import { CFG, BUILDING_COLORS } from './config.js';
import { Rng, clamp } from './random.js';

export class City {
  constructor(seed) {
    this.rng = new Rng(seed);
    this.size = CFG.worldSize;
    this.roads = [];
    const gap = CFG.roadGap;
    for (let x = gap; x < this.size; x += gap) this.roads.push({ vertical: true, at: x });
    for (let y = gap; y < this.size; y += gap) this.roads.push({ vertical: false, at: y });
    this.buildings = [];
    this.palms = [];
    this.parks = [];
    this.generateBlocks();
    // Landmarks (fixed spots so missions can point at them).
    this.garage = { x: 600, y: 600, r: 70, name: "Rosa's Garage" };
    this.marina = { x: 300, y: 2900, r: 80, name: 'Marina' };
    this.bank = { x: 1000, y: 1000, r: 70, name: 'Neon Bay Bank' };
    this.hideout = { x: 2600, y: 2600, r: 80, name: 'Hideout' };
    this.boardwalk = { x: 1600, y: 3050, r: 80, name: 'Boardwalk' };
    this.yacht = { x: 300, y: 3050, r: 70, name: 'Yacht' };
  }

  generateBlocks() {
    const gap = CFG.roadGap;
    const half = CFG.roadWidth / 2;
    for (let bx = 0; bx < this.size / gap; bx++) {
      for (let by = 0; by < this.size / gap; by++) {
        const x0 = bx * gap + half + 14;
        const y0 = by * gap + half + 14;
        const x1 = (bx + 1) * gap - half - 14;
        const y1 = (by + 1) * gap - half - 14;
        if (y0 > 2960) continue; // beach strip at the south edge
        const r = this.rng;
        if (r.chance(0.14)) {
          this.parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
          for (let i = 0; i < 6; i++) this.palms.push({ x: r.range(x0 + 20, x1 - 20), y: r.range(y0 + 20, y1 - 20) });
          continue;
        }
        const n = r.int(1, 3);
        for (let i = 0; i < n; i++) {
          const w = r.range(70, 130);
          const h = r.range(70, 130);
          const x = r.range(x0, Math.max(x0 + 1, x1 - w));
          const y = r.range(y0, Math.max(y0 + 1, y1 - h));
          this.buildings.push({
            x, y, w, h,
            color: r.pick(BUILDING_COLORS),
            floors: r.int(2, 9),
            roof: r.pick(['#2d3436', '#636e72', '#6c5ce7', '#00b894']),
          });
        }
        if (r.chance(0.5)) this.palms.push({ x: r.range(x0, x1), y: r.range(y0, y1) });
      }
    }
    // Palm rows along the beach.
    for (let x = 120; x < this.size - 100; x += 130) {
      this.palms.push({ x: x + this.rng.range(-20, 20), y: 3020 + this.rng.range(-14, 14) });
    }
  }

  isRoad(x, y) {
    const half = CFG.roadWidth / 2;
    const gap = CFG.roadGap;
    const mx = ((x % gap) + gap) % gap;
    const my = ((y % gap) + gap) % gap;
    return mx < half || mx > gap - half || my < half || my > gap - half;
  }

  // Push a circle out of buildings and world bounds; returns true on a hard hit.
  collideCircle(e, radius) {
    let hit = false;
    e.x = clamp(e.x, radius, this.size - radius);
    e.y = clamp(e.y, radius, this.size - radius);
    for (const b of this.buildings) {
      const cx = clamp(e.x, b.x, b.x + b.w);
      const cy = clamp(e.y, b.y, b.y + b.h);
      const dx = e.x - cx;
      const dy = e.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < radius * radius) {
        hit = true;
        if (d2 > 0.01) {
          const d = Math.sqrt(d2);
          e.x = cx + (dx / d) * radius;
          e.y = cy + (dy / d) * radius;
        } else {
          e.y = b.y - radius;
        }
      }
    }
    return hit;
  }

  randomRoadPoint(rng) {
    const gap = CFG.roadGap;
    const vertical = rng.chance(0.5);
    const line = rng.int(1, 7) * gap;
    const along = rng.range(150, this.size - 150);
    return vertical ? { x: line, y: along } : { x: along, y: line };
  }

  randomParkedSpot(rng) {
    // Parked cars sit on road shoulders near an intersection.
    const gap = CFG.roadGap;
    const ix = rng.int(1, 7) * gap;
    const iy = rng.int(1, 7) * gap;
    const side = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    return { x: ix + side[0] * 62, y: iy + side[1] * 62, angle: side[0] !== 0 ? 0 : Math.PI / 2 };
  }
}
