// Deterministic screenshot states: ?shot=start|play|serve|end stages
// the kitchen so each required beat is visible at a glance — the
// cover shows the board and a dish mid-assembly, the others show the
// crates, a plate ready under a low timer, and the end of a shift.
import { recipeById } from './data.js';

function ticket(recipeId, left, total) {
  const r = recipeById(recipeId);
  return { recipeId, name: r.name, price: r.price, left, total };
}

export function applyShot(game, name) {
  const k = game.kitchen;
  const b = game.board;
  if (name === 'start') {
    // Playing, not the title overlay: the crates and the board must
    // read at full brightness in this shot.
    game.phase = 'playing';
    b.tickets = [ticket('nasi-goreng', 52, 62), ticket('mie-ayam', 44, 62)];
    b.spawnIn = 9;
    game.shiftLeft = 150;
    k.player.x = 640; k.player.y = 600;
    return;
  }
  if (name === 'play') {
    game.phase = 'playing';
    game.shiftLeft = 96;
    b.coins = 46; b.served = 3; b.combo = 2; b.bestCombo = 2;
    b.tickets = [
      ticket('nasi-goreng', 38, 62),
      ticket('mie-ayam', 24, 58),
      ticket('soto-ayam', 50, 55),
    ];
    b.spawnIn = 6;
    k.wok.base = 'mie';
    k.wok.adds = ['ayam', 'sayur'];
    k.wok.cooking = true;
    k.wok.cookTime = 5.4;
    k.wok.progress = 0.55;
    k.board.item = { id: 'cabai', chopped: false };
    k.board.progress = 0.5;
    k.hands = { id: 'telur', chopped: false };
    k.player.x = 560; k.player.y = 540;
    return;
  }
  if (name === 'serve') {
    game.phase = 'playing';
    game.shiftLeft = 18;
    b.coins = 84; b.served = 5; b.combo = 3; b.bestCombo = 4;
    b.tickets = [
      ticket('mie-ayam', 6, 55),
      ticket('nasi-goreng', 20, 58),
      ticket('ayam-geprek', 33, 52),
      ticket('mie-goreng', 47, 50),
    ];
    b.spawnIn = 4;
    k.hands = {
      id: '__dish', chopped: false,
      dish: { recipe: 'mie-ayam', name: 'Mie Ayam', price: 26, base: 'mie', adds: ['ayam', 'sayur'] },
    };
    k.player.x = 1090; k.player.y = 400;
    k.flash = { station: 'serve', until: 9999 };
    return;
  }
  if (name === 'end') {
    game.phase = 'over';
    game.shiftLeft = 0;
    b.coins = 132; b.served = 9; b.lost = 2; b.bestCombo = 5;
    b.tickets = [ticket('nasi-goreng', 12, 50)];
    return;
  }
}
