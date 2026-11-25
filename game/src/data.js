// Dapur Purnama data: every ingredient and recipe the kitchen knows.
// A recipe is a base (nasi or mie) plus add-ins. Choppable add-ins must
// visit the cutting board before the wok; telur goes straight in.
export const INGREDIENTS = {
  nasi:  { name: 'Nasi',   short: 'Nasi',  color: '#f5efe0', dark: '#d8cdb2', chop: false, key: '1', blurb: 'steamed rice' },
  mie:   { name: 'Mie',    short: 'Mie',   color: '#f2c14e', dark: '#c98f1f', chop: false, key: '2', blurb: 'egg noodles' },
  ayam:  { name: 'Ayam',   short: 'Ayam',  color: '#e07840', dark: '#a34d1e', chop: true,  key: '3', blurb: 'chicken' },
  telur: { name: 'Telur',  short: 'Telur', color: '#fff3c4', dark: '#e0a92e', chop: false, key: '4', blurb: 'egg' },
  sayur: { name: 'Sayur',  short: 'Sayur', color: '#58b368', dark: '#2f7d3d', chop: true,  key: '5', blurb: 'greens' },
  cabai: { name: 'Cabai',  short: 'Cabai', color: '#d63a2f', dark: '#8f1d15', chop: true,  key: '6', blurb: 'chilli' },
};

export const INGREDIENT_ORDER = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'cabai'];

// Recipes, in the order they unlock as the shift heats up.
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', base: 'nasi', adds: ['telur', 'cabai'], price: 22, cook: 4.0, unlock: 0,
    desc: 'Wok-fried rice, egg, chilli' },
  { id: 'mie-ayam', name: 'Mie Ayam', base: 'mie', adds: ['ayam', 'sayur'], price: 26, cook: 4.5, unlock: 0,
    desc: 'Noodles, chicken, greens' },
  { id: 'soto-ayam', name: 'Soto Ayam', base: 'ayam', adds: ['telur', 'sayur'], price: 30, cook: 5.5, unlock: 2,
    desc: 'Golden chicken soup' },
  { id: 'ayam-geprek', name: 'Ayam Geprek', base: 'nasi', adds: ['ayam', 'cabai'], price: 28, cook: 5.0, unlock: 3,
    desc: 'Smashed chilli chicken, rice' },
  { id: 'mie-goreng', name: 'Mie Goreng Spesial', base: 'mie', adds: ['telur', 'sayur', 'cabai'], price: 34, cook: 6.0, unlock: 4,
    desc: 'Special fried noodles' },
];

export const SHIFT_SECONDS = 150;
export const MAX_TICKETS = 4;

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

// Match a finished wok dish (base + add-ins) against the menu.
// Returns the recipe, or null for a nameless mix.
export function matchRecipe(base, adds) {
  const sorted = [...adds].sort();
  for (const r of RECIPES) {
    if (r.base !== base) continue;
    if (r.adds.length !== sorted.length) continue;
    if ([...r.adds].sort().every((a, i) => a === sorted[i])) return r;
  }
  return null;
}

// Ticket patience shrinks as the shift goes on, so the rush builds
// without adding new chores: same stations, less slack.
export function ticketPatienceSeconds(servedCount) {
  return Math.max(34, 62 - servedCount * 2.5);
}

export function spawnIntervalSeconds(servedCount) {
  return Math.max(7, 13 - servedCount * 0.55);
}
