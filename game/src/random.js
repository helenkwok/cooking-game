// A small seeded random source (mulberry32), so a seed always deals the same tickets: the
// screenshot scenes and any replay of a shift depend on it.

/** A function returning floats in [0, 1) from a 32-bit seed. */
export function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.range = (lo, hi) => lo + (hi - lo) * next();
  return next;
}
