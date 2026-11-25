// The sidebar beside the kitchen: tonight's place in the five-night campaign, the live state of
// every burner, and a key to what the kitchen's marks mean, so the stall explains itself.
import { COOK, FONT, PALETTE } from '../config.js';
import { NIGHTS, twistLine } from '../nights.js';
import { stoveRows } from '../hints.js';
import { drawIngredientIcon } from './food-art.js';
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
  ctx.fillRect(x + 10, y + 26, w - 20, 1.5);
  text(ctx, title, x + 12, y + 15, 13, '#e7c27a');
  return y + 34;
}

function drawNights(ctx, shift, progress) {
  const { x, w } = SIDEBAR;
  const top = SIDEBAR.y;
  let y = panel(ctx, top, 190, `NIGHT ${shift.night.id} OF ${NIGHTS.length}`);
  text(ctx, shift.night.name, x + 12, y + 6, 17, PALETTE.text);
  text(ctx, twistLine(shift.night), x + 12, y + 26, 11.5, '#ffb36b', 'left', 'normal');
  y += 44;
  for (const night of NIGHTS) {
    const current = night.id === shift.night.id;
    const done = (progress.stars[night.id] ?? 0) > 0;
    const open = night.id <= progress.unlocked;
    if (current) roundRect(ctx, x + 8, y - 10, w - 16, 21, 5, 'rgba(255,138,61,0.22)');
    const mark = current ? '▶' : done ? '✓' : open ? '•' : '🔒';
    text(ctx, mark, x + 16, y + 1, 12, current ? PALETTE.lantern : done ? PALETTE.good : 'rgba(255,240,220,0.5)', 'center');
    text(ctx, `${night.id}. ${night.name}`, x + 28, y + 1, 12.5, open ? PALETTE.text : 'rgba(255,240,220,0.4)', 'left', current ? 'bold' : 'normal');
    const stars = progress.stars[night.id] ?? 0;
    if (stars > 0) text(ctx, '★'.repeat(stars), x + w - 12, y + 1, 11, PALETTE.coin, 'right');
    y += 22;
  }
}

const STATE_STYLE = {
  cooking: { colour: PALETTE.good, word: (r) => `${Math.round(r.fraction * 100)}%` },
  ready: { colour: PALETTE.warn, word: () => 'READY' },
  hot: { colour: PALETTE.bad, word: () => 'HOT!' },
  burnt: { colour: '#8a8a8a', word: () => 'BURNT' },
  empty: { colour: 'rgba(255,240,220,0.35)', word: () => '—' },
};

function drawStove(ctx, world, time) {
  const { x, w } = SIDEBAR;
  let y = panel(ctx, SIDEBAR.y + 198, 152, 'STOVE');
  for (const row of stoveRows(world)) {
    const style = STATE_STYLE[row.state];
    const flash = row.state === 'hot' && Math.floor(time * 6) % 2 === 0;
    text(ctx, row.name, x + 12, y + 4, 12, 'rgba(255,240,220,0.7)', 'left', 'normal');
    text(ctx, row.food, x + 84, y + 4, 12, row.state === 'empty' ? 'rgba(255,240,220,0.35)' : PALETTE.text);
    text(ctx, style.word(row), x + w - 12, y + 4, 12, flash ? '#fff' : style.colour, 'right');
    roundRect(ctx, x + 12, y + 14, w - 24, 5, 2.5, 'rgba(255,255,255,0.1)');
    if (row.state !== 'empty') roundRect(ctx, x + 12, y + 14, Math.max(4, (w - 24) * Math.min(1, row.fraction)), 5, 2.5, style.colour);
    y += 28;
  }
}

function keyIcon(ctx, kind, x, y) {
  if (kind === 'ring' || kind === 'amber' || kind === 'red') {
    ctx.beginPath();
    ctx.arc(x, y, 8, -Math.PI / 2, kind === 'ring' ? Math.PI * 0.8 : Math.PI * 1.5);
    ctx.strokeStyle = kind === 'ring' ? PALETTE.good : kind === 'amber' ? PALETTE.warn : PALETTE.bad;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else if (kind === 'dash') {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(140,255,170,0.9)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 9, y - 7, 18, 14);
    ctx.restore();
  } else if (kind === 'check') {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, TAU);
    ctx.fillStyle = '#2e9e52';
    ctx.fill();
    text(ctx, '✓', x, y + 1, 11, '#fff', 'center');
  } else if (kind === 'vip') {
    text(ctx, '★', x, y + 1, 16, PALETTE.coin, 'center');
  } else if (kind === 'pips') {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x - 6 + i * 6, y, 2.6, 0, TAU);
      ctx.fillStyle = i < 2 ? PALETTE.good : 'rgba(255,255,255,0.3)';
      ctx.fill();
    }
  } else drawIngredientIcon(ctx, kind, x, y, 22);
}

function drawKey(ctx) {
  const { x } = SIDEBAR;
  let y = panel(ctx, SIDEBAR.y + 358, SIDEBAR.h - 358, 'KITCHEN KEY');
  const rows = [
    ['pips', `board: ${COOK.chopStrokes} knife strokes to chop`],
    ['ring', 'cooking on its own'],
    ['amber', 'done: take it off'],
    ['red', 'about to burn!'],
    ['dash', 'where your food goes'],
    ['check', 'already in the dish'],
    ['vip', 'VIP: double pay, short wait'],
  ];
  for (const [kind, words] of rows) {
    keyIcon(ctx, kind, x + 22, y + 6);
    text(ctx, words, x + 38, y + 6, 11.5, PALETTE.text, 'left', 'normal');
    y += 24;
  }
}

/** The whole sidebar. `progress` is the campaign record (which nights are done, and their stars). */
export function drawSidebar(ctx, world, progress, time) {
  drawNights(ctx, world.shift, progress);
  drawStove(ctx, world, time);
  drawKey(ctx);
}
