// The kitchen itself: station layout, the cook's movement, what the
// cook carries, and the chop / wok / plate state machines.
import { INGREDIENTS, INGREDIENT_ORDER, matchRecipe } from './data.js';

export const FLOOR = { x: 16, y: 206, w: 1248, h: 500 };

export const STATIONS = {
  crates: { x: 28, y: 226, w: 190, h: 300, label: 'INGREDIENT CRATES' },
  board: { x: 258, y: 300, w: 220, h: 170, label: 'CHOPPING BOARD' },
  wok: { x: 540, y: 290, w: 300, h: 200, label: 'WOK STOVE' },
  plates: { x: 892, y: 300, w: 200, h: 170, label: 'PLATING COUNTER' },
  serve: { x: 1130, y: 250, w: 118, h: 260, label: 'SERVE WINDOW' },
};

// Crate hit-boxes: two columns of three inside the crates station.
export function crateBoxes() {
  const boxes = [];
  INGREDIENT_ORDER.forEach((id, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    boxes.push({
      id,
      x: STATIONS.crates.x + 10 + col * 92,
      y: STATIONS.crates.y + 34 + row * 88,
      w: 82, h: 76,
    });
  });
  return boxes;
}

export function createKitchen() {
  return {
    player: { x: 640, y: 620, r: 24, face: 1, moving: false, walkPhase: 0 },
    hands: null, // { id, chopped } or null
    board: { item: null, progress: 0 }, // item being chopped
    wok: { base: null, adds: [], cooking: false, progress: 0, cookTime: 5, burnt: false },
    plate: { dish: null }, // { recipe|null, name, base, adds } once plated
    flash: null, // {station, until} highlight pulse after an action
  };
}

function near(px, py, box, pad) {
  return px > box.x - pad && px < box.x + box.w + pad &&
    py > box.y - pad && py < box.y + box.h + pad;
}

export function stationNear(kitchen, name, pad = 46) {
  const p = kitchen.player;
  return near(p.x, p.y, STATIONS[name], pad);
}

export function nearestStation(kitchen) {
  const p = kitchen.player;
  let best = null, bestD = 1e9;
  for (const name of Object.keys(STATIONS)) {
    const b = STATIONS[name];
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < bestD) { bestD = d; best = name; }
  }
  return bestD < 90 ? best : null;
}

export function movePlayer(kitchen, vec, dt) {
  const p = kitchen.player;
  const speed = 265;
  const nx = p.x + vec.x * speed * dt;
  const ny = p.y + vec.y * speed * dt;
  p.moving = vec.x !== 0 || vec.y !== 0;
  if (p.moving) {
    if (vec.x !== 0) p.face = vec.x > 0 ? 1 : -1;
    p.walkPhase += dt * 10;
  }
  // Stay on the floor, and slide around the big stations.
  const clampedX = Math.max(FLOOR.x + p.r, Math.min(FLOOR.x + FLOOR.w - p.r, nx));
  const clampedY = Math.max(FLOOR.y + p.r, Math.min(FLOOR.y + FLOOR.h - p.r, ny));
  let blocked = false;
  for (const name of ['crates', 'board', 'wok', 'plates', 'serve']) {
    const b = STATIONS[name];
    if (clampedX > b.x - p.r + 6 && clampedX < b.x + b.w + p.r - 6 &&
        clampedY > b.y - p.r + 6 && clampedY < b.y + b.h + p.r - 6) { blocked = true; break; }
  }
  if (!blocked) { p.x = clampedX; p.y = clampedY; }
  return p;
}

