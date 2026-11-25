// What the kitchen tells the player at a glance: which stations the thing in the chef's hands
// can go to next, what that thing needs, and how far each ticket's dish has got.
import { isDish } from './kitchen.js';
import { openTickets, ticketFor } from './orders.js';
import { fitsRecipe, matchRecipe, nextStep, STEP_BOIL, STEP_CHOP, STEP_SEAR } from './recipes.js';
import { ASSEMBLY, BIN, BOARD, GRIDDLE, POT, SHELF } from './stations.js';

const STEP_STATION = { [STEP_CHOP]: BOARD, [STEP_BOIL]: POT, [STEP_SEAR]: GRIDDLE };

/** Ids of the stations the held thing can usefully go to now. */
export function usefulStations(world) {
  const held = world.chef.held;
  const ids = new Set();
  if (held === null) return ids;
  const wanted = openTickets(world.orders).map((t) => t.recipe);
  if (isDish(held)) {
    // A finished dish a ticket wants goes to the pass; anything else can be set down on a mat.
    if (ticketFor(world.orders, held.contents) !== null) ids.add('pass');
    else for (const s of world.stations) if (s.type === ASSEMBLY && s.dish.length === 0) ids.add(s.id);
    return ids;
  }
  for (const s of world.stations) {
    if (held.burnt) {
      if (s.type === BIN) ids.add(s.id);
    } else {
      const step = nextStep(held);
      if (step !== null) {
        if (s.type === STEP_STATION[step] && s.item === null) ids.add(s.id);
      } else if (s.type === ASSEMBLY && !s.dish.includes(held.kind)) {
        const next = [...s.dish, held.kind];
        if (wanted.some((recipe) => fitsRecipe(next, recipe))) ids.add(s.id);
      }
    }
  }
  // Nowhere useful right now: the shelf will hold it.
  const shelf = world.stations.find((s) => s.type === SHELF);
  if (ids.size === 0 && shelf.item === null) ids.add(shelf.id);
  return ids;
}

/** A short word for what the held thing needs next, and its colour key. */
export function heldTag(world) {
  const held = world.chef.held;
  if (held === null) return null;
  if (isDish(held)) {
    const recipe = matchRecipe(held.contents);
    if (recipe !== null) return { text: recipe.name, tone: ticketFor(world.orders, held.contents) ? 'good' : 'warn' };
    return { text: `${held.contents.length} in dish`, tone: 'plain' };
  }
  if (held.burnt) return { text: 'BURNT: BIN IT', tone: 'bad' };
  const step = nextStep(held);
  if (step === STEP_CHOP) return { text: '→ CHOP', tone: 'plain' };
  if (step === STEP_BOIL) return { text: '→ BOIL', tone: 'plain' };
  if (step === STEP_SEAR) return { text: '→ SEAR', tone: 'plain' };
  return { text: 'READY', tone: 'good' };
}

/** For each open ticket, the ingredients already in the furthest-along dish that could become it. */
export function ticketProgress(world) {
  const dishes = world.stations.filter((s) => s.type === ASSEMBLY).map((s) => s.dish);
  for (const s of world.stations) if (s.type === SHELF && isDish(s.item)) dishes.push(s.item.contents);
  if (isDish(world.chef.held)) dishes.push(world.chef.held.contents);
  const progress = new Map();
  for (const ticket of openTickets(world.orders)) {
    let best = [];
    for (const contents of dishes) {
      if (contents.length > best.length && fitsRecipe(contents, ticket.recipe)) best = contents;
    }
    progress.set(ticket.id, best);
  }
  return progress;
}
