// One night's service: the clock, its three phases, how often tickets arrive and which dishes they
// ask for, and the takings. Pressure grows by asking for more and harder dishes faster, never by
// adding chores.
import { SCORE, SHIFT } from './config.js';
import { RECIPES } from './recipes.js';

export function createShift() {
  return {
    time: 0,
    nextTicket: SHIFT.firstTicketAt,
    coins: 0,
    hearts: SHIFT.hearts,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    over: false,
    closedEarly: false,
    lastPhase: 0,
  };
}

/** 0 at the opening bell, 1 at closing. */
export function shiftProgress(shift) {
  return Math.min(1, shift.time / SHIFT.seconds);
}

export function phaseIndex(shift) {
  let index = 0;
  SHIFT.phases.forEach((phase, i) => {
    if (shift.time >= phase.from) index = i;
  });
  return index;
}

export function secondsLeft(shift) {
  return Math.max(0, SHIFT.seconds - shift.time);
}

/** Seconds until the next ticket at this point of the night (the rush packs them closer). */
export function ticketInterval(shift) {
  const t = shiftProgress(shift);
  const eased = t * t * (3 - 2 * t);
  return SHIFT.spawnStart + (SHIFT.spawnEnd - SHIFT.spawnStart) * eased;
}

/** Tickets wait a little less as the night goes on. */
export function patienceScale(shift) {
  return SHIFT.patience * (1 - 0.18 * shiftProgress(shift));
}

/** Dishes on the menu by now. */
export function unlockedRecipes(shift) {
  return RECIPES.filter((recipe) => recipe.unlock <= shift.time);
}

/** Pick the next ticket's dish: newly unlocked dishes come up more, and repeats of the last are rarer. */
export function chooseRecipe(shift, random, lastId) {
  const menu = unlockedRecipes(shift);
  let total = 0;
  const weights = menu.map((recipe) => {
    const fresh = shift.time - recipe.unlock < 40 ? 1.8 : 1;
    const weight = (recipe.id === lastId ? 0.35 : 1) * fresh;
    total += weight;
    return weight;
  });
  let roll = random() * total;
  for (let i = 0; i < menu.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return menu[i];
  }
  return menu[menu.length - 1];
}

/** Pay for a served ticket: price, a tip for speed and the combo bonus. Returns the coins earned. */
export function payForServe(shift, ticket) {
  const freshness = ticket.left / ticket.patience;
  if (freshness >= 0.5) shift.combo = Math.min(SCORE.comboCap, shift.combo + 1);
  else shift.combo = 0;
  shift.bestCombo = Math.max(shift.bestCombo, shift.combo);
  const tip = Math.round(ticket.recipe.price * SCORE.tipShare * freshness);
  const bonus = shift.combo > 1 ? (shift.combo - 1) * SCORE.comboBonus : 0;
  const earned = ticket.recipe.price + tip + bonus;
  shift.coins += earned;
  shift.served += 1;
  return { earned, tip, bonus };
}

/** A ticket walked out: a heart lost, the combo broken. True when the stall must close. */
export function loseHeart(shift) {
  shift.hearts -= 1;
  shift.missed += 1;
  shift.combo = 0;
  return shift.hearts <= 0;
}

/** Stars for the results card: 0 to 3. */
export function starsFor(coins) {
  return SHIFT.stars.filter((needed) => coins >= needed).length;
}
