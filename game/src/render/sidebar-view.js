// The sidebar beside the kitchen: tonight's place in the five-night campaign, the most urgent
// ticket and what its dish still lacks, what the chef holds, and a key to the kitchen's marks, so
// the stall explains itself.
import { FONT, PALETTE, SCORE } from '../config.js';
import { NIGHTS, twistLine } from '../nights.js';
import { heldTag, nextUp, prepWords } from '../hints.js';
import { INGREDIENTS } from '../recipes.js';
import { chopStrokes } from '../perks.js';
import { drawDish, drawIngredient, drawIngredientIcon } from './food-art.js';
import { SIDEBAR } from './layout.js';

const TAU = Math.PI * 2;

function text(ctx, value, x, y, size, colour, align = 'left', weight = 'bold') {
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

/** A framed panel with a gold heading; returns the y where its body starts. */
function panel(ctx, y, h, title) {
  const { x, w } = SIDEBAR;
  roundRect(ctx, x, y, w, h, 9, '#2b1d22');
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 7, '#3a272d');
  ctx.fillStyle = '#c8a95a';
  ctx.fillRect(x + 10, y + 24, w - 20, 1.5);
  text(ctx, title, x + 12, y + 14, 12.5, '#e7c27a');
  return y + 32;
}

function drawNights(ctx, shift, progress) {
  const { x, w } = SIDEBAR;
  let y = panel(ctx, SIDEBAR.y, 170, `NIGHT ${shift.night.id} OF ${NIGHTS.length}`);
  text(ctx, shift.night.name, x + 12, y + 6, 15, PALETTE.text);
  text(ctx, twistLine(shift.night), x + 12, y + 24, 11, '#ffb36b', 'left', 'normal');
  y += 42;
  for (const night of NIGHTS) {
    const current = night.id === shift.night.id;
    const done = (progress.stars[night.id] ?? 0) > 0;
    const open = night.id <= progress.unlocked;
    if (current) roundRect(ctx, x + 7, y - 9, w - 14, 19, 5, 'rgba(255,138,61,0.22)');
    const mark = current ? '▶' : done ? '✓' : open ? '•' : '🔒';
    text(ctx, mark, x + 15, y + 1, 11, current ? PALETTE.lantern : done ? PALETTE.good : 'rgba(255,240,220,0.5)', 'center');
    text(ctx, `${night.id}. ${night.name}`, x + 26, y + 1, 11.5, open ? PALETTE.text : 'rgba(255,240,220,0.4)', 'left', current ? 'bold' : 'normal');
    const stars = progress.stars[night.id] ?? 0;
    if (stars > 0) text(ctx, '★'.repeat(stars), x + w - 10, y + 1, 10, PALETTE.coin, 'right');
    y += 19;
  }
}

/** The most urgent ticket, and each thing its dish still needs with how to prep it. */
function drawNextUp(ctx, world) {
  const { x, w } = SIDEBAR;
  let y = panel(ctx, SIDEBAR.y + 176, 120, 'NEXT UP');
  const next = nextUp(world);
  if (next === null) {
    text(ctx, 'No tickets yet:', x + 12, y + 8, 12, 'rgba(255,240,220,0.7)', 'left', 'normal');
    text(ctx, 'start some noodles early', x + 12, y + 26, 12, 'rgba(255,240,220,0.7)', 'left', 'normal');
    return;
  }
  const { ticket, missing } = next;
  text(ctx, `${ticket.vip ? '★ ' : ''}${ticket.recipe.name}`, x + 12, y + 7, 13.5, ticket.vip ? PALETTE.coin : PALETTE.text);
  text(ctx, `${Math.ceil(ticket.left)}s`, x + w - 12, y + 7, 13, ticket.left / ticket.patience < 0.25 ? PALETTE.bad : 'rgba(255,240,220,0.7)', 'right');
  y += 28;
  if (missing.length === 0) {
    text(ctx, 'Complete! Take it', x + 12, y, 12, PALETTE.good, 'left', 'normal');
    text(ctx, 'to the PASS to serve', x + 12, y + 18, 12, PALETTE.good, 'left', 'normal');
    return;
  }
  for (const kind of missing.slice(0, 3)) {
    drawIngredientIcon(ctx, kind, x + 21, y, 20);
    text(ctx, `${INGREDIENTS[kind].name}: ${prepWords(kind)}`, x + 36, y, 11.5, PALETTE.text, 'left', 'normal');
    y += 19;
  }
}

