// One night's service: the clock, its three phases, how often tickets arrive and which dishes they
// ask for, VIP tickets on the critic's night, and the takings. Pressure grows by asking for more
// and harder dishes faster, never by adding chores.
import { SCORE, SHIFT } from './config.js';
import { nightById, TWIST_CRITIC } from './nights.js';
import { RECIPE_BY_ID } from './recipes.js';

/** Phase names and where each starts, as a share of the night. */
export const PHASES = [
  { name: 'Evening', from: 0 },
  { name: 'Night Rush', from: 0.31 },
  { name: 'Last Call', from: 0.75 },
];

export function createShift(nightId = 3) {
  const night = nightById(nightId);
  return {
    night,
    seconds: night.seconds,
    time: 0,
    nextTicket: SHIFT.firstTicketAt,
    coins: 0,
    hearts: SHIFT.hearts,
    combo: 0,
    bestCombo: 0,
    served: 0,
    vipServed: 0,
    missed: 0,
    over: false,
    closedEarly: false,
    lastPhase: 0,
  };
}

/** 0 at the opening bell, 1 at closing. */
export function shiftProgress(shift) {
  return Math.min(1, shift.time / shift.seconds);
}

export function phaseIndex(shift) {
  const t = shiftProgress(shift);
  let index = 0;
  PHASES.forEach((phase, i) => {
    if (t >= phase.from) index = i;
  });
  return index;
}

export function secondsLeft(shift) {
  return Math.max(0, shift.seconds - shift.time);
}

/** Seconds until the next ticket at this point of the night (the rush packs them closer). */
export function ticketInterval(shift) {
  const t = shiftProgress(shift);
  const eased = t * t * (3 - 2 * t);
  return shift.night.spawnStart + (shift.night.spawnEnd - shift.night.spawnStart) * eased;
}

/** Tickets wait a little less as the night goes on. */
export function patienceScale(shift) {
  return shift.night.patience * (1 - 0.18 * shiftProgress(shift));
}

/** Dishes on tonight's menu by now (the late ones join part-way through). */
export function unlockedRecipes(shift) {
  const ids = shiftProgress(shift) >= shift.night.lateAt ? [...shift.night.menu, ...shift.night.late] : shift.night.menu;
  return ids.map((id) => RECIPE_BY_ID[id]);
}

/** Pick the next ticket's dish: a dish that just joined comes up more, and repeats of the last are rarer. */
export function chooseRecipe(shift, random, lastId) {
  const menu = unlockedRecipes(shift);
  const freshWindow = shiftProgress(shift) >= shift.night.lateAt && shiftProgress(shift) < shift.night.lateAt + 0.2;
  let total = 0;
  const weights = menu.map((recipe) => {
    const fresh = freshWindow && shift.night.late.includes(recipe.id) ? 1.8 : 1;
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

/** On the critic's night, some tickets (never the first few) are VIP. */
export function rollVip(shift, random) {
  return shift.night.twist === TWIST_CRITIC && shift.time > 20 && random() < 0.22;
}

/** Pay for a served ticket: price (doubled for a VIP), a tip for speed and the combo bonus. */
export function payForServe(shift, ticket) {
  const freshness = ticket.left / ticket.patience;
  if (freshness >= 0.5) shift.combo = Math.min(SCORE.comboCap, shift.combo + 1);
  else shift.combo = 0;
  shift.bestCombo = Math.max(shift.bestCombo, shift.combo);
  const price = ticket.recipe.price * (ticket.vip ? 2 : 1);
  const tip = Math.round(price * SCORE.tipShare * freshness);
  const bonus = shift.combo > 1 ? (shift.combo - 1) * SCORE.comboBonus : 0;
  const earned = price + tip + bonus;
  shift.coins += earned;
  shift.served += 1;
  if (ticket.vip) shift.vipServed += 1;
  return { earned, tip, bonus };
}

/** A ticket walked out: a heart lost, the combo broken. True when the stall must close. */
export function loseHeart(shift) {
  shift.hearts -= 1;
  shift.missed += 1;
  shift.combo = 0;
  return shift.hearts <= 0;
}

/** Stars for the results card: 0 to 3, against tonight's bars. */
export function starsFor(shift) {
  return shift.night.stars.filter((needed) => shift.coins >= needed).length;
}
