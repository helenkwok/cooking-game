// The status bar under the kitchen: what the chef has in hand and what it needs, the most urgent
// ticket and what its dish still lacks, and the controls.
import { FONT, PALETTE } from '../config.js';
import { heldTag, nextUp, prepWords } from '../hints.js';
import { INGREDIENTS } from '../recipes.js';
import { drawDish, drawIngredient, drawIngredientIcon } from './food-art.js';
import { STATUS_BAR } from './layout.js';

function text(ctx, value, x, y, size, colour, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(value, x, y);
}

function box(ctx, x, w, title) {
  const { y, h } = STATUS_BAR;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.fillStyle = '#2b1d22';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 7);
  ctx.fillStyle = '#3a272d';
  ctx.fill();
  text(ctx, title, x + 12, y + 15, 11.5, '#e7c27a');
}

function drawHands(ctx, world) {
  const x = STATUS_BAR.x;
  const w = 280;
  box(ctx, x, w, 'IN HAND');
  const held = world.chef.held;
  const y = STATUS_BAR.y + 44;
  if (held === null) {
    text(ctx, 'Empty: grab from a crate (1–8)', x + 14, y, 13, 'rgba(255,240,220,0.7)', 'left', 'normal');
    return;
  }
  if (held.dish) drawDish(ctx, held.contents, x + 32, y, 17);
  else drawIngredient(ctx, held, x + 32, y, 40);
  const tag = heldTag(world);
  const name = held.dish ? `Dish of ${held.contents.length}` : INGREDIENTS[held.kind].name;
  text(ctx, name, x + 60, y - 9, 14, PALETTE.text);
  text(ctx, tag.text, x + 60, y + 10, 13, tag.tone === 'good' ? PALETTE.good : tag.tone === 'bad' ? PALETTE.bad : '#ffb36b');
}

function drawNextUp(ctx, world) {
  const x = STATUS_BAR.x + 288;
  const w = 420;
  box(ctx, x, w, 'NEXT UP');
  const next = nextUp(world);
  const y = STATUS_BAR.y + 44;
  if (next === null) {
    text(ctx, 'No tickets yet: start a pot of noodles early', x + 14, y, 13, 'rgba(255,240,220,0.7)', 'left', 'normal');
    return;
  }
  const { ticket, missing } = next;
  const head = `${ticket.vip ? '★ ' : ''}${ticket.recipe.name} #${ticket.id}`;
  text(ctx, head, x + 14, y - 9, 14, ticket.vip ? PALETTE.coin : PALETTE.text);
  text(ctx, `${Math.ceil(ticket.left)}s`, x + w - 14, y - 9, 14, ticket.left / ticket.patience < 0.25 ? PALETTE.bad : 'rgba(255,240,220,0.7)', 'right');
  if (missing.length === 0) {
    text(ctx, 'Complete: pick it up and serve it at the PASS', x + 14, y + 11, 12.5, PALETTE.good, 'left', 'normal');
    return;
  }
  let cx = x + 14;
  for (const kind of missing.slice(0, 3)) {
    drawIngredientIcon(ctx, kind, cx + 9, y + 11, 22);
    const words = `${INGREDIENTS[kind].name}: ${prepWords(kind)}`;
    text(ctx, words, cx + 22, y + 11, 11.5, PALETTE.text, 'left', 'normal');
    ctx.font = `normal 11.5px ${FONT}`;
    cx += 32 + ctx.measureText(words).width;
    if (cx > x + w - 60) break;
  }
}

function drawControls(ctx) {
  const x = STATUS_BAR.x + 716;
  const w = STATUS_BAR.w - 716;
  box(ctx, x, w, 'CONTROLS');
  const y = STATUS_BAR.y + 35;
  text(ctx, 'WASD / click: walk · Space: work', x + 12, y, 11.5, PALETTE.text, 'left', 'normal');
  text(ctx, 'hold Space: chop · 1–8: crates', x + 12, y + 16, 11.5, PALETTE.text, 'left', 'normal');
  text(ctx, 'Q: bin · P: pause · M: mute', x + 12, y + 32, 11.5, 'rgba(255,240,220,0.7)', 'left', 'normal');
}

export function drawStatusBar(ctx, world) {
  drawHands(ctx, world);
  drawNextUp(ctx, world);
  drawControls(ctx);
}
