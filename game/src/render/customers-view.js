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
    // A big heart that pops up and floats, and a sparkle either side.
    const rise = Math.min(1, t * 2);
    ctx.font = `bold ${Math.round(18 + 16 * rise)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(60,20,30,0.6)';
    ctx.strokeText('♥', -30, -14 - rise * 8);
    ctx.fillStyle = '#ff5f7a';
    ctx.fillText('♥', -30, -14 - rise * 8);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✦', -52, -24 - rise * 6);
    ctx.fillText('✦', -10, -30 - rise * 8);
  } else if (mood === 'leaving') {
    // A storm cloud over a diner who gave up.
    ellipse(ctx, 34, -30, 16, 9, 'rgba(70,70,84,0.9)');
    ellipse(ctx, 25, -26, 10, 7, 'rgba(70,70,84,0.9)');
    ellipse(ctx, 44, -26, 10, 7, 'rgba(70,70,84,0.9)');
    ctx.strokeStyle = '#ffd25a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(36, -21);
    ctx.lineTo(30, -12);
    ctx.lineTo(37, -12);
    ctx.lineTo(31, -3);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The stools and the diners for the tickets on the rail. `orders.tickets` holds the waiting
 * tickets and the ones leaving (served or walked out) for their last moment.
 */
/** A delivery rider on a red scooter with a lantern box; waits, then rides off with the bag. */
function drawRider(ctx, x, y, ticket, time, away) {
  const urgent = ticket.leaving === 0 && ticket.left / ticket.patience < 0.25;
  ctx.save();
  ctx.globalAlpha = ticket.served ? 1 - away * 0.6 : 1 - away;
  ctx.translate(x + (urgent ? Math.sin(time * 18) * 1.5 : 0), y);
  // Wheels and body.
  for (const wx of [-30, 30]) {
    ellipse(ctx, wx, 2, 12, 12, '#1c1c22');
    ellipse(ctx, wx, 2, 5, 5, '#8a8f99');
  }
  ctx.beginPath();
  ctx.moveTo(-40, -6);
  ctx.quadraticCurveTo(-34, -30, -6, -26);
  ctx.lineTo(24, -26);
  ctx.quadraticCurveTo(44, -24, 42, -4);
  ctx.closePath();
  ctx.fillStyle = '#c9372f';
  ctx.fill();
  ctx.fillStyle = '#e8e1d2';
  ctx.fillRect(28, -46, 4, 22);
  // The delivery box with the stall's lantern on it.
  ctx.beginPath();
  ctx.roundRect(-44, -60, 34, 30, 4);
  ctx.fillStyle = '#f2a541';
  ctx.fill();
  ellipse(ctx, -27, -45, 7, 9, '#c9372f');
  // The rider: jacket, helmet, and the bag once it's handed over.
  ellipse(ctx, 2, -44, 13, 17, '#2f6fb0');
  ellipse(ctx, 4, -66, 11, 11, '#f2c49b');
  ctx.beginPath();
  ctx.arc(4, -69, 12, Math.PI, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#2f6fb0';
  ctx.fillRect(-8, -71, 24, 4);
  if (ticket.served) {
    ctx.beginPath();
    ctx.roundRect(14, -46, 16, 18, 3);
    ctx.fillStyle = '#d9b48a';
    ctx.fill();
  } else if (urgent) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.bad;
    ctx.fillText('!', 24, -74);
  }
  ctx.restore();
}

export function drawDiners(ctx, orders, time) {
  const taken = new Set();
  orders.tickets.forEach((ticket, index) => {
    if (index < SEATS.length) taken.add(index);
  });
  SEATS.forEach((x, i) => drawStool(ctx, x, !taken.has(i)));
  // Takeaway orders: a delivery rider waits on a scooter at the end of the counter.
  const riders = orders.tickets.filter((ticket) => ticket.takeaway);
  riders.forEach((ticket, i) => {
    const away = ticket.leaving > 0 ? Math.min(1, ticket.leaving / 0.6) : 0;
    drawRider(ctx, 1196 + i * 22 + (ticket.served ? away * 140 : 0), STREET_Y + 2 - i * 4, ticket, time, away);
  });
  orders.tickets.forEach((ticket, index) => {
    if (index >= SEATS.length || ticket.takeaway) return;
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
