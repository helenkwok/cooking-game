// The screenshot scenes behind ?shot=. Each one cooks its dishes through the real kitchen rules
// (the chef visits each crate, board, pot and griddle and works it), clips the tickets a moment of
// the night would hold, and returns the screen to draw, so every frame is the game's own state.
import { COOK } from './config.js';
import { chopAt, interact, updateCookers } from './kitchen.js';
import { addTicket } from './orders.js';
import { nextStep, RECIPE_BY_ID, STEP_BOIL, STEP_CHOP, STEP_SEAR } from './recipes.js';
import { patienceScale, phaseIndex } from './shift.js';
import { applyEvents } from './render/effects.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render/renderer.js';

const DT = 1 / 60;

/** Walk the chef to station `id` (instantly) and work it once. */
function work(world, id) {
  const s = world.station(id);
  world.chef.x = s.ax;
  world.chef.y = s.ay;
  world.chef.target = null;
  interact(world, s);
  return s;
}

/** Let the stove run for `seconds` without the shift clock moving. */
function simmer(world, seconds) {
  for (let t = 0; t < seconds; t += DT) updateCookers(world, world.stations, DT);
}

/** Take `kind` from its crate and prep it fully on the given board, pot and griddle; the chef ends up holding it. */
function prep(world, kind, { board = 'board-a', pot = 'pot-a', griddle = 'griddle-a' } = {}) {
  work(world, `crate-${kind}`);
  for (let step = nextStep(world.chef.held); step !== null; step = nextStep(world.chef.held)) {
    if (step === STEP_CHOP) {
      const s = work(world, board);
      for (let i = 0; i < COOK.chopStrokes; i += 1) chopAt(world, s);
      work(world, board);
    } else {
      const id = step === STEP_BOIL ? pot : griddle;
      work(world, id);
      simmer(world, 7.5);
      work(world, id);
    }
  }
}

/** Build a dish of `kinds` on assembly spot `spot`. */
function assemble(world, spot, kinds) {
  for (const kind of kinds) {
    prep(world, kind);
    work(world, spot);
  }
}

/** Put `kind` on station `id` and let it cook for `seconds` (after any steps it needs first). */
function startCooking(world, kind, id, seconds, before = []) {
  work(world, `crate-${kind}`);
  for (const step of before) {
    if (step === STEP_CHOP) {
      const s = work(world, 'board-b');
      for (let i = 0; i < COOK.chopStrokes; i += 1) chopAt(world, s);
      work(world, 'board-b');
    } else if (step === STEP_SEAR) {
      work(world, 'griddle-b');
      simmer(world, 7);
      work(world, 'griddle-b');
    }
  }
  work(world, id);
  for (let t = 0; t < seconds; t += DT) updateCookers(world, [world.station(id)], DT);
}

/** Clip a ticket with `fraction` of its patience left. */
function ticket(world, id, fraction, vip = false) {
  const t = addTicket(world.orders, RECIPE_BY_ID[id], patienceScale(world.shift), vip);
  t.special = id === world.shift.night.special;
  t.left = t.patience * fraction;
  t.age = 3;
  return t;
}

function setNight(world, time, { coins, served, missed, combo, bestCombo, vipServed = 0, perfects = 0 }) {
  Object.assign(world.shift, { time, coins, served, missed, combo, bestCombo, vipServed, perfects, hearts: 5 - missed, nextTicket: 999 });
  world.shift.lastPhase = phaseIndex(world.shift);
}

/** A campaign record partway through: nights 1 to 3 done, the critic's night open. */
const MIDWAY = { unlocked: 4, best: { 1: 241, 2: 236, 3: 318 }, stars: { 1: 3, 2: 2, 3: 2 } };

/** The cover: the critic's night, its rush in full swing, a gold VIP ticket on the rail. */
function stageService(world, fx) {
  world.reset(4);
  assemble(world, 'assembly-2', ['noodles', 'chili', 'pork', 'scallion']);
  assemble(world, 'assembly-1', ['broth', 'noodles', 'egg']);
  assemble(world, 'assembly-3', ['tofu', 'mushroom']);
  // Seared pork waiting on a board to be sliced, a chopped mushroom waiting for the griddle.
  startCooking(world, 'pork', 'griddle-b', 6.5);
  work(world, 'griddle-b');
  work(world, 'board-b');
  work(world, 'crate-mushroom');
  const boardA = work(world, 'board-a');
  for (let i = 0; i < COOK.chopStrokes; i += 1) chopAt(world, boardA);
  startCooking(world, 'noodles', 'pot-a', 3.6);
  startCooking(world, 'egg', 'pot-b', 8);
  startCooking(world, 'pork', 'griddle-a', 2.4);
  startCooking(world, 'tofu', 'griddle-b', 10);
  // The chef at the island board, mid-way through the scallions for the Lantern Ramen.
  work(world, 'crate-scallion');
  const board = work(world, 'board-c');
  for (let i = 0; i < 3; i += 1) chopAt(world, board);
  world.chef.facing = 1;
  world.chef.walk = 0.6;
  // A Lantern Ramen just went out through the pass.
  world.events.length = 0;
  setNight(world, 118, { coins: 236, served: 8, missed: 1, combo: 3, bestCombo: 4, vipServed: 1, perfects: 5 });
  ticket(world, 'lantern', 0.34);
  ticket(world, 'ember', 0.52, true);
  const toGo = ticket(world, 'grove', 0.74);
  toGo.takeaway = true;
  ticket(world, 'griddle', 0.9);
  ticket(world, 'soyegg', 1);
  world.events.push({ type: 'serve', x: 948, y: 650, earned: 38, tip: 12, bonus: 4, combo: 3, contents: ['broth', 'noodles', 'egg', 'scallion'] });
  world.events.push({ type: 'chop', x: board.cx, y: board.cy, station: board.id, kind: 'scallion', stroke: 3 });
  applyEvents(fx, world.events, world.orders);
  world.events.length = 0;
  fx.knives[board.id] = 0.45;
  fx.floaters.forEach((f) => { f.age = 0.25; });
  for (const p of fx.particles) {
    p.age = 0.12;
    p.x += p.vx * 0.12;
    p.y += p.vy * 0.12;
  }
  return { screen: SCREEN_PLAY, time: 12.3, servedDishes: [], progress: { ...MIDWAY, perks: ['ladle', 'pans', 'decor'] } };
}