// One interaction press at the station the cook is nearest to.
// Returns a short event tag the game loop turns into sound / text.
export function interact(kitchen, game) {
  const station = nearestStation(kitchen);
  if (!station) return null;
  kitchen.flash = { station, until: game.now + 0.35 };

  if (station === 'crates') {
    if (kitchen.hands) return 'hands-full';
    const box = crateBoxes().find((b) => near(kitchen.player.x, kitchen.player.y, b, 70));
    if (!box) return 'too-far';
    kitchen.hands = { id: box.id, chopped: false };
    return 'grab';
  }

  if (station === 'board') {
    if (kitchen.board.item) return 'board-busy';
    const h = kitchen.hands;
    if (!h) return 'empty-hands';
    if (!INGREDIENTS[h.id].chop || h.chopped) return 'no-chop';
    kitchen.board.item = h;
    kitchen.board.progress = 0;
    kitchen.hands = null;
    return 'board-start';
  }

  if (station === 'wok') {
    const w = kitchen.wok;
    if (w.burnt) { w.burnt = false; w.base = null; w.adds = []; w.progress = 0; w.cooking = false; return 'wok-cleared'; }
    if (w.cooking) {
      // Take the dish out: golden window scores, overdone burns.
      if (w.progress >= 1) { w.burnt = true; w.cooking = false; return 'burnt'; }
      if (w.progress >= 0.72) {
        kitchen.hands = { id: '__dish', chopped: false, dish: finishWok(w) };
        w.base = null; w.adds = []; w.progress = 0; w.cooking = false;
        return 'wok-done';
      }
      return 'too-early';
    }
    const h = kitchen.hands;
    if (!h) return 'empty-hands';
    if (h.id === '__dish') return 'dish-in-hands';
    if (!w.base) {
      if (h.id !== 'nasi' && h.id !== 'mie' && h.id !== 'ayam') return 'need-base';
      w.base = h.id;
      w.cookTime = 4 + w.adds.length;
      kitchen.hands = null;
      return 'wok-base';
    }
    if (h.chopped || !INGREDIENTS[h.id].chop) {
      w.adds.push(h.id);
      kitchen.hands = null;
      return 'wok-add';
    }
    return 'needs-chop';
  }

  if (station === 'plates') {
    const h = kitchen.hands;
    // Pick a plated dish up to carry it to the window.
    if (kitchen.plate.dish && !h) {
      kitchen.hands = { id: '__dish', chopped: false, dish: kitchen.plate.dish };
      kitchen.plate.dish = null;
      return 'plate-pickup';
    }
    if (kitchen.plate.dish) return 'plate-full';
    if (!h || h.id !== '__dish') return 'need-dish';
    kitchen.plate.dish = h.dish;
    kitchen.hands = null;
    return 'plated';
  }

  if (station === 'serve') {
    // Serving itself is handled by the game loop (tryServe), which
    // takes the dish from the cook's hands. Reaching here means the
    // cook arrived empty-handed or still needs to fetch the plate.
    if (kitchen.plate.dish) return 'plate-first';
    return 'nothing-to-serve';
  }
  return null;
}

// Hold-to-chop: call every frame while the player holds interact near
// the board. Returns 'chopped' the frame it finishes.
export function chopTick(kitchen, dt, holding) {
  const b = kitchen.board;
  if (!b.item) return null;
  if (!holding || !stationNear(kitchen, 'board', 60)) return null;
  b.progress += dt / 1.1;
  if (b.progress >= 1) {
    const done = { id: b.item.id, chopped: true };
    b.item = null;
    b.progress = 0;
    kitchen.hands = done;
    return 'chopped';
  }
  return 'chopping';
}

// Wok cooking advances on its own once started; overcook burns it.
export function wokTick(kitchen, dt) {
  const w = kitchen.wok;
  if (!w.cooking || w.burnt) return null;
  w.progress += dt / w.cookTime;
  if (w.progress >= 1.25) {
    w.burnt = true;
    w.cooking = false;
    return 'burnt';
  }
  return null;
}

export function startCooking(kitchen) {
  const w = kitchen.wok;
  if (w.base && !w.cooking && !w.burnt) {
    w.cooking = true;
    w.progress = 0;
    const base = w.base;
    w.cookTime = base === 'ayam' ? 5.5 : 4 + w.adds.length * 0.7;
    return true;
  }
  return false;
}

function finishWok(w) {
  const recipe = matchRecipe(w.base, w.adds);
  return {
    recipe: recipe ? recipe.id : null,
    name: recipe ? recipe.name : 'Campuran Aneh',
    price: recipe ? recipe.price : 8,
    base: w.base,
    adds: [...w.adds],
  };
}

// Serve the dish the cook carries (or, failing that, the one still
// sitting on the plating counter): returns the outcome for scoring.
export function servePlate(kitchen, tickets) {
  let dish = null;
  if (kitchen.hands && kitchen.hands.id === '__dish') {
    dish = kitchen.hands.dish;
    kitchen.hands = null;
  } else if (kitchen.plate.dish) {
    dish = kitchen.plate.dish;
    kitchen.plate.dish = null;
  }
  if (!dish) return null;
  const idx = tickets.findIndex((t) => t.recipeId === dish.recipe);
  if (idx >= 0) {
    const t = tickets[idx];
    tickets.splice(idx, 1);
    const tip = Math.round((t.left / t.total) * 8);
    return { ok: true, ticket: t, coins: dish.price + tip, tip };
  }
  // Wrong dish: a regular pays a little, a mystery mix pays almost nothing.
  return { ok: false, coins: dish.recipe ? 5 : 2, tip: 0 };
}

export function trashHands(kitchen) {
  if (!kitchen.hands) return false;
  kitchen.hands = null;
  return true;
}
