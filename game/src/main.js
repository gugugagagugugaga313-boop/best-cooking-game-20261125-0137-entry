// Dapur Purnama — game loop and state machine.
// Title → playing → paused / over. The shift timer runs only while
// playing; orders, the wok and the cook all tick from one clock.
import { SHIFT_SECONDS, INGREDIENT_ORDER } from './data.js';
import { makeRng } from './random.js';
import { createSoundboard } from './audio.js';
import { createInput } from './input.js';
import {
  createKitchen, movePlayer, interact, chopTick, wokTick,
  startCooking, servePlate, trashHands, stationNear, STATIONS,
} from './kitchen.js';
import { createOrderBoard, tickOrders, applyServe, spawnTicket } from './orders.js';
import { createParticles } from './particles.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const shot = params.get('shot');

const sound = createSoundboard();
const input = createInput(canvas);
const particles = createParticles();

const game = {
  phase: 'title',
  now: 0,
  shiftLeft: SHIFT_SECONDS,
  kitchen: createKitchen(),
  board: createOrderBoard(makeRng(seed)),
  lastTickSecond: -1,
  moveTarget: null,
  statusTimer: 0,
};
// Debug handle for play-testing (read-only state inspection).
window.__game = game;

function setStatus(msg) {
  statusEl.textContent = msg;
  game.statusTimer = 3;
}

