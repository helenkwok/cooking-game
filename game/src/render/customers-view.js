// The diners: the street in front of the stall and a row of red-topped stools, one diner per
// ticket on the rail (seat order follows rail order), seen from behind. Waiting diners fidget,
// impatient ones fume, the critic wears a beret and glows gold, a served diner bobs happily with
// their bowl, and one who gives up stands and walks off.
import { PALETTE } from '../config.js';
import { drawDish } from './food-art.js';

const TAU = Math.PI * 2;
/** Stool x positions along the front counter, left to right (kitchen coordinates). */
export const SEATS = [300, 440, 580, 720, 860, 1000];
const STREET_Y = 720;
const HAIR = ['#2b1d18', '#4a3020', '#1d1d2b', '#6b4a2b', '#8a8a8a', '#3a2418'];
const COATS = ['#3d6b8f', '#8f3d4a', '#4f7a4a', '#6a4f8f', '#b07a3a', '#3a5a5a', '#8f6a3d'];

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The street strip below the counter: worn paving stones under the night sky's spill of light. */
export function drawStreet(ctx) {
  ctx.fillStyle = '#4a4048';
  ctx.fillRect(0, STREET_Y, 1280, 60);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 26; col += 1) {
      const x = col * 52 + (row % 2) * 26;
      ctx.fillStyle = (row + col) % 3 === 0 ? '#5a4e56' : '#544850';
      ctx.fillRect(x + 2, STREET_Y + 2 + row * 20, 48, 17);
    }
  }
  const shade = ctx.createLinearGradient(0, STREET_Y, 0, STREET_Y + 26);
  shade.addColorStop(0, 'rgba(20,8,10,0.55)');
  shade.addColorStop(1, 'rgba(20,8,10,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, STREET_Y, 1280, 26);
}

function drawStool(ctx, x, empty) {
  ctx.fillStyle = '#9aa7b0';
  ctx.fillRect(x - 3, STREET_Y + 20, 6, 40);
  ellipse(ctx, x, STREET_Y + 20, 26, 9, '#7a1c18');
  ellipse(ctx, x, STREET_Y + 17, 25, 8, empty ? '#d33a2f' : '#b8322a');
}

/** A seated diner from behind, `mood` in waiting / urgent / happy / leaving, `t` animates. */
function drawDiner(ctx, x, ticket, mood, t, time) {
  const id = ticket.id;
  const hair = HAIR[id % HAIR.length];
  const coat = ticket.vip ? '#2b2230' : COATS[(id * 3) % COATS.length];
  let y = STREET_Y + 8;
  let alpha = 1;
  let dx = 0;
  if (mood === 'happy') y -= Math.abs(Math.sin(time * 9 + id)) * 6;
  if (mood === 'urgent') dx = Math.sin(time * 18 + id) * 2;
  if (mood === 'leaving') {
    y -= t * 10;
    dx = t * 70 * (id % 2 ? 1 : -1);
    alpha = 1 - t;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + dx, y);
  if (ticket.vip) {
    const glow = ctx.createRadialGradient(0, -20, 6, 0, -20, 60);
    glow.addColorStop(0, 'rgba(255,210,90,0.45)');
    glow.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-60, -80, 120, 120);
  }
  // Shoulders and back, then the head from behind.
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 26, 0, Math.PI, TAU);
  ctx.lineTo(34, 40);
  ctx.lineTo(-34, 40);
  ctx.closePath();
  ctx.fillStyle = coat;
  ctx.fill();
  ellipse(ctx, 0, -2, 9, 5, '#e6b48f');
  ellipse(ctx, 0, -16, 19, 18, hair);
  ellipse(ctx, -6, -24, 7, 4, 'rgba(255,255,255,0.12)');
  if (ticket.vip) {
    // The critic's beret and its stalk.
    ellipse(ctx, 2, -31, 21, 8, '#7d1f2b');
    ctx.fillStyle = '#7d1f2b';
    ctx.fillRect(1, -42, 3, 7);
  } else if (id % 4 === 1) {
    // A cap.
    ctx.beginPath();
    ctx.ellipse(0, -25, 19, 11, 0, Math.PI, TAU);
    ctx.fillStyle = COATS[(id + 2) % COATS.length];
    ctx.fill();
  }
  // Mood marks over the head.
  if (mood === 'urgent') {
    ctx.strokeStyle = PALETTE.bad;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(14 + Math.cos(a) * 3, -40 + Math.sin(a) * 3);
      ctx.lineTo(14 + Math.cos(a) * 9, -40 + Math.sin(a) * 9);
      ctx.stroke();
    }
    const puff = (time * 1.5 + id) % 1;
    ellipse(ctx, -10, -40 - puff * 16, 5 + puff * 4, 4 + puff * 3, `rgba(255,255,255,${0.5 * (1 - puff)})`);
  } else if (mood === 'happy') {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7a8a';
    ctx.fillText('♥', 16, -40 - (time * 30 % 10));
  }
  ctx.restore();
}

/**
 * The stools and the diners for the tickets on the rail. `orders.tickets` holds the waiting
 * tickets and the ones leaving (served or walked out) for their last moment.
 */
export function drawDiners(ctx, orders, time) {
  const taken = new Set();
  orders.tickets.forEach((ticket, index) => {
    if (index < SEATS.length) taken.add(index);
  });
  SEATS.forEach((x, i) => drawStool(ctx, x, !taken.has(i)));
  orders.tickets.forEach((ticket, index) => {
    if (index >= SEATS.length) return;
    const x = SEATS[index];
    let mood = 'waiting';
    let t = 0;
    if (ticket.leaving > 0) {
      t = Math.min(1, ticket.leaving / 0.6);
      mood = ticket.served ? 'happy' : 'leaving';
    } else if (ticket.left / ticket.patience < 0.25) mood = 'urgent';
    drawDiner(ctx, x, ticket, mood, t, time);
    if (ticket.served && ticket.leaving > 0) drawDish(ctx, ticket.recipe.items, x + 34, STREET_Y - 10, 16, { steam: time });
  });
}
