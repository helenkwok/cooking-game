// What happens when the chef works a station, and how food cooks while nobody watches. Pots and
// the griddle keep cooking on their own (so a good route starts the slow things first) and ruin
// food left too long; boards only chop while the chef chops. Every rule reports an event the
// renderer and the sound answer at once.
import { COOK, SCORE } from './config.js';
import { chopStrokes, graceFor, perfectWindow } from './perks.js';
import { createItem, INGREDIENTS, isReady, nextStep, STEP_BOIL, STEP_CHOP, STEP_SEAR } from './recipes.js';
import { ASSEMBLY, BIN, BOARD, CRATE, GRIDDLE, PASS, POT, SHELF } from './stations.js';

/** A carried dish: the ingredients in it, in the order they went in. */
export function createDish(contents = []) {
  return { dish: true, contents: [...contents] };
}

function isDish(thing) {
  return thing !== null && thing.dish === true;
}

function event(world, type, s, extra = {}) {
  world.events.push({ type, x: s.cx, y: s.cy, station: s.id, ...extra });
}

/** Put a ready ingredient into a dish; false (and an event saying why) when it does not go. */
function addToDish(world, contents, item, s) {
  if (!isReady(item)) {
    event(world, 'refuse', s, { text: item.burnt ? 'Ruined: bin it' : `${INGREDIENTS[item.kind].name} isn't prepped` });
    return false;
  }
  if (contents.includes(item.kind)) {
    event(world, 'refuse', s, { text: `Already has ${INGREDIENTS[item.kind].name.toLowerCase()}` });
    return false;
  }
  if (contents.length >= 6) {
    event(world, 'refuse', s, { text: 'Dish is full' });
    return false;
  }
  contents.push(item.kind);
  event(world, 'plate', s, { kind: item.kind });
  return true;
}

function cookerStep(s) {
  return s.type === POT ? STEP_BOIL : STEP_SEAR;
}

/** Food just done and still within the PERFECT window (the gold arc on the ring). */
function inPerfectWindow(s) {
  const item = s.item;
  return item !== null && !item.burnt && nextStep(item) !== cookerStep(s) && item.progress <= perfectWindow();
}

/** A PERFECT pull: a few coins and a count for the results card. */
function payPerfect(world, s) {
  world.shift.coins += SCORE.perfectBonus;
  world.shift.perfects += 1;
  event(world, 'perfect', s, { bonus: SCORE.perfectBonus });
}

/**
 * The chef works station `s` once (a press of Space, a click on arrival). Chopping is a separate
 * action, `chopAt`, since it repeats while held.
 */