function resetShift() {
  game.kitchen = createKitchen();
  game.board = createOrderBoard(makeRng(seed + Math.floor(Math.random() * 1000)));
  game.shiftLeft = SHIFT_SECONDS;
  game.phase = 'playing';
  game.moveTarget = null;
  spawnTicket(game.board);
  setStatus('Shift started. First ticket is up — grab a base!');
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 1280 * dpr;
  canvas.height = 720 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Screenshot mode: stage a fixed kitchen and hold it still.
if (shot) {
  resetShift();
  applyShot(game, shot);
  if (shot === 'end') game.phase = 'over';
}

function stationCenter(name) {
  const b = STATIONS[name];
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function handleEvent(tag) {
  const k = game.kitchen;
  const s = sound;
  switch (tag) {
    case 'grab': s.grab(); setStatus(`Grabbed ${k.hands.id}.`); break;
    case 'board-start': s.dropIn(); setStatus('On the board — hold E to chop.'); break;
    case 'wok-base': s.dropIn(); setStatus('Base in the wok. Add chopped bits, then cook.'); break;
    case 'wok-add': s.dropIn(); setStatus('Into the wok it goes.'); break;
    case 'wok-done': {
      s.ding();
      particles.sparkle(k.player.x, k.player.y - 50);
      setStatus(`${k.hands.dish.name} is ready — plate it!`);
      break;
    }
    case 'plated': s.ding(); setStatus('Plated. Take it to the serve window.'); break;
    case 'plate-pickup': s.grab(); setStatus('Plate in hand — serve it!'); break;
    case 'burnt': s.burn(); particles.smoke(k.player.x, k.player.y - 40); setStatus('Burnt! Press E at the wok to clear it.'); break;
    case 'wok-cleared': setStatus('Wok cleared. Start again.'); break;
    case 'too-early': s.wrong(); setStatus('Not ready yet — wait for the green zone.'); break;
    case 'needs-chop': s.wrong(); setStatus('That needs chopping first.'); break;
    case 'need-base': s.wrong(); setStatus('The wok wants a base first: nasi, mie or ayam.'); break;
    case 'no-chop': s.wrong(); setStatus('Nothing to chop there.'); break;
    case 'hands-full': s.wrong(); setStatus('Hands full — serve it or bin it (Q).'); break;
    case 'empty-hands': s.wrong(); setStatus('Your hands are empty.'); break;
    case 'need-dish': s.wrong(); setStatus('Bring a finished wok dish to plate.'); break;
    case 'plate-full': s.wrong(); setStatus('The plate is already full.'); break;
    case 'dish-in-hands': s.wrong(); setStatus('Plate the dish first.'); break;
    case 'nothing-to-serve': setStatus('Nothing to serve yet.'); break;
    case 'plate-first': s.wrong(); setStatus('Pick the plate up first (E at the counter).'); break;
    case 'cooking-start': s.startSizzle(); setStatus('Cooking! Watch the bar — green is perfect.'); break;
    default: break;
  }
}

function tryServe() {
  const k = game.kitchen;
  const outcome = servePlate(k, game.board.tickets);
  if (!outcome) return;
  const scored = applyServe(game.board, outcome);
  const at = stationCenter('serve');
  if (scored.ok) {
    sound.coin();
    sound.ding();
    particles.sparkle(at.x, at.y + 40);
    particles.floatText(at.x, at.y, `+${scored.coins}c${scored.tip ? ` (tip ${scored.tip})` : ''}${scored.comboBonus ? ` combo +${scored.comboBonus}` : ''}`);
    setStatus(`Served! +${scored.coins} coins. Combo x${game.board.combo}.`);
  } else {
    sound.wrong();
    particles.floatText(at.x, at.y, `+${scored.coins}c — wrong order`, '#ff9d94');
    setStatus('Wrong dish for every ticket — only a few coins for it.');
  }
}

function frame(t) {
  const now = t / 1000;
  const dt = Math.min(0.05, now - (game.now || now));
  game.now = now;
  const k = game.kitchen;

  if (game.statusTimer > 0) game.statusTimer -= dt;

  if (game.phase === 'playing') {
    game.shiftLeft -= dt;
    const sec = Math.ceil(game.shiftLeft);
    if (sec !== game.lastTickSecond) {
      game.lastTickSecond = sec;
      if (sec <= 10 && sec > 0) sound.tick();
      if (sec === 30) setStatus('Last 30 seconds — rush!');
    }
    if (game.shiftLeft <= 0) {
      game.shiftLeft = 0;
      game.phase = 'over';
      sound.stopSizzle();
      setStatus(`Shift over — ${game.board.coins} coins, ${game.board.served} dishes served.`);
    }

    const expired = tickOrders(game.board, dt);
    if (expired > 0) {
      sound.wrong();
      setStatus(`${expired} ticket${expired > 1 ? 's' : ''} walked out. The board is angry.`);
    }

    // Movement: keys win over a click target.
    let vec = input.moveVector();
    if (vec.x === 0 && vec.y === 0 && game.moveTarget) {
      const dx = game.moveTarget.x - k.player.x;
      const dy = game.moveTarget.y - k.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) game.moveTarget = null;
      else vec = { x: dx / d, y: dy / d };
    }
    movePlayer(k, vec, dt);

    // Clicks: on a station, act if close; elsewhere, walk there.
    const click = input.takeClick();
    if (click) {
      sound.unlock();
      let acted = false;
      for (const name of Object.keys(STATIONS)) {
        const b = STATIONS[name];
        if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
          if (stationNear(k, name, 90)) {
            if (name === 'serve' && (k.hands?.id === '__dish')) tryServe();
            else if (name === 'wok' && !k.wok.cooking && k.wok.base && !k.hands && !k.wok.burnt) {
              if (startCooking(k)) handleEvent('cooking-start');
            } else handleEvent(interact(k, game));
            acted = true;
          } else {
            game.moveTarget = { x: b.x + b.w / 2, y: b.y + b.h + 40 };
            acted = true;
          }
          break;
        }
      }
      if (!acted) game.moveTarget = click;
    }

    // Number keys grab a crate item from near the crates.
    const num = input.takeNumber();
    if (num && stationNear(k, 'crates', 90)) {
      const id = INGREDIENT_ORDER[Number(num) - 1];
      if (!k.hands && id) {
        k.hands = { id, chopped: false };
        handleEvent('grab');
      } else if (k.hands) handleEvent('hands-full');
    }

    if (input.takeTrash()) {
      if (trashHands(k)) setStatus('Binned. The floor thanks you.');
    }
    if (input.takeMute()) {
      const m = sound.toggleMute();
      setStatus(m ? 'Sound off.' : 'Sound on.');
    }
    if (input.takePause()) game.phase = 'paused';

    // E / Space: interact, or hold to chop.
    if (input.takeInteract()) {
      sound.unlock();
      if (k.board.item && stationNear(k, 'board', 60)) {
        // Holding E chops; a tap just starts the hold below.
      } else if (stationNear(k, 'serve', 90) && k.hands?.id === '__dish') {
        tryServe();
      } else if (stationNear(k, 'wok', 90) && !k.wok.cooking && k.wok.base && !k.hands && !k.wok.burnt) {
        if (startCooking(k)) handleEvent('cooking-start');
      } else {
        handleEvent(interact(k, game));
      }
    }
    const chop = chopTick(k, dt, input.holdingInteract());
    if (chop === 'chopped') {
      sound.chopped();
      particles.sparkle(k.player.x, k.player.y - 40, '#9fe8a9');
      setStatus('Chopped! Into the wok it goes.');
    } else if (chop === 'chopping' && Math.random() < dt * 6) {
      sound.chop();
    }

    const burnt = wokTick(k, dt);
    if (burnt === 'burnt') {
      handleEvent('burnt');
      sound.stopSizzle();
    }
    if (k.wok.cooking && Math.random() < dt * 2) {
      particles.steam(STATIONS.wok.x + 150, STATIONS.wok.y + 80, 1);
    }
  } else if (game.phase === 'title' || game.phase === 'over') {
    if (input.takeEnter() || input.takeClick()) {
      sound.unlock();
      resetShift();
    }
  } else if (game.phase === 'paused') {
    if (input.takePause() || input.takeEnter()) game.phase = 'playing';
  }

  particles.tick(dt);
  render(ctx, game);
  particles.draw(ctx);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
