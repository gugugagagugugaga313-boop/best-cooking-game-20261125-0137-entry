// Keyboard and mouse input: WASD/arrows to walk, E (or Space, or a
// click on a station) to interact, number keys to grab a crate's
// ingredient from anywhere near the crates, Q to bin what you hold.
//
// Taps are edge-triggered: a keydown lands in a `pressed` queue the
// game loop consumes, so a quick tap can never fall between two
// frames and vanish. Held state (walking, holding E to chop) still
// reads the live `keys` set.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let click = null; // {x, y} in canvas pixels, consumed by the game loop

  function key(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.type === 'keydown') {
      keys.add(k);
      if (!e.repeat) pressed.add(k);
    } else {
      keys.delete(k);
    }
  }

  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    click = {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  });

  function takePressed(k) {
    if (pressed.has(k)) { pressed.delete(k); return true; }
    return false;
  }

  return {
    moveVector() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x && y) { x *= 0.7071; y *= 0.7071; }
      return { x, y };
    },
    takeInteract() {
      return takePressed('e') || takePressed(' ');
    },
    holdingInteract() { return keys.has('e') || keys.has(' '); },
    takeClick() {
      const c = click;
      click = null;
      return c;
    },
    takeNumber() {
      for (const n of ['1', '2', '3', '4', '5', '6']) {
        if (takePressed(n)) return n;
      }
      return null;
    },
    takeTrash() { return takePressed('q'); },
    takePause() { return takePressed('p'); },
    takeMute() { return takePressed('m'); },
    takeEnter() { return takePressed('enter'); },
  };
}
