// Feel: particles (vegetable bits, pot splashes, griddle sparks, coins), floating words, a little
// screen shake, the knife's stroke animation and the dishes that sit on the pass after serving.
// The world's events come in; this turns each into something seen at once.
import { FONT, PALETTE } from '../config.js';
import { ticketSlot, TICKET } from './hud-view.js';

const CHOP_COLOURS = {
  scallion: ['#57bb5a', '#c5e8a5'],
  mushroom: ['#8a5a36', '#d9b48a'],
  pork: ['#8c4a26', '#f2c6a8'],
};

export function createEffects() {
  return {
    particles: [],
    floaters: [],
    shake: 0,
    knives: {},
    coinPulse: 0,
    passDisplay: [],
    banner: null,
  };
}

function burst(fx, x, y, count, colours, speed, gravity, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    fx.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, gravity,
      life, age: 0, size: size * (0.6 + Math.random() * 0.6),
      colour: colours[Math.floor(Math.random() * colours.length)],
    });
  }
}

function floater(fx, x, y, words, colour, size = 20) {
  fx.floaters.push({ x, y, words, colour, size, age: 0 });
}

/** Turn this step's world events into effects; `orders` places ticket-side effects. */
export function applyEvents(fx, events, orders) {
  for (const e of events) {
    switch (e.type) {
      case 'chop':
        fx.knives[e.station] = 0.0001;
        burst(fx, e.x - 4, e.y - 2, 4, CHOP_COLOURS[e.kind] ?? ['#fff3d6'], 140, 600, 0.45, 5);
        break;
      case 'chopped':
        floater(fx, e.x, e.y - 40, 'Chopped!', '#c5f5b0', 18);
        burst(fx, e.x, e.y, 10, ['#fff7c2', '#ffffff'], 180, 300, 0.5, 4);
        break;
      case 'splash':
        burst(fx, e.x, e.y, 14, ['#cfe9ff', '#ffffff', '#9cc7e6'], 200, 700, 0.5, 5);
        break;
      case 'sizzle':
        burst(fx, e.x, e.y, 12, ['#ffd27a', '#ff8a3d', '#fff2b0'], 160, 200, 0.4, 3);
        break;
      case 'cooked':
        floater(fx, e.x, e.y - 50, 'Done!', '#9df0b0', 18);
        break;
      case 'burnt':
        floater(fx, e.x, e.y - 50, 'Burnt!', '#ff8f84', 22);
        burst(fx, e.x, e.y, 16, ['#333', '#555', '#777'], 120, -80, 1, 9);
        fx.shake = Math.max(fx.shake, 0.25);
        break;
      case 'plate':
        burst(fx, e.x, e.y - 10, 8, ['#fff7c2', '#ffd25a'], 120, 200, 0.4, 3);
        break;
      case 'refuse':
        floater(fx, e.x, e.y - 50, e.text, '#ffc4b8', 15);
        break;
      case 'serve': {
        floater(fx, e.x, e.y - 60, `+${e.earned}`, PALETTE.coin, 30);
        if (e.tip > 0) floater(fx, e.x + 70, e.y - 30, `tip ${e.tip}`, '#ffe9a8', 15);
        if (e.combo > 1) floater(fx, e.x - 70, e.y - 30, `combo x${e.combo}`, '#8ff0a4', 17);
        burst(fx, e.x, e.y - 10, 22, [PALETTE.coin, '#fff2b0', '#ffb547'], 260, 500, 0.8, 5);
        fx.coinPulse = 1;
        fx.passDisplay.push({ contents: e.contents, age: 0 });
        if (fx.passDisplay.length > 3) fx.passDisplay.shift();
        break;
      }
      case 'expire': {
        const index = orders.tickets.findIndex((t) => t.id === e.ticket);
        const slot = ticketSlot(Math.max(0, index));
        floater(fx, slot.x + TICKET.width / 2, slot.y + TICKET.height + 20, '-1 heart', '#ff8f84', 20);
        fx.shake = Math.max(fx.shake, 0.4);
        break;
      }
      case 'phase':
        fx.banner = e.phase === 1
          ? { message: 'NIGHT RUSH', sub: 'The market fills up: tickets come faster', life: 0 }
          : { message: 'LAST CALL', sub: 'Big orders now: finish strong', life: 0 };
        break;
      default:
    }
  }
}

export function updateEffects(fx, dt) {
  for (const p of fx.particles) {
    p.age += dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.particles = fx.particles.filter((p) => p.age < p.life);
  for (const f of fx.floaters) f.age += dt;
  fx.floaters = fx.floaters.filter((f) => f.age < 1.1);
  for (const id of Object.keys(fx.knives)) {
    fx.knives[id] += dt * 7;
    if (fx.knives[id] >= 1) delete fx.knives[id];
  }
  for (const d of fx.passDisplay) d.age += dt;
  fx.passDisplay = fx.passDisplay.filter((d) => d.age < 1.6);
  fx.shake = Math.max(0, fx.shake - dt);
  fx.coinPulse = Math.max(0, fx.coinPulse - dt * 3);
  if (fx.banner !== null) {
    fx.banner.life += dt;
    if (fx.banner.life > 2.2) fx.banner = null;
  }
}

export function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx, fx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of fx.floaters) {
    const t = f.age / 1.1;
    ctx.globalAlpha = 1 - t * t;
    ctx.font = `bold ${f.size}px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(30,15,30,0.8)';
    ctx.strokeText(f.words, f.x, f.y - t * 40);
    ctx.fillStyle = f.colour;
    ctx.fillText(f.words, f.x, f.y - t * 40);
  }
  ctx.globalAlpha = 1;
}
