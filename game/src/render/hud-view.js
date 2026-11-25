// The order board and the service panel: tickets clipped to a brass rail (each with its dish, its
// ingredients and a patience bar that turns from green to red), the shift clock, the takings,
// the hearts and the combo.
import { FONT, PALETTE, SHIFT } from '../config.js';
import { PHASES, phaseIndex, priceOf, secondsLeft, shiftProgress } from '../shift.js';
import { drawDish, drawIngredientIcon } from './food-art.js';

const TAU = Math.PI * 2;
export const TICKET = { width: 196, height: 128, gap: 10, left: 24, top: 10 };

function text(ctx, value, x, y, size, colour, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(value, x, y);
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Where ticket number `index` hangs on the rail. */
export function ticketSlot(index) {
  return { x: TICKET.left + index * (TICKET.width + TICKET.gap), y: TICKET.top };
}

function patienceColour(fraction) {
  if (fraction > 0.5) return PALETTE.good;
  if (fraction > 0.25) return PALETTE.warn;
  return PALETTE.bad;
}

function drawCheck(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, TAU);
  ctx.fillStyle = '#2e9e52';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y);
  ctx.lineTo(x - 1, y + 3);
  ctx.lineTo(x + 4, y - 3);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTicket(ctx, ticket, x, y, time, have) {
  const fraction = ticket.left / ticket.patience;
  const urgent = fraction < 0.25 && ticket.leaving === 0;
  ctx.save();
  // Slide in from the right when new; lift away when served, drop when missed.
  const enter = Math.min(1, ticket.age / 0.35);
  let ox = (1 - enter * (2 - enter)) * 260;
  let oy = 0;
  let alpha = 1;
  if (ticket.leaving > 0) {
    const t = ticket.leaving / 0.6;
    oy = ticket.served ? -t * 40 : t * 60;
    alpha = 1 - t;
  }
  if (urgent) ox += Math.sin(time * 40) * 1.5;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x + ox, y + oy);
  ctx.rotate(Math.sin(ticket.id * 1.7) * 0.015);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(4, 6, TICKET.width, TICKET.height);
  if (ticket.vip) {
    // The critic's ticket: gold card with a pulsing gold edge.
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,90,0.9)';
    ctx.shadowBlur = 10 + 6 * Math.sin(time * 5);
    roundRect(ctx, -2, -2, TICKET.width + 4, TICKET.height + 4, 6, '#e0b43c');
    ctx.restore();
  }
  roundRect(ctx, 0, 0, TICKET.width, TICKET.height, 4, urgent ? '#ffe2d6' : ticket.vip ? '#fff3cf' : PALETTE.paper);
  roundRect(ctx, 0, 0, TICKET.width, 26, 4, ticket.vip ? '#b8860b' : ticket.recipe.hue);
  text(ctx, `${ticket.vip ? '★ ' : ''}${ticket.recipe.name}`, TICKET.width / 2, 14, 15, '#fffaf0');
  text(ctx, `#${ticket.id}`, TICKET.width / 2 + 4, TICKET.height - 33, 11, PALETTE.inkSoft, 'center', 'normal');
  drawDish(ctx, ticket.recipe.items, 42, 64, 25);
  // The ingredients, two rows of icons.
  ticket.recipe.items.forEach((kind, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const ix = 92 + col * 28;
    const iy = 46 + row * 30;
    const done = have.includes(kind);
    roundRect(ctx, ix - 13, iy - 13, 26, 26, 6, done ? '#cdeccf' : PALETTE.paperShade);
    drawIngredientIcon(ctx, kind, ix, iy, 30);
    if (done) drawCheck(ctx, ix + 10, iy - 10);
  });
  // Patience bar.
  roundRect(ctx, 8, TICKET.height - 20, TICKET.width - 16, 12, 6, 'rgba(43,34,48,0.18)');
  roundRect(ctx, 8, TICKET.height - 20, Math.max(6, (TICKET.width - 16) * fraction), 12, 6, patienceColour(fraction));
  text(ctx, `${Math.ceil(ticket.left)}s`, TICKET.width - 12, TICKET.height - 33, 12, urgent ? PALETTE.bad : PALETTE.inkSoft, 'right');
  text(ctx, `${priceOf(ticket)}c`, 12, TICKET.height - 33, 12, ticket.vip || ticket.special ? '#b8860b' : PALETTE.inkSoft, 'left');
  if (ticket.special) {
    // Tonight's special: a red ribbon across the corner.
    ctx.save();
    ctx.translate(TICKET.width - 22, 40);
    ctx.rotate(0.5);
    roundRect(ctx, -34, -9, 68, 18, 3, '#c9372f');
    text(ctx, 'SPECIAL', 0, 1, 11, '#fff3d6');
    ctx.restore();
  }
  if (ticket.leaving > 0) {
    ctx.save();
    ctx.translate(TICKET.width / 2, 70);
    ctx.rotate(-0.25);
    ctx.strokeStyle = ticket.served ? '#2e9e52' : '#c9372f';
    ctx.lineWidth = 4;
    ctx.strokeRect(-62, -18, 124, 36);
    text(ctx, ticket.served ? 'SERVED' : 'WALKED OUT', 0, 1, ticket.served ? 22 : 16, ticket.served ? '#2e9e52' : '#c9372f');
    ctx.restore();
  }
  // The clip.
  roundRect(ctx, TICKET.width / 2 - 14, -6, 28, 12, 3, '#b8a160');
  ctx.restore();
}

