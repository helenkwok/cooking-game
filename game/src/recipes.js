// The pantry and the menu. Each ingredient walks a short path of steps (chop on a board, boil in a
// pot, sear on the griddle); it is ready for a dish once every step is done. A recipe is a set of
// ready ingredients in a bowl or on a plate, so the same few ingredients combine into many dishes.

export const STEP_CHOP = 'chop';
export const STEP_BOIL = 'boil';
export const STEP_SEAR = 'sear';

/** Seconds each cooking step takes for each ingredient (chopping is strokes, not seconds). */
export const INGREDIENTS = {
  noodles: { name: 'Noodles', steps: [STEP_BOIL], times: { boil: 6 } },
  egg: { name: 'Egg', steps: [STEP_BOIL], times: { boil: 7 } },
  scallion: { name: 'Scallion', steps: [STEP_CHOP], times: {} },
  mushroom: { name: 'Mushroom', steps: [STEP_CHOP, STEP_SEAR], times: { sear: 4 } },
  tofu: { name: 'Tofu', steps: [STEP_SEAR], times: { sear: 4.5 } },
  pork: { name: 'Pork', steps: [STEP_SEAR, STEP_CHOP], times: { sear: 5.5 } },
  broth: { name: 'Broth', steps: [], times: {} },
  chili: { name: 'Chili oil', steps: [], times: {} },
};

/** Ingredient order inside a bowl, bottom layer first, so dishes always stack the same way. */
export const LAYER_ORDER = ['broth', 'noodles', 'chili', 'tofu', 'pork', 'mushroom', 'egg', 'scallion'];

export const VESSEL_BOWL = 'bowl';
export const VESSEL_PLATE = 'plate';

/**
 * The menu. `unlock` is the shift second the dish starts appearing on tickets; `price` is coins
 * before tips; `patience` is the seconds a ticket waits.
 */
export const RECIPES = [
  { id: 'lantern', name: 'Lantern Ramen', items: ['noodles', 'broth', 'egg', 'scallion'], price: 22, patience: 70, unlock: 0, hue: '#f2a541' },
  { id: 'ember', name: 'Ember Noodles', items: ['noodles', 'chili', 'pork', 'scallion'], price: 26, patience: 74, unlock: 0, hue: '#e5534b' },
  { id: 'grove', name: 'Grove Broth', items: ['noodles', 'broth', 'mushroom', 'tofu'], price: 28, patience: 78, unlock: 45, hue: '#7cb342' },
  { id: 'griddle', name: 'Griddle Plate', items: ['tofu', 'mushroom', 'chili'], price: 20, patience: 62, unlock: 70, hue: '#c0763b' },
  { id: 'moon', name: 'Moon Soup', items: ['broth', 'egg', 'tofu', 'scallion'], price: 24, patience: 66, unlock: 110, hue: '#8fb8de' },
  { id: 'feast', name: 'Midnight Feast', items: ['noodles', 'broth', 'pork', 'egg', 'mushroom', 'scallion'], price: 44, patience: 98, unlock: 150, hue: '#b07cd8' },
  // Sides: quick little plates from two ingredients, cheap and impatient, slotted between bowls.
  { id: 'bites', name: 'Tofu Bites', items: ['tofu', 'chili'], price: 12, patience: 46, unlock: 0, hue: '#d9822b', side: true },
  { id: 'soyegg', name: 'Soy Egg', items: ['egg', 'scallion'], price: 11, patience: 44, unlock: 0, hue: '#c9a227', side: true },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

/** A fresh, raw ingredient as it comes out of its crate. */
export function createItem(kind) {
  return { kind, done: 0, progress: 0, burnt: false };
}

/** The step this item needs next, or null when it is ready (or ruined). */
export function nextStep(item) {
  if (item.burnt) return null;
  const steps = INGREDIENTS[item.kind].steps;
  return item.done < steps.length ? steps[item.done] : null;
}

export function isReady(item) {
  return !item.burnt && item.done >= INGREDIENTS[item.kind].steps.length;
}

/** Bowls hold broth or noodles; anything else is served on a plate. */
export function vesselFor(contents) {
  return contents.includes('broth') || contents.includes('noodles') ? VESSEL_BOWL : VESSEL_PLATE;
}

/** Ingredients sorted into their layer order. */
export function layered(contents) {
  return [...contents].sort((a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b));
}

/** The recipe whose ingredients are exactly `contents`, or null. */
export function matchRecipe(contents) {
  for (const recipe of RECIPES) {
    if (recipe.items.length === contents.length && recipe.items.every((kind) => contents.includes(kind))) return recipe;
  }
  return null;
}

/** True when `contents` could still grow into `recipe` (nothing in it the recipe lacks). */
export function fitsRecipe(contents, recipe) {
  return contents.every((kind) => recipe.items.includes(kind));
}