/** Last Call on Midnight Market: big orders, a pot about to boil over, a Midnight Feast run to the pass. */
function stageLastCall(world, fx) {
  world.reset(5);
  assemble(world, 'assembly-1', ['broth', 'egg', 'tofu']);
  assemble(world, 'assembly-3', ['noodles', 'broth', 'mushroom']);
  // The feast, built on the middle mat; the chef picks it up last, once the stove is going.
  assemble(world, 'assembly-2', ['noodles', 'broth', 'pork', 'egg', 'mushroom', 'scallion']);
  startCooking(world, 'noodles', 'pot-a', 6 + 7);
  startCooking(world, 'egg', 'pot-b', 2.5);
  startCooking(world, 'mushroom', 'griddle-a', 30, [STEP_CHOP]);
  startCooking(world, 'pork', 'griddle-b', 3);
  work(world, 'crate-scallion');
  work(world, 'board-a');
  work(world, 'assembly-2');
  // Running the feast from the island round to the pass (the route shows as a dotted trail).
  world.chef.x = 770;
  world.chef.y = 338;
  world.chef.target = 'pass';
  world.chef.moving = true;
  world.chef.walk = 1.2;
  world.chef.facing = 1;
  world.events.length = 0;
  setNight(world, 214, { coins: 371, served: 13, missed: 2, combo: 5, bestCombo: 5 });
  ticket(world, 'feast', 0.22);
  ticket(world, 'moon', 0.41);
  ticket(world, 'bites', 0.63);
  // An Ember Noodles just went out: its ticket lifts away and its diner beams.
  const served = ticket(world, 'ember', 0.8);
  served.served = true;
  served.leaving = 0.25;
  ticket(world, 'feast', 0.97);
  world.events.push({ type: 'serve', x: 948, y: 650, earned: 61, tip: 13, bonus: 16, combo: 5, contents: RECIPE_BY_ID.ember.items });
  applyEvents(fx, world.events, world.orders);
  world.events.length = 0;
  fx.floaters.forEach((f) => { f.age = 0.3; });
  for (const p of fx.particles) {
    p.age = 0.15;
    p.x += p.vx * 0.15;
    p.y += p.vy * 0.15;
  }
  const progress = { unlocked: 5, best: { ...MIDWAY.best, 4: 342 }, stars: { ...MIDWAY.stars, 4: 2 }, perks: ['knife', 'ladle', 'pans'] };
  return { screen: SCREEN_PLAY, time: 31.7, servedDishes: [], progress };
}

/** The end of the Lantern Festival: a strong two-star night that opens the critic's night. */
function stageResults(world) {
  world.reset(3);
  setNight(world, 240, { coins: 318, served: 12, missed: 1, combo: 0, bestCombo: 4, perfects: 9 });
  world.shift.over = true;
  const served = [
    ['noodles', 'broth', 'egg', 'scallion'],
    ['noodles', 'chili', 'pork', 'scallion'],
    ['tofu', 'mushroom', 'chili'],
    ['noodles', 'broth', 'mushroom', 'tofu'],
    ['broth', 'egg', 'tofu', 'scallion'],
    ['noodles', 'broth', 'pork', 'egg', 'mushroom', 'scallion'],
  ];
  // Three upgrades owned, Heavy Pans bought a moment ago, Paper Lanterns now affordable.
  const progress = { ...MIDWAY, bank: 315, perks: ['knife', 'ladle', 'pans'] };
  const outcome = { best: 0, opened: true, bought: 2, boughtAt: 2.1, note: 'Heavy Pans is yours from the next night on!' };
  return { screen: SCREEN_OVER, time: 2.4, servedDishes: served, progress, outcome };
}

/** Stage the named scene on `world` (and `fx`); returns what the renderer needs to paint it. */
export function stageShot(name, world, fx) {
  if (name === 'lastcall') return stageLastCall(world, fx);
  if (name === 'results') return stageResults(world);
  if (name === 'menu') {
    stageService(world, fx);
    return { screen: SCREEN_TITLE, time: 2.2, servedDishes: [], progress: MIDWAY, selected: 4 };
  }
  return stageService(world, fx);
}