/** The rail and its tickets; `progress` maps a ticket id to the ingredients already in its dish. */
export function drawOrderBoard(ctx, orders, time, progress) {
  roundRect(ctx, 10, 4, 1056, 140, 10, '#2b1d22');
  roundRect(ctx, 14, 8, 1048, 132, 8, '#3a272d');
  ctx.fillStyle = '#c8a95a';
  ctx.fillRect(16, 10, 1044, 5);
  if (orders.tickets.length === 0) text(ctx, 'Waiting for the first customers…', 538, 76, 18, 'rgba(255,240,220,0.5)', 'center', 'normal');
  // Tickets stay on the board: one sliding in or out never spills over the service panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(14, 0, 1048, 144);
  ctx.clip();
  orders.tickets.forEach((ticket, index) => {
    const slot = ticketSlot(index);
    drawTicket(ctx, ticket, slot.x, slot.y, time, progress.get(ticket.id) ?? []);
  });
  ctx.restore();
}

function drawHeart(ctx, x, y, size, full) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.25, x - size * 0.45, y - size * 0.95, x, y - size * 0.4);
  ctx.bezierCurveTo(x + size * 0.45, y - size * 0.95, x + size, y - size * 0.25, x, y + size * 0.35);
  ctx.fillStyle = full ? '#ff5d6c' : 'rgba(255,255,255,0.15)';
  ctx.fill();
}

export function drawCoin(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#c99a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 1, r * 0.86, 0, TAU);
  ctx.fillStyle = PALETTE.coin;
  ctx.fill();
  ctx.fillStyle = '#c99a2e';
  ctx.fillRect(x - r * 0.25, y - r * 0.25 - 1, r * 0.5, r * 0.5);
}

/** The clock, phase, takings, hearts and combo on the panel to the right of the order board. */
export function drawServicePanel(ctx, shift, time, coinPulse) {
  roundRect(ctx, 1076, 4, 194, 140, 10, '#2b1d22');
  roundRect(ctx, 1080, 8, 186, 132, 8, '#3a272d');
  // The dial: a lantern-moon that empties as the night runs out.
  const cx = 1126;
  const cy = 66;
  const left = 1 - shiftProgress(shift);
  const lowTime = secondsLeft(shift) <= 30;
  ctx.beginPath();
  ctx.arc(cx, cy, 43, 0, TAU);
  ctx.fillStyle = '#1b1426';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 39, -Math.PI / 2, -Math.PI / 2 + TAU * left);
  ctx.closePath();
  ctx.fillStyle = lowTime && Math.floor(time * 4) % 2 ? PALETTE.bad : PALETTE.lantern;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, TAU);
  ctx.fillStyle = '#2b1d22';
  ctx.fill();
  const seconds = Math.ceil(secondsLeft(shift));
  text(ctx, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, cx, cy + 1, 18, lowTime ? '#ff9b8f' : PALETTE.text);
  // Phase pips under the dial.
  PHASES.forEach((phase, i) => {
    ctx.beginPath();
    ctx.arc(cx - 16 + i * 16, cy + 58, 5, 0, TAU);
    ctx.fillStyle = i <= phaseIndex(shift) ? PALETTE.lantern : 'rgba(255,255,255,0.15)';
    ctx.fill();
  });
  const phase = PHASES[phaseIndex(shift)].name;
  text(ctx, phase.toUpperCase(), 1262, 24, 12, phaseIndex(shift) === 1 ? '#ffb070' : 'rgba(255,240,220,0.75)', 'right');
  // Takings.
  const pulse = 1 + coinPulse * 0.25;
  drawCoin(ctx, 1186, 56, 10 * pulse);
  text(ctx, String(shift.coins), 1200, 57, 26 * pulse, PALETTE.coin, 'left');
  for (let i = 0; i < SHIFT.hearts; i += 1) drawHeart(ctx, 1188 + i * 17, 92, 7, i < shift.hearts);
  if (shift.combo > 1) text(ctx, `COMBO x${shift.combo}`, 1262, 124, 13, '#8ff0a4', 'right');
  else text(ctx, `${shift.served} served`, 1262, 124, 12, 'rgba(255,240,220,0.55)', 'right', 'normal');
}

/** Big centred banners: the phase changes, the last thirty seconds. */
export function drawBanner(ctx, message, sub, life) {
  const t = Math.min(1, life);
  const alpha = life > 1.6 ? Math.max(0, (2.2 - life) / 0.6) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const slide = (1 - Math.min(1, t * 3)) * -80;
  roundRect(ctx, 390 + slide, 330, 500, 92, 14, 'rgba(30,18,36,0.85)');
  ctx.strokeStyle = PALETTE.lantern;
  ctx.lineWidth = 3;
  ctx.strokeRect(398 + slide, 338, 484, 76);
  text(ctx, message, 640 + slide, 366, 34, '#ffd08a');
  text(ctx, sub, 640 + slide, 398, 15, PALETTE.text, 'center', 'normal');
  ctx.restore();
}
