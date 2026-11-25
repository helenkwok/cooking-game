// Stall upgrades: every night's coins go into the stall's bank, and between nights the bank buys
// lasting upgrades on the results card. Each one bends a single rule; the kitchen asks here for
// the numbers it plays by, so a fresh stall plays exactly by config.js.
import { COOK, SCORE } from './config.js';

export const PERKS = [
  { id: 'knife', name: 'Sharp Knife', words: 'chop in 4 strokes, not 6', cost: 120 },
  { id: 'ladle', name: 'Gold Ladle', words: 'PERFECT window 2.5s → 4s', cost: 180 },
  { id: 'pans', name: 'Heavy Pans', words: 'food burns 50% later', cost: 240 },
  { id: 'lanterns', name: 'Paper Lanterns', words: 'diners wait 15% longer', cost: 300 },
  { id: 'sign', name: 'Tip Jar Sign', words: 'tips paid 50% bigger', cost: 360 },
];

const owned = new Set();

/** Play tonight with these upgrades (ids). */
export function usePerks(ids) {
  owned.clear();
  for (const id of ids) owned.add(id);
}

export const chopStrokes = () => (owned.has('knife') ? 4 : COOK.chopStrokes);
export const perfectWindow = () => (owned.has('ladle') ? 4 : COOK.perfect);
export const graceFor = (pot) => (pot ? COOK.boilGrace : COOK.searGrace) * (owned.has('pans') ? 1.5 : 1);
export const patienceBoost = () => (owned.has('lanterns') ? 1.15 : 1);
export const tipShare = () => SCORE.tipShare * (owned.has('sign') ? 1.5 : 1);

/** Buy upgrade `index` with banked coins; the reason it can't be bought, or null when it was. */
export function buyPerk(progress, index) {
  const perk = PERKS[index];
  if (!perk) return 'No such upgrade';
  if (progress.perks.includes(perk.id)) return `${perk.name}: already yours`;
  if (progress.bank < perk.cost) return `${perk.name}: ${perk.cost - progress.bank} more coins`;
  progress.bank -= perk.cost;
  progress.perks.push(perk.id);
  return null;
}