/** What the chef carries, and what it needs next (or which dish it is on its way to be). */
function drawHands(ctx, world) {
  const { x } = SIDEBAR;
  const y = panel(ctx, SIDEBAR.y + 302, 72, 'IN HAND') + 15;
  const held = world.chef.held;
  if (held === null) {
    text(ctx, 'Empty: grab from a crate', x + 12, y, 12, 'rgba(255,240,220,0.7)', 'left', 'normal');
    return;
  }
  if (held.dish) drawDish(ctx, held.contents, x + 28, y, 15);
  else drawIngredient(ctx, held, x + 28, y, 34);
  const tag = heldTag(world);
  text(ctx, held.dish ? `Dish of ${held.contents.length}` : INGREDIENTS[held.kind].name, x + 54, y - 8, 13, PALETTE.text);
  text(ctx, tag.text, x + 54, y + 9, 12, tag.tone === 'good' ? PALETTE.good : tag.tone === 'bad' ? PALETTE.bad : '#ffb36b');
}

function keyIcon(ctx, kind, x, y) {
  if (kind === 'ring' || kind === 'gold' || kind === 'amber' || kind === 'red') {
    ctx.beginPath();
    ctx.arc(x, y, 7, -Math.PI / 2, kind === 'ring' ? Math.PI * 0.8 : Math.PI * 1.5);
    ctx.strokeStyle = { ring: PALETTE.good, gold: PALETTE.perfect, amber: PALETTE.warn, red: PALETTE.bad }[kind];
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else if (kind === 'dash') {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(140,255,170,0.9)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 8, y - 6, 16, 12);
    ctx.restore();
  } else if (kind === 'check') {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, TAU);
    ctx.fillStyle = '#2e9e52';
    ctx.fill();
    text(ctx, '✓', x, y + 1, 10, '#fff', 'center');
  } else if (kind === 'vip') {
    text(ctx, '★', x, y + 1, 15, PALETTE.coin, 'center');
  } else {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x - 6 + i * 6, y, 2.4, 0, TAU);
      ctx.fillStyle = i < 2 ? PALETTE.good : 'rgba(255,255,255,0.3)';
      ctx.fill();
    }
  }
}

function drawKey(ctx) {
  const { x } = SIDEBAR;
  let y = panel(ctx, SIDEBAR.y + 380, SIDEBAR.h - 380, 'KITCHEN KEY') + 2;
  const rows = [
    ['pips', `board: ${chopStrokes()} chops`],
    ['ring', 'cooking by itself'],
    ['gold', `gold: pull! PERFECT +${SCORE.perfectBonus}`],
    ['amber', 'done: take it off'],
    ['red', 'about to burn!'],
    ['dash', 'where your food goes'],
    ['check', 'already in the dish'],
    ['vip', 'VIP: double pay'],
  ];
  for (const [kind, words] of rows) {
    keyIcon(ctx, kind, x + 20, y + 4);
    text(ctx, words, x + 36, y + 4, 11.5, PALETTE.text, 'left', 'normal');
    y += 18.5;
  }
}

/** The whole sidebar. `progress` is the campaign record (which nights are done, and their stars). */
export function drawSidebar(ctx, world, progress) {
  drawNights(ctx, world.shift, progress);
  drawNextUp(ctx, world);
  drawHands(ctx, world);
  drawKey(ctx);
}
