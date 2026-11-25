// All canvas drawing for Dapur Purnama: the moonlit kitchen, the
// order board, the stations, the food, the cook, and every overlay.
// Nothing here loads a file — every sprite is drawn from shapes.
import { INGREDIENTS, INGREDIENT_ORDER, RECIPES, recipeById } from './data.js';
import { STATIONS, crateBoxes, nearestStation } from './kitchen.js';
import { ticketUrgency } from './orders.js';

const W = 1280, H = 720;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

// One ingredient, drawn from shapes so it reads at a glance.
export function drawIngredient(ctx, id, x, y, s, chopped = false) {
  const ing = INGREDIENTS[id];
  if (!ing) return;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'nasi') {
    ctx.fillStyle = ing.color;
    ctx.beginPath(); ctx.ellipse(0, 2, s * 0.62, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.dark;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-s * 0.3 + i * s * 0.15, -s * 0.18, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'mie') {
    ctx.strokeStyle = ing.color; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, i * s * 0.22);
      ctx.bezierCurveTo(-s * 0.2, i * s * 0.22 - s * 0.25, s * 0.2, i * s * 0.22 + s * 0.25, s * 0.5, i * s * 0.22);
      ctx.stroke();
    }
  } else if (id === 'ayam') {
    ctx.fillStyle = chopped ? '#c96a2e' : ing.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.38, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5efe0';
    ctx.beginPath(); ctx.arc(s * 0.42, s * 0.3, s * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5efe0'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(s * 0.38, s * 0.22); ctx.lineTo(s * 0.55, s * 0.42); ctx.stroke();
    if (chopped) { ctx.strokeStyle = '#7a3c10'; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.2); ctx.lineTo(s * 0.2, s * 0.2); ctx.stroke(); }
  } else if (id === 'telur') {
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.58, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath(); ctx.arc(s * 0.08, 0, s * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(s * 0.08, 0, s * 0.17, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'sayur') {
    ctx.fillStyle = ing.color;
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate((i - 1) * 0.6);
      ctx.beginPath(); ctx.ellipse(0, -s * 0.28, s * 0.22, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = ing.dark; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(0, s * 0.1); ctx.lineTo(0, s * 0.5); ctx.stroke();
  } else if (id === 'cabai') {
    ctx.strokeStyle = ing.color; ctx.lineWidth = s * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.2); ctx.quadraticCurveTo(0, s * 0.45, s * 0.45, -s * 0.25); ctx.stroke();
    ctx.strokeStyle = ing.dark; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.25); ctx.lineTo(s * 0.62, -s * 0.45); ctx.stroke();
  }
  ctx.restore();
}

function drawDish(ctx, dish, x, y, s) {
  // A plated dish: white plate, then its base and add-ins on top.
  ctx.fillStyle = '#f8f4ea';
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.85, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8cdb2'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.68, s * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
  if (!dish) return;
  drawIngredient(ctx, dish.base, x - s * 0.18, y - s * 0.05, s * 0.55);
  dish.adds.slice(0, 3).forEach((a, i) => {
    drawIngredient(ctx, a, x + s * (0.1 + i * 0.28), y - s * 0.15 - i * s * 0.06, s * 0.4, true);
  });
}

function drawTicket(ctx, t, x, y, w, h, now) {
  const urgency = ticketUrgency(t);
  const bg = urgency === 'critical' ? '#fde3df' : urgency === 'hurry' ? '#fff4d6' : '#fffaf0';
  const edge = urgency === 'critical' ? '#d63a2f' : '#c9a86a';
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = urgency === 'critical' ? 3 : 2; ctx.stroke();
  const r = recipeById(t.recipeId);
  text(ctx, t.name, x + 12, y + 24, 19, '#2b1d12');
  text(ctx, `${r.base} + ${r.adds.join(' + ')}`, x + 12, y + 44, 13, '#6b543a');
  // Ingredient dots so the recipe reads without reading.
  [r.base, ...r.adds].forEach((id, i) => {
    drawIngredient(ctx, id, x + 26 + i * 32, y + 62, 12, true);
  });
  // Patience bar.
  const f = Math.max(0, t.left / t.total);
  ctx.fillStyle = '#e5d9c3';
  roundRect(ctx, x + 12, y + h - 14, w - 24, 8, 4); ctx.fill();
  ctx.fillStyle = urgency === 'critical' ? '#d63a2f' : urgency === 'hurry' ? '#e0a92e' : '#58b368';
  if (f > 0) { roundRect(ctx, x + 12, y + h - 14, (w - 24) * f, 8, 4); ctx.fill(); }
  text(ctx, `${Math.ceil(t.left)}s  •  ${t.price}c`, x + w - 12, y + 24, 15, urgency === 'critical' ? '#d63a2f' : '#6b543a', 'bold', 'right');
  if (urgency === 'critical') {
    const blink = Math.sin(now * 6) > 0 ? 1 : 0.35;
    ctx.globalAlpha = blink;
    text(ctx, 'HURRY!', x + w - 12, y + 44, 13, '#d63a2f', 'bold', 'right');
    ctx.globalAlpha = 1;
  }
}

