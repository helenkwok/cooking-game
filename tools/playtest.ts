// A headless playtest: a simple bot cook plays whole shifts through the game's own rules (it
// walks to stations, works them, chops, waits on the stove, plates and serves) and reports the
// takings, so the pacing and the star thresholds can be checked without a browser.
//   node tools/playtest.ts [--seeds 8] [--smart]
// The plain bot works one ticket at a time. --smart starts the stove first and preps the next
// ingredient while things cook, as a practised player does.
import { COOK, SHIFT, STEP } from '../game/src/config.js';
import { createRandom } from '../game/src/random.js';
import { createWorld } from '../game/src/world.js';
import { openTickets } from '../game/src/orders.js';
import { INGREDIENTS, nextStep, STEP_BOIL, STEP_CHOP, STEP_SEAR } from '../game/src/recipes.js';
import { starsFor } from '../game/src/shift.js';

const args = process.argv.slice(2);
const seeds = Number(args[args.indexOf('--seeds') + 1]) || 8;
const smart = args.includes('--smart');

type World = ReturnType<typeof createWorld>;
let burnt = 0;
const IDLE = { dx: 0, dy: 0, chopHeld: false, chopRate: COOK.holdChopRate };

/** Step the world until `done()` or the shift ends; false if the shift ended first. */
function until(world: World, done: () => boolean, control = IDLE): boolean {
  while (!done()) {
    if (world.shift.over) return false;
    world.step(STEP, control);
    world.events.length = 0;
  }
  return true;
}

function goWork(world: World, id: string): boolean {
  world.walkTo(world.station(id));
  return until(world, () => world.chef.target === null);
}

function freeStation(world: World, prefix: string) {
  return world.stations.find((s: any) => s.id.startsWith(prefix) && s.item === null);
}

/** Fetch `kind`, run it through every step it needs, and leave the chef holding it ready. */
function prepare(world: World, kind: string): boolean {
  if (!goWork(world, `crate-${kind}`)) return false;
  for (let step = nextStep(world.chef.held); step !== null; step = nextStep(world.chef.held)) {
    const prefix = step === STEP_CHOP ? 'board' : step === STEP_BOIL ? 'pot' : 'griddle';
    const s = freeStation(world, prefix);
    if (!s) return false;
    if (!goWork(world, s.id)) return false;
    if (step === STEP_CHOP) {
      if (!until(world, () => nextStep(s.item) !== STEP_CHOP, { ...IDLE, chopHeld: true })) return false;
    } else if (!until(world, () => s.item === null || nextStep(s.item) !== step)) return false;
    if (!goWork(world, s.id)) return false;
  }
  return true;
}

/** The smart bot: drop slow cookables on the stove for this dish first, then do the rest. */
function cookTicket(world: World, recipe: any, spot: any): boolean {
  let needed = recipe.items.filter((k: string) => !spot.dish.includes(k));
  if (smart) {
    // Start everything that only needs the stove, collect it after the board work.
    const stoveOnly = needed.filter((k: string) => {
      const steps = INGREDIENTS[k].steps;
      return steps.length === 1 && (steps[0] === STEP_BOIL || steps[0] === STEP_SEAR);
    });
    const parked: { kind: string; id: string }[] = [];
    for (const kind of stoveOnly) {
      const prefix = INGREDIENTS[kind].steps[0] === STEP_BOIL ? 'pot' : 'griddle';
      const s = freeStation(world, prefix);
      if (!s) continue;
      if (!goWork(world, `crate-${kind}`) || !goWork(world, s.id)) return false;
      parked.push({ kind, id: s.id });
    }
    const parkedKinds = parked.map((p) => p.kind);
    for (const kind of needed) {
      if (parkedKinds.includes(kind)) continue;
      if (!prepare(world, kind) || !goWork(world, spot.id)) return false;
    }
    for (const p of parked) {
      const s = world.station(p.id);
      if (!until(world, () => s.item === null || nextStep(s.item) === null)) return false;
      if (!goWork(world, p.id)) return false;
      if (world.chef.held !== null && world.chef.held.burnt) {
        burnt += 1;
        if (!goWork(world, 'bin') || !prepare(world, p.kind)) return false;
      }
      if (!goWork(world, spot.id)) return false;
    }
  } else {
    for (const kind of needed) {
      if (!prepare(world, kind) || !goWork(world, spot.id)) return false;
    }
  }
  if (!goWork(world, spot.id)) return false;
  if (!goWork(world, 'pass')) return false;
  if (world.chef.held !== null) goWork(world, 'bin');
  return true;
}

function playShift(seed: number) {
  const world = createWorld(createRandom(seed));
  world.reset();
  while (!world.shift.over) {
    const tickets = openTickets(world.orders).sort((a: any, b: any) => a.left - b.left);
    // The most urgent ticket that can still be made in time (else the newest).
    const ticket = tickets.find((t: any) => t.left > 22) ?? tickets[tickets.length - 1];
    if (!ticket) {
      until(world, () => openTickets(world.orders).length > 0);
      continue;
    }
    const spot = world.stations.find((s: any) => s.id.startsWith('assembly') && s.dish.length === 0);
    if (!spot || !cookTicket(world, ticket.recipe, spot)) {
      // Clear the mats and stove of leftovers and try again.
      for (const s of world.stations) if (s.id.startsWith('assembly')) s.dish = [];
      world.chef.held = null;
    }
  }
  return world.shift;
}

let total = 0;
for (let seed = 1; seed <= seeds; seed += 1) {
  const shift = playShift(seed);
  total += shift.coins;
  console.log(`seed ${seed}: ${shift.coins} coins, ${shift.served} served, ${shift.missed} lost, best combo ${shift.bestCombo}, ${starsFor(shift.coins)} stars${shift.closedEarly ? ' (closed early)' : ''}, ended at ${Math.round(shift.time)}s of ${SHIFT.seconds}`);
}
console.log(`${smart ? 'smart' : 'plain'} bot average: ${Math.round(total / seeds)} coins (stars at ${SHIFT.stars.join(' / ')}), ${burnt} burnt`);
