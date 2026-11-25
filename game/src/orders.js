// Order tickets: spawn, patience, expiry, and serve scoring.
// The board never holds more than MAX_TICKETS; the rush comes from
// shorter patience and faster spawns, never from new chores.
import { RECIPES, MAX_TICKETS, ticketPatienceSeconds, spawnIntervalSeconds } from './data.js';
import { pick } from './random.js';

export function createOrderBoard(rng) {
  return {
    rng,
    tickets: [], // { recipeId, name, price, left, total }
    spawnIn: 1.2,
    served: 0,
    lost: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
  };
}

function unlockedRecipes(served) {
  return RECIPES.filter((r) => r.unlock <= served);
}

export function spawnTicket(board) {
  if (board.tickets.length >= MAX_TICKETS) return null;
  const pool = unlockedRecipes(board.served);
  const recipe = pick(board.rng, pool);
  const total = ticketPatienceSeconds(board.served);
  const ticket = { recipeId: recipe.id, name: recipe.name, price: recipe.price, left: total, total };
  board.tickets.push(ticket);
  return ticket;
}

export function tickOrders(board, dt) {
  board.spawnIn -= dt;
  if (board.spawnIn <= 0) {
    spawnTicket(board);
    board.spawnIn = spawnIntervalSeconds(board.served);
  }
  let expired = 0;
  for (let i = board.tickets.length - 1; i >= 0; i--) {
    const t = board.tickets[i];
    t.left -= dt;
    if (t.left <= 0) {
      board.tickets.splice(i, 1);
      board.lost += 1;
      board.combo = 0;
      expired += 1;
    }
  }
  return expired;
}

// Apply a serve outcome to the board: coins, combo, and the streak
// bonus that makes a clean run worth protecting.
export function applyServe(board, outcome) {
  if (!outcome) return null;
  if (outcome.ok) {
    board.served += 1;
    board.combo += 1;
    board.bestCombo = Math.max(board.bestCombo, board.combo);
    const comboBonus = board.combo >= 3 ? 4 : 0;
    const total = outcome.coins + comboBonus;
    board.coins += total;
    return { ...outcome, coins: total, comboBonus };
  }
  board.combo = 0;
  board.coins += outcome.coins;
  return outcome;
}

export function ticketUrgency(t) {
  const f = t.left / t.total;
  if (f < 0.25) return 'critical';
  if (f < 0.5) return 'hurry';
  return 'fresh';
}