function drawStationBase(ctx, box, label, near, flash, accent) {
  ctx.fillStyle = '#e8dcc4';
  roundRect(ctx, box.x, box.y, box.w, box.h, 12); ctx.fill();
  ctx.fillStyle = '#c9a86a';
  roundRect(ctx, box.x, box.y, box.w, 26, 12); ctx.fill();
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(box.x, box.y + 14, box.w, 12);
  text(ctx, label, box.x + box.w / 2, box.y + 19, 13, '#2b1d12', 'bold', 'center');
  ctx.strokeStyle = near ? '#ffd76a' : '#a98f66';
  ctx.lineWidth = near ? 4 : 2;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12); ctx.stroke();
  if (flash) {
    ctx.strokeStyle = accent || '#ffd76a';
    ctx.lineWidth = 5;
    roundRect(ctx, box.x - 3, box.y - 3, box.w + 6, box.h + 6, 14); ctx.stroke();
  }
}

function drawCook(ctx, p, hands, now) {
  const bob = p.moving ? Math.sin(p.walkPhase) * 3 : Math.sin(now * 2) * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 22, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body + apron.
  ctx.fillStyle = '#f2ede4';
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3f7d8c';
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.quadraticCurveTo(0, 30, 16, 4); ctx.lineTo(12, 20); ctx.lineTo(-12, 20); ctx.closePath(); ctx.fill();
  // Face.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(p.face * 4, -8, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241a12';
  ctx.beginPath(); ctx.arc(p.face * 4 + (p.face > 0 ? 4 : -4), -9, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.face * 4 + (p.face > 0 ? -4 : 4), -9, 1.8, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-7, -20, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -24, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -20, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -22, 26, 6);
  // Carried item, held high so it reads in screenshots.
  if (hands) {
    ctx.fillStyle = 'rgba(255,215,106,0.9)';
    ctx.beginPath(); ctx.arc(0, -46, 17, 0, Math.PI * 2); ctx.fill();
    if (hands.id === '__dish' && hands.dish) {
      drawDish(ctx, hands.dish, 0, -46, 20);
    } else {
      drawIngredient(ctx, hands.id, 0, -46, 15, hands.chopped);
      if (hands.chopped) text(ctx, '✓', 12, -58, 14, '#2f7d3d', 'bold');
    }
  }
  ctx.restore();
}

