// The campaign: five nights at the stall, each with its own menu, pace and twist. A night with at
// least one star unlocks the next. Times are seconds; `late` dishes join the menu once `lateAt`
// of the night has passed; `stars` are the coins for one, two and three stars.

export const TWIST_RAIN = 'rain';
export const TWIST_FESTIVAL = 'festival';
export const TWIST_CRITIC = 'critic';

export const NIGHTS = [
  {
    id: 1, name: 'Opening Night', blurb: 'Two dishes, a gentle crowd: learn the stall.',
    seconds: 180, menu: ['lantern', 'ember'], late: [], lateAt: 1,
    spawnStart: 30, spawnEnd: 19, patience: 1.3, twist: null, stars: [90, 210, 320],
  },
  {
    id: 2, name: 'Rainy Night', blurb: 'Fewer customers, but they all want soup.',
    seconds: 200, menu: ['lantern', 'grove', 'moon'], late: ['ember'], lateAt: 0.5,
    spawnStart: 30, spawnEnd: 18, patience: 1.45, twist: TWIST_RAIN, stars: [110, 250, 370],
  },
  {
    id: 3, name: 'Lantern Festival', blurb: 'The street fills up: a long, loud rush.',
    seconds: 240, menu: ['lantern', 'ember', 'grove'], late: ['griddle', 'moon'], lateAt: 0.3,
    spawnStart: 25, spawnEnd: 11.5, patience: 1.12, twist: TWIST_FESTIVAL, stars: [120, 260, 390],
  },
  {
    id: 4, name: 'The Food Critic', blurb: 'Gold VIP tickets pay double, and wait half as long.',
    seconds: 240, menu: ['lantern', 'ember', 'grove', 'griddle'], late: ['moon', 'feast'], lateAt: 0.45,
    spawnStart: 26, spawnEnd: 12.5, patience: 1.15, twist: TWIST_CRITIC, stars: [130, 300, 440],
  },
  {
    id: 5, name: 'Midnight Market', blurb: 'Every dish, the fastest crowd. Good luck.',
    seconds: 240, menu: ['lantern', 'ember', 'grove', 'griddle', 'moon'], late: ['feast'], lateAt: 0.25,
    spawnStart: 21, spawnEnd: 10, patience: 1.02, twist: null, stars: [130, 270, 400],
  },
];

export function nightById(id) {
  return NIGHTS.find((night) => night.id === id) ?? NIGHTS[0];
}

/** One short line naming the night's twist, for the sidebar and the title card. */
export function twistLine(night) {
  if (night.twist === TWIST_RAIN) return 'Rain: patient, soupy orders';
  if (night.twist === TWIST_FESTIVAL) return 'Festival: an early rush';
  if (night.twist === TWIST_CRITIC) return 'Critic: ★ VIPs pay double';
  return night.id === 1 ? 'Two dishes to learn' : 'Every dish, fastest crowd';
}
