// Keyboard and mouse, read into one small surface the loop asks every frame: the walking
// direction, the buttons held, and a queue of presses and clicks (in stage coordinates).

export const KEY_USE = 'use';
export const KEY_TOSS = 'toss';
export const KEY_PAUSE = 'pause';
export const KEY_MUTE = 'mute';
export const KEY_CONFIRM = 'confirm';
export const KEY_CRATE = 'crate';

const MOVES = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

/** `toStage(clientX, clientY)` maps a pointer position to the 1280x720 stage. */
export function createInput(canvas, toStage) {
  const down = new Set();
  const presses = [];
  const pointer = { x: 0, y: 0, down: false, inside: false };

  window.addEventListener('keydown', (e) => {
    if (MOVES[e.code] || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') presses.push({ type: KEY_USE });
    if (e.code === 'Space' || e.code === 'Enter') presses.push({ type: KEY_CONFIRM });
    if (e.code === 'KeyQ' || e.code === 'Backspace') presses.push({ type: KEY_TOSS });
    if (e.code === 'KeyP' || e.code === 'Escape') presses.push({ type: KEY_PAUSE });
    if (e.code === 'KeyM') presses.push({ type: KEY_MUTE });
    const digit = /^Digit([1-8])$/.exec(e.code);
    if (digit) presses.push({ type: KEY_CRATE, index: Number(digit[1]) - 1 });
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => {
    down.clear();
    pointer.down = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = toStage(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    presses.push({ type: 'click', x: p.x, y: p.y, button: e.button });
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toStage(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });
  window.addEventListener('pointerup', () => {
    pointer.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    pointer,
    /** The keyboard's walking direction as { dx, dy }. */
    direction() {
      let dx = 0;
      let dy = 0;
      for (const code of down) {
        const move = MOVES[code];
        if (move) {
          dx += move[0];
          dy += move[1];
        }
      }
      return { dx: Math.sign(dx), dy: Math.sign(dy) };
    },
    useHeld() {
      return down.has('Space') || down.has('KeyE');
    },
    /** Every press and click since the last call, in order. */
    takePresses() {
      return presses.splice(0, presses.length);
    },
  };
}
