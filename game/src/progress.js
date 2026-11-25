// The campaign record kept in this browser: which nights are open, each night's best coins and
// stars, the stall's bank of coins and the upgrades bought with it. Storage can be off (private
// windows): the record then lasts this visit only.
import { NIGHTS } from './nights.js';

const KEY = 'steam-lantern.campaign';

export function loadProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (saved && typeof saved.unlocked === 'number') {
      return { unlocked: saved.unlocked, best: saved.best ?? {}, stars: saved.stars ?? {}, bank: saved.bank ?? 0, perks: saved.perks ?? [] };
    }
  } catch {
    // Nothing saved, or storage is off.
  }
  return { unlocked: 1, best: {}, stars: {}, bank: 0, perks: [] };
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage is off: keep the record in memory.
  }
}

/** Record a finished night; returns true when it opened the next one. */
export function recordNight(progress, nightId, coins, stars) {
  progress.best[nightId] = Math.max(progress.best[nightId] ?? 0, coins);
  progress.stars[nightId] = Math.max(progress.stars[nightId] ?? 0, stars);
  progress.bank += coins;
  let opened = false;
  if (stars >= 1 && nightId === progress.unlocked && nightId < NIGHTS.length) {
    progress.unlocked = nightId + 1;
    opened = true;
  }
  saveProgress(progress);
  return opened;
}