export function interact(world, s) {
  const chef = world.chef;
  const held = chef.held;

  switch (s.type) {
    case CRATE: {
      if (held === null) {
        chef.held = createItem(s.kind);
        event(world, 'pickup', s, { kind: s.kind });
      } else if (!isDish(held) && held.kind === s.kind && held.done === 0) {
        chef.held = null;
        event(world, 'drop', s, { kind: s.kind });
      } else if (isDish(held) && INGREDIENTS[s.kind].steps.length === 0) {
        // Broth and chili oil need no prep: ladle them straight into a carried dish.
        addToDish(world, held.contents, createItem(s.kind), s);
      } else {
        event(world, 'refuse', s, { text: 'Hands full' });
      }
      return;
    }
    case BOARD: {
      if (held !== null && !isDish(held) && s.item === null) {
        s.item = held;
        s.chop = 0;
        chef.held = null;
        event(world, 'place', s, { kind: held.kind });
      } else if (held === null && s.item !== null) {
        if (nextStep(s.item) === STEP_CHOP) chopAt(world, s);
        else {
          chef.held = s.item;
          s.item = null;
          event(world, 'pickup', s, { kind: chef.held.kind });
        }
      } else if (isDish(held) && s.item !== null && isReady(s.item)) {
        if (addToDish(world, held.contents, s.item, s)) s.item = null;
      } else if (held !== null) {
        event(world, 'refuse', s, { text: 'Board is busy' });
      }
      return;
    }
    case POT:
    case GRIDDLE: {
      const step = cookerStep(s);
      if (held !== null && !isDish(held) && s.item === null) {
        if (nextStep(held) !== step) {
          event(world, 'refuse', s, { text: s.type === POT ? 'Nothing to boil' : 'Nothing to sear' });
          return;
        }
        s.item = held;
        s.item.progress = 0;
        chef.held = null;
        event(world, s.type === POT ? 'splash' : 'sizzle', s, { kind: s.item.kind });
      } else if (held === null && s.item !== null) {
        const perfect = inPerfectWindow(s);
        chef.held = s.item;
        s.item = null;
        event(world, 'pickup', s, { kind: chef.held.kind });
        if (perfect) payPerfect(world, s);
      } else if (isDish(held) && s.item !== null && isReady(s.item)) {
        const perfect = inPerfectWindow(s);
        if (addToDish(world, held.contents, s.item, s)) {
          s.item = null;
          if (perfect) payPerfect(world, s);
        }
      } else if (held !== null) {
        event(world, 'refuse', s, { text: 'Burner is busy' });
      }
      return;
    }
    case SHELF: {
      if (held !== null && s.item === null) {
        s.item = held;
        chef.held = null;
        event(world, 'place', s, {});
      } else if (held === null && s.item !== null) {
        chef.held = s.item;
        s.item = null;
        event(world, 'pickup', s, {});
      } else if (isDish(held) && s.item !== null && !isDish(s.item)) {
        if (addToDish(world, held.contents, s.item, s)) s.item = null;
      } else if (held !== null && !isDish(held) && isDish(s.item)) {
        if (addToDish(world, s.item.contents, held, s)) chef.held = null;
      } else if (held !== null) {
        event(world, 'refuse', s, { text: 'Shelf is full' });
      }
      return;
    }
    case ASSEMBLY: {
      if (held !== null && !isDish(held)) {
        if (addToDish(world, s.dish, held, s)) chef.held = null;
      } else if (held === null && s.dish.length > 0) {
        chef.held = createDish(s.dish);
        s.dish = [];
        event(world, 'pickup', s, { dish: true });
      } else if (isDish(held) && s.dish.length === 0) {
        s.dish = held.contents;
        chef.held = null;
        event(world, 'place', s, { dish: true });
      } else if (held === null) {
        event(world, 'refuse', s, { text: 'Bring a prepped ingredient' });
      } else {
        event(world, 'refuse', s, { text: 'Mat is taken' });
      }
      return;
    }
    case PASS: {
      if (!isDish(held)) {
        event(world, 'refuse', s, { text: held === null ? 'Plate a dish first' : 'Plate it in a dish first' });
        return;
      }
      const served = world.serve(held.contents, s);
      if (served) chef.held = null;
      return;
    }
    case BIN: {
      if (held !== null) {
        chef.held = null;
        event(world, 'bin', s, {});
      }
      return;
    }
    default:
  }
}

/** One stroke of the knife on board `s`; finishing the strokes completes the chop step. */
export function chopAt(world, s) {
  if (s.type !== BOARD || s.item === null || nextStep(s.item) !== STEP_CHOP) return false;
  s.chop += 1;
  event(world, 'chop', s, { kind: s.item.kind, stroke: s.chop });
  if (s.chop >= chopStrokes()) {
    s.item.done += 1;
    s.chop = 0;
    event(world, 'chopped', s, { kind: s.item.kind });
  }
  return true;
}

/** Pots and the griddle cook their food; food left past its grace is ruined. */
export function updateCookers(world, stations, dt) {
  for (const s of stations) {
    if ((s.type !== POT && s.type !== GRIDDLE) || s.item === null || s.item.burnt) continue;
    const item = s.item;
    const step = cookerStep(s);
    const grace = graceFor(s.type === POT);
    if (nextStep(item) === step) {
      item.progress += dt;
      const time = INGREDIENTS[item.kind].times[step];
      if (item.progress >= time) {
        item.done += 1;
        item.progress = 0;
        event(world, 'cooked', s, { kind: item.kind });
      }
    } else {
      // Done and still on the heat: the grace clock runs.
      item.progress += dt;
      if (item.progress >= grace) {
        item.burnt = true;
        event(world, 'burnt', s, { kind: item.kind });
      }
    }
  }
}

/** 0..1 for a station's ring; whether it is in its PERFECT window (and that window's share) or warning window. */
export function cookerGauge(s) {
  const item = s.item;
  if (item === null || item.burnt) return { cooking: 0, overdone: 0, warn: false, perfect: false, share: 0 };
  const step = cookerStep(s);
  const grace = graceFor(s.type === POT);
  const share = perfectWindow() / grace;
  if (nextStep(item) === step) return { cooking: item.progress / INGREDIENTS[item.kind].times[step], overdone: 0, warn: false, perfect: false, share };
  return { cooking: 1, overdone: item.progress / grace, warn: grace - item.progress <= COOK.warnAt, perfect: item.progress <= perfectWindow(), share };
}

export { isDish };
