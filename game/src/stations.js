// Where everything stands in the kitchen. The counters wrap the floor in a U with a front pass:
// ingredient crates along the back, chopping boards and the bin on the left, two pots and the
// griddle on the right, and the shelf, three assembly spots and the serving pass at the front.
// Each station has a rectangle (drawn and clicked) and an access point on the floor where the chef
// stands to work it.
import { FLOOR, ISLAND } from './config.js';

export const CRATE = 'crate';
export const BOARD = 'board';
export const BIN = 'bin';
export const POT = 'pot';
export const GRIDDLE = 'griddle';
export const SHELF = 'shelf';
export const ASSEMBLY = 'assembly';
export const PASS = 'pass';

const CRATE_KINDS = ['noodles', 'egg', 'scallion', 'mushroom', 'tofu', 'pork'];

function station(id, type, x, y, w, h, side, extra = {}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  let ax = cx;
  let ay = cy;
  if (side === 'back') ay = FLOOR.top;
  else if (side === 'front') ay = FLOOR.bottom;
  else if (side === 'island') ay = ISLAND.y - 30;
  else if (side === 'left') {
    ax = FLOOR.left;
    ay = Math.min(FLOOR.bottom, Math.max(FLOOR.top, cy));
  } else {
    ax = FLOOR.right;
    ay = Math.min(FLOOR.bottom, Math.max(FLOOR.top, cy));
  }
  return { id, type, x, y, w, h, side, cx, cy, ax, ay, item: null, dish: null, chop: 0, ...extra };
}

/** A fresh kitchen: every station empty, every assembly spot holding a clean, empty dish. */
export function createStations() {
  const list = [];
  CRATE_KINDS.forEach((kind, index) => {
    list.push(station(`crate-${kind}`, CRATE, 236 + index * 136, 156, 116, 84, 'back', { kind, key: String(index + 1) }));
  });
  // The island: broth on the left, a third board, chili oil on the right; worked from behind,
  // so a trip from the island to the pass goes round it.
  list.push(station('crate-broth', CRATE, ISLAND.x + 12, ISLAND.y + 4, 104, ISLAND.h - 8, 'island', { kind: 'broth', key: '7' }));
  list.push(station('board-c', BOARD, ISLAND.x + 122, ISLAND.y - 6, 132, ISLAND.h + 4, 'island'));
  list.push(station('crate-chili', CRATE, ISLAND.x + ISLAND.w - 116, ISLAND.y + 4, 104, ISLAND.h - 8, 'island', { kind: 'chili', key: '8' }));
  list.push(station('board-a', BOARD, 40, 276, 132, 104, 'left'));
  list.push(station('board-b', BOARD, 40, 398, 132, 104, 'left'));
  list.push(station('bin', BIN, 56, 524, 100, 64, 'left'));
  list.push(station('pot-a', POT, 1108, 258, 132, 92, 'right'));
  list.push(station('pot-b', POT, 1108, 356, 132, 92, 'right'));
  list.push(station('griddle-a', GRIDDLE, 1108, 456, 132, 82, 'right'));
  list.push(station('griddle-b', GRIDDLE, 1108, 540, 132, 82, 'right'));
  list.push(station('shelf', SHELF, 226, 606, 116, 88, 'front'));
  ['1', '2', '3'].forEach((n, index) => {
    list.push(station(`assembly-${n}`, ASSEMBLY, 372 + index * 140, 604, 124, 92, 'front', { dish: [] }));
  });
  list.push(station('pass', PASS, 836, 600, 224, 100, 'front'));
  return list;
}

/** The station under a stage point, or null. */
export function stationAt(stations, x, y) {
  for (const s of stations) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}
