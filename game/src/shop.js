// Rosa's Garage: spend mission cash on car upgrades and a clean record.
// The shop is a game state like 'paused', drawn by render.js with clickable
// buttons; buying applies immediately and persists in the save.
import { SHOP_ITEMS } from './config.js';
import { dist2 } from './random.js';

export class Shop {
  constructor() {
    this.items = SHOP_ITEMS;
  }

  static nearGarage(game) {
    const p = game.player;
    return p.onFoot && dist2(p.x, p.y, game.city.garage.x, game.city.garage.y) < 130 * 130;
  }

  // Current tier the player owns for an upgrade kind (engine/armor/tires).
  tier(player, kind) {
    return player.upgrades[kind] || 0;
  }

  // Can this item be bought right now? Returns a reason string when not.
  canBuy(game, item) {
    const p = game.player;
    if (item.kind === 'clean') {
      if (p.wanted === 0) return 'No wanted stars to clear';
    } else if (this.tier(p, item.kind) >= item.tier) {
      return 'Already owned';
    } else if (this.tier(p, item.kind) !== item.tier - 1) {
      return 'Buy the lower tier first';
    }
    if (p.respect < item.needRespect) return `Needs Respect ${item.needRespect}`;
    if (p.cash < item.price) return `Need $${item.price}`;
    return null;
  }

  buy(game, itemId) {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return false;
    const blocked = this.canBuy(game, item);
    if (blocked) {
      game.banner('Garage', blocked, 2);
      return false;
    }
    const p = game.player;
    p.cash -= item.price;
    if (item.kind === 'clean') {
      p.wanted = Math.max(0, p.wanted - 1);
      p.wantedHeat = p.wanted > 0 ? 1 : 0;
      p.unseenTimer = 0;
      game.banner('Clean Record', 'Rosa made a call. One star off the board.', 3);
    } else {
      p.upgrades[item.kind] = item.tier;
      if (item.kind === 'armor') p.carHealth = p.carHealthMax();
      game.banner('Upgrade installed!', `${item.name} — ${item.desc}.`, 3);
    }
    game.sound.coin();
    game.save();
    return true;
  }
}