export function render(ctx, game) {
  const { kitchen: k, board, now } = game;
  const nearName = game.phase === 'playing' ? nearestStation(k) : null;

  // Wall and moonlit window.
  ctx.fillStyle = '#14424a';
  ctx.fillRect(0, 0, W, 206);
  ctx.fillStyle = '#0e2f35';
  ctx.fillRect(0, 196, W, 10);
  ctx.fillStyle = '#1d5a66';
  roundRect(ctx, 1060, 18, 190, 74, 10); ctx.fill();
  ctx.fillStyle = '#f7e8b0';
  ctx.beginPath(); ctx.arc(1120, 52, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e2f35';
  ctx.beginPath(); ctx.arc(1130, 46, 20, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'DAPUR PURNAMA', 28, 52, 34, '#f7e8b0');
  text(ctx, 'moonlit warung kitchen  •  WASD move  •  E interact  •  Q bin it', 28, 80, 14, '#9fc3c9');
  // Hanging lamps, kept clear of the title and the timer.
  for (const lx of [470, 810]) {
    ctx.strokeStyle = '#0e2f35'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 22); ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,106,0.18)';
    ctx.beginPath(); ctx.arc(lx, 32, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(lx, 32, 10, 0, Math.PI * 2); ctx.fill();
  }

  // Shift timer, big enough to feel.
  const mins = Math.floor(Math.max(0, game.shiftLeft) / 60);
  const secs = Math.floor(Math.max(0, game.shiftLeft) % 60);
  const lowTime = game.shiftLeft <= 30 && game.phase === 'playing';
  const timerColor = lowTime ? (Math.sin(now * 6) > 0 ? '#ff6b5e' : '#ffd76a') : '#ffffff';
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 640, 62, 44, timerColor, 'bold', 'center');
  text(ctx, lowTime ? 'LAST ORDERS — RUSH!' : 'SHIFT TIMER', 640, 86, 13, lowTime ? '#ff9d94' : '#9fc3c9', 'bold', 'center');
  text(ctx, `🪙 ${board.coins}`, 1000, 56, 28, '#ffd76a', 'bold', 'right');
  text(ctx, `served ${board.served}  •  combo x${board.combo}  •  lost ${board.lost}`, 1000, 82, 14, '#9fc3c9', 'bold', 'right');

  // Order board: tickets in a row.
  text(ctx, 'ORDER BOARD', 28, 128, 15, '#f7e8b0', 'bold');
  if (board.tickets.length === 0) {
    ctx.fillStyle = 'rgba(255,250,240,0.75)';
    roundRect(ctx, 28, 138, 300, 56, 10); ctx.fill();
    text(ctx, 'No orders — crates are full,', 42, 162, 14, '#6b543a');
    text(ctx, 'the next ticket is coming…', 42, 182, 14, '#6b543a');
  }
  board.tickets.forEach((t, i) => {
    drawTicket(ctx, t, 28 + i * 312, 132, 296, 92, now);
  });
  text(ctx, `next ticket in ${Math.max(0, Math.ceil(board.spawnIn))}s`, 1240, 122, 13, '#9fc3c9', 'bold', 'right');

  // Floor.
  ctx.fillStyle = '#a4713f';
  ctx.fillRect(0, 206, W, H - 206);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let y = 246; y < H; y += 62) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 124) { ctx.beginPath(); ctx.moveTo(x, 206); ctx.lineTo(x, H); ctx.stroke(); }

  const flashFor = (name) => (k.flash && k.flash.station === name && now < k.flash.until ? k.flash : null);

  // Crates.
  const cb = STATIONS.crates;
  drawStationBase(ctx, cb, cb.label, nearName === 'crates', flashFor('crates'));
  crateBoxes().forEach((box) => {
    const ing = INGREDIENTS[box.id];
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8); ctx.fill();
    ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2; ctx.stroke();
    drawIngredient(ctx, box.id, box.x + box.w / 2, box.y + 30, 22);
    text(ctx, ing.name, box.x + box.w / 2, box.y + 62, 14, '#2b1d12', 'bold', 'center');
    ctx.fillStyle = '#3f7d8c';
    roundRect(ctx, box.x + 4, box.y + 4, 18, 18, 5); ctx.fill();
    text(ctx, ing.key, box.x + 13, box.y + 18, 12, '#ffffff', 'bold', 'center');
  });

  // Chopping board.
  const bd = STATIONS.board;
  drawStationBase(ctx, bd, bd.label, nearName === 'board', flashFor('board'));
  ctx.fillStyle = '#8a5a2e';
  roundRect(ctx, bd.x + 30, bd.y + 46, 160, 90, 8); ctx.fill();
  ctx.fillStyle = '#d9b078';
  roundRect(ctx, bd.x + 38, bd.y + 54, 144, 74, 6); ctx.fill();
  if (k.board.item) {
    drawIngredient(ctx, k.board.item.id, bd.x + 110, bd.y + 92, 30, false);
    ctx.fillStyle = '#e5d9c3';
    roundRect(ctx, bd.x + 30, bd.y + 142, 160, 12, 6); ctx.fill();
    ctx.fillStyle = '#58b368';
    roundRect(ctx, bd.x + 30, bd.y + 142, 160 * k.board.progress, 12, 6); ctx.fill();
    text(ctx, 'CHOPPING… hold E', bd.x + 110, bd.y + 42, 12, '#2b1d12', 'bold', 'center');
  } else {
    text(ctx, 'bring ayam / sayur / cabai', bd.x + 110, bd.y + 96, 13, '#6b543a', 'bold', 'center');
    text(ctx, 'hold E to chop', bd.x + 110, bd.y + 116, 13, '#6b543a', 'bold', 'center');
  }

  // Wok stove.
  const wk = STATIONS.wok;
  drawStationBase(ctx, wk, wk.label, nearName === 'wok', flashFor('wok'));
  const flame = k.wok.cooking ? 0.7 + Math.sin(now * 12) * 0.3 : 0.25;
  ctx.fillStyle = `rgba(255, ${Math.floor(120 + flame * 80)}, 40, ${0.5 + flame * 0.4})`;
  ctx.beginPath(); ctx.ellipse(wk.x + 150, wk.y + 150, 70, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath(); ctx.ellipse(wk.x + 150, wk.y + 118, 92, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#232323';
  ctx.beginPath(); ctx.ellipse(wk.x + 150, wk.y + 110, 78, 42, 0, 0, Math.PI * 2); ctx.fill();
  if (k.wok.burnt) {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(wk.x + 150, wk.y + 110, 60, 30, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'BURNT!  E to clear', wk.x + 150, wk.y + 78, 14, '#ff6b5e', 'bold', 'center');
  } else if (k.wok.base) {
    drawIngredient(ctx, k.wok.base, wk.x + 128, wk.y + 106, 26);
    k.wok.adds.forEach((a, i) => drawIngredient(ctx, a, wk.x + 150 + i * 26, wk.y + 118, 20, true));
    if (k.wok.cooking) {
      const p = Math.min(1, k.wok.progress);
      ctx.fillStyle = '#e5d9c3';
      roundRect(ctx, wk.x + 40, wk.y + 168, 220, 14, 7); ctx.fill();
      ctx.fillStyle = '#58b368';
      roundRect(ctx, wk.x + 40, wk.y + 168, 220 * 0.72, 14, 7); ctx.fill();
      ctx.fillStyle = '#e0a92e';
      ctx.fillRect(wk.x + 40 + 220 * 0.72, wk.y + 168, 220 * 0.28, 14);
      ctx.fillStyle = '#d63a2f';
      ctx.fillRect(wk.x + 40 + 220 * p, wk.y + 164, 4, 22);
      text(ctx, p >= 0.72 ? 'READY — E to take it out!' : 'cooking…', wk.x + 150, wk.y + 156, 13, p >= 0.72 ? '#2f7d3d' : '#6b543a', 'bold', 'center');
    } else {
      text(ctx, 'E — start cooking', wk.x + 150, wk.y + 176, 13, '#2b1d12', 'bold', 'center');
    }
  } else {
    text(ctx, 'base first: nasi / mie / ayam', wk.x + 150, wk.y + 112, 13, '#6b543a', 'bold', 'center');
    text(ctx, 'then chopped adds + telur', wk.x + 150, wk.y + 134, 13, '#6b543a', 'bold', 'center');
  }

  // Plating counter.
  const pl = STATIONS.plates;
  drawStationBase(ctx, pl, pl.label, nearName === 'plates', flashFor('plates'));
  ctx.fillStyle = '#f8f4ea';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(pl.x + 52, pl.y + 130 - i * 7, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d8cdb2'; ctx.stroke();
  }
  if (k.plate.dish) {
    drawDish(ctx, k.plate.dish, pl.x + 140, pl.y + 108, 44);
    const match = board.tickets.some((t) => t.recipeId === k.plate.dish.recipe);
    text(ctx, k.plate.dish.name, pl.x + 140, pl.y + 158, 15, '#2b1d12', 'bold', 'center');
    if (match && k.plate.dish.recipe) {
      const glow = 0.6 + Math.sin(now * 5) * 0.4;
      ctx.globalAlpha = glow;
      text(ctx, '★ READY TO SERVE ★', pl.x + 140, pl.y + 62, 14, '#2f7d3d', 'bold', 'center');
      ctx.globalAlpha = 1;
    } else if (!k.plate.dish.recipe) {
      text(ctx, 'mystery mix — serves for little', pl.x + 140, pl.y + 62, 12, '#8f6b2f', 'bold', 'center');
    }
  } else {
    text(ctx, 'bring a wok dish', pl.x + 140, pl.y + 100, 12, '#6b543a', 'bold', 'center');
    text(ctx, 'E to plate it', pl.x + 140, pl.y + 120, 12, '#6b543a', 'bold', 'center');
  }

  // Serve window.
  const sv = STATIONS.serve;
  drawStationBase(ctx, sv, sv.label, nearName === 'serve', flashFor('serve'), '#2f7d3d');
  ctx.fillStyle = '#7a4a21';
  ctx.fillRect(sv.x + 14, sv.y + 40, sv.w - 28, 90);
  ctx.fillStyle = '#f7e8b0';
  ctx.fillRect(sv.x + 22, sv.y + 48, sv.w - 44, 74);
  ctx.fillStyle = '#d63a2f';
  ctx.beginPath(); ctx.arc(sv.x + sv.w / 2, sv.y + 150, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8f1d15';
  ctx.fillRect(sv.x + sv.w / 2 - 3, sv.y + 138, 6, 8);
  text(ctx, 'RING THE BELL', sv.x + sv.w / 2, sv.y + 186, 12, '#2b1d12', 'bold', 'center');
  text(ctx, 'serve for coins', sv.x + sv.w / 2, sv.y + 204, 12, '#6b543a', 'bold', 'center');
  text(ctx, '+ tip', sv.x + sv.w / 2, sv.y + 222, 12, '#6b543a', 'bold', 'center');

  // The cook.
  drawCook(ctx, k.player, k.hands, now);

  // Context prompt, bottom centre.
  if (game.phase === 'playing' && nearName) {
    const prompts = {
      crates: 'E — grab an ingredient  •  or press 1–6',
      board: k.board.item ? 'hold E — chop!' : 'E — put a choppable ingredient on the board',
      wok: k.wok.cooking ? 'wait for the green zone, then E' : k.wok.base ? 'E — start cooking' : 'E — add a base (nasi / mie / ayam)',
      plates: k.plate.dish ? 'E — pick the plate up' : 'E — plate the wok dish',
      serve: 'E — serve what you carry',
    };
    const msg = prompts[nearName] || '';
    ctx.fillStyle = 'rgba(36,26,18,0.85)';
    const wpx = ctx.measureText(msg).width + 36;
    roundRect(ctx, (W - 420) / 2, 668, 420, 34, 17); ctx.fill();
    text(ctx, msg, W / 2, 691, 15, '#ffd76a', 'bold', 'center');
  }

  // Title / pause / game-over overlays.
  if (game.phase === 'title') {
    ctx.fillStyle = 'rgba(20,14,8,0.72)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'DAPUR PURNAMA', W / 2, 250, 64, '#f7e8b0', 'bold', 'center');
    text(ctx, 'A moonlit warung kitchen. The tickets keep coming —', W / 2, 300, 22, '#ffffff', 'bold', 'center');
    text(ctx, 'chop it, wok it, plate it, serve it before the timer dies.', W / 2, 332, 22, '#ffffff', 'bold', 'center');
    text(ctx, 'WASD / arrows — walk    •    E — use a station (hold E to chop)', W / 2, 386, 18, '#ffd76a', 'bold', 'center');
    text(ctx, '1–6 — grab a crate item    •    Q — bin it    •    P — pause', W / 2, 414, 18, '#ffd76a', 'bold', 'center');
    const pulse = 0.7 + Math.sin(now * 4) * 0.3;
    ctx.globalAlpha = pulse;
    text(ctx, 'Press ENTER or click to start the shift', W / 2, 480, 24, '#ffffff', 'bold', 'center');
    ctx.globalAlpha = 1;
    text(ctx, '5 recipes unlock as you serve  •  combos pay extra  •  burnt food pays nothing', W / 2, 520, 15, '#9fc3c9', 'bold', 'center');
  }

  if (game.phase === 'paused') {
    ctx.fillStyle = 'rgba(20,14,8,0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, 350, 54, '#ffffff', 'bold', 'center');
    text(ctx, 'Press P to get back to the stoves', W / 2, 400, 20, '#ffd76a', 'bold', 'center');
  }

  if (game.phase === 'over') {
    ctx.fillStyle = 'rgba(20,14,8,0.78)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'SHIFT OVER', W / 2, 240, 58, '#f7e8b0', 'bold', 'center');
    const stars = board.served >= 10 ? 3 : board.served >= 7 ? 2 : board.served >= 4 ? 1 : 0;
    text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), W / 2, 300, 44, '#ffd76a', 'bold', 'center');
    text(ctx, `Coins earned: ${board.coins}`, W / 2, 360, 28, '#ffffff', 'bold', 'center');
    text(ctx, `Dishes served: ${board.served}    •    Tickets lost: ${board.lost}    •    Best combo: x${board.bestCombo}`, W / 2, 400, 20, '#ffffff', 'bold', 'center');
    text(ctx, 'The warung closes — but the moon will be back tomorrow night.', W / 2, 440, 18, '#9fc3c9', 'bold', 'center');
    const pulse = 0.7 + Math.sin(now * 4) * 0.3;
    ctx.globalAlpha = pulse;
    text(ctx, 'Press ENTER to work another shift', W / 2, 500, 22, '#ffd76a', 'bold', 'center');
    ctx.globalAlpha = 1;
  }
}
