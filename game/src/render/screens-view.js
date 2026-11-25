// The screens over the kitchen: the title sign with tonight's menu and the five-night picker, the
// pause card, and the end-of-night results with their stars and what the night unlocked.
import { FONT, PALETTE, SCORE } from '../config.js';
import { NIGHTS, twistLine } from '../nights.js';
import { PERKS } from '../perks.js';
import { RECIPES } from '../recipes.js';
import { starsFor } from '../shift.js';
import { drawDish, drawIngredientIcon } from './food-art.js';
import { drawCoin } from './hud-view.js';

const TAU = Math.PI * 2;

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

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(16,10,24,${alpha})`;
  ctx.fillRect(0, 0, 1280, 720);
}

function drawLantern(ctx, x, y, r, time) {
  const sway = Math.sin(time * 1.5 + x) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  const glow = ctx.createRadialGradient(0, r, 4, 0, r, r * 3);
  glow.addColorStop(0, 'rgba(255,150,70,0.45)');
  glow.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-r * 3, -r * 2, r * 6, r * 6);
  ctx.strokeStyle = '#2b1d22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 2);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#3a272d';
  ctx.fillRect(-r * 0.5, 0, r, r * 0.25);
  ctx.beginPath();
  ctx.ellipse(0, r * 1.05, r * 0.85, r, 0, 0, TAU);
  ctx.fillStyle = PALETTE.lantern;
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,50,20,0.6)';
  for (const k of [0.3, 0.65]) {
    ctx.beginPath();
    ctx.ellipse(0, r * 1.05, r * 0.85 * k, r, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a272d';
  ctx.fillRect(-r * 0.5, r * 1.9, r, r * 0.25);
  ctx.restore();
}

function drawStars(ctx, x, y, count, size) {
  for (let i = 0; i < 3; i += 1) text(ctx, '★', x + (i - 1) * size, y, size, i < count ? PALETTE.coin : 'rgba(255,255,255,0.18)');
}

/** One night's card on the title screen picker. */
function drawNightCard(ctx, night, x, y, progress, selected, time) {
  const open = night.id <= progress.unlocked;
  const w = 188;
  const h = 112;
  if (selected) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,80,0.9)';
    ctx.shadowBlur = 14 + 4 * Math.sin(time * 4);
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12, PALETTE.lantern);
    ctx.restore();
  }
  roundRect(ctx, x, y, w, h, 10, open ? 'rgba(246,236,216,0.97)' : 'rgba(90,70,80,0.9)');
  roundRect(ctx, x, y, w, 26, 10, open ? '#7d3a28' : '#4a3a44');
  text(ctx, `NIGHT ${night.id}`, x + w / 2, y + 14, 13, open ? '#ffe1a6' : 'rgba(255,240,220,0.5)');
  text(ctx, night.name, x + w / 2, y + 44, 16, open ? PALETTE.ink : 'rgba(255,240,220,0.55)');
  const twist = twistLine(night);
  text(ctx, twist.length > 28 ? `${twist.slice(0, 27)}…` : twist, x + w / 2, y + 66, 11, open ? PALETTE.inkSoft : 'rgba(255,240,220,0.4)', 'center', 'normal');
  if (open) drawStars(ctx, x + w / 2, y + 92, progress.stars[night.id] ?? 0, 18);
  else text(ctx, '🔒 earn a star first', x + w / 2, y + 92, 12, 'rgba(255,240,220,0.6)', 'center', 'normal');
}

export function drawTitle(ctx, time, progress, selected) {
  dim(ctx, 0.62);
  for (let i = 0; i < 6; i += 1) drawLantern(ctx, 120 + i * 208, 30 + (i % 2) * 14, 18, time);
  // The stall's sign.
  roundRect(ctx, 360, 60, 560, 126, 18, '#5a2c22');
  roundRect(ctx, 368, 68, 544, 110, 14, '#7d3a28');
  ctx.strokeStyle = '#e0b45a';
  ctx.lineWidth = 3;
  ctx.strokeRect(380, 78, 520, 90);
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,80,0.8)';
  ctx.shadowBlur = 24;
  text(ctx, 'STEAM LANTERN', 640, 114, 56, '#ffe1a6');
  ctx.restore();
  text(ctx, 'a night-market noodle stall · 5 nights · 5 stall upgrades', 640, 152, 18, '#f6d7b0', 'center', 'italic bold');

  // The menu: six dishes from eight ingredients.
  roundRect(ctx, 130, 198, 1020, 160, 14, 'rgba(246,236,216,0.96)');
  text(ctx, 'THE MENU: SIX DISHES FROM EIGHT INGREDIENTS', 640, 216, 14, PALETTE.inkSoft);
  RECIPES.forEach((recipe, i) => {
    const x = 215 + i * 170;
    drawDish(ctx, recipe.items, x, 268, 30, { steam: time + i });
    text(ctx, recipe.name, x, 314, 14, PALETTE.ink);
    recipe.items.forEach((kind, k) => drawIngredientIcon(ctx, kind, x - (recipe.items.length - 1) * 11 + k * 22, 338, 22));
  });

  // The five nights.
  text(ctx, 'CHOOSE A NIGHT', 640, 378, 14, '#ffb36b');
  NIGHTS.forEach((night, i) => drawNightCard(ctx, night, 146 + i * 200, 392, progress, night.id === selected, time));

  // How to play.
  roundRect(ctx, 130, 518, 1020, 120, 14, 'rgba(30,18,36,0.9)');
  const lines = [
    ['Move', 'WASD / arrow keys, or click a station to walk there; 1–8 walk to a crate'],
    ['Work', 'Space or E: pick up, put down, plate, serve · hold Space (or the mouse) to chop'],
    ['Prep', 'Chop, boil, sear: stoves cook on their own. Pull at the gold glow for PERFECT; wander and it burns'],
    ['Serve', 'Build the dish on a mat and carry it to the PASS before the ticket runs out · Q bins · P pauses'],
  ];
  lines.forEach(([head, body], i) => {
    text(ctx, head, 214, 544 + i * 25, 15, '#ffb36b', 'right');
    text(ctx, body, 230, 544 + i * 25, 14.5, PALETTE.text, 'left', 'normal');
  });
  const blink = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  text(ctx, `Space or click to open the stall: Night ${selected}`, 640, 668, 24, '#ffe1a6');
  ctx.globalAlpha = 1;
  text(ctx, '1–5 or ← → choose a night', 640, 698, 13, 'rgba(255,240,220,0.65)', 'center', 'normal');
}

export function drawPaused(ctx) {
  dim(ctx, 0.6);
  roundRect(ctx, 460, 280, 360, 160, 16, 'rgba(30,18,36,0.95)');
  text(ctx, 'PAUSED', 640, 334, 40, '#ffe1a6');
  text(ctx, 'P, Esc or click to keep cooking', 640, 386, 16, PALETTE.text, 'center', 'normal');
}

function drawStar(ctx, x, y, r, filled, time) {
  ctx.save();
  ctx.translate(x, y);
  if (filled) ctx.rotate(Math.sin(time * 2 + x) * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.coin : 'rgba(43,34,48,0.12)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#c99a2e' : 'rgba(43,34,48,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

const VERDICTS = ['A quiet night at the market…', 'A decent night at the market', 'The queue went round the block!', 'Legend of the night market!'];

/**
 * The results card. `ready` is false for the moment it holds before it takes a key; `outcome`
 * is { best, opened } from the campaign record.
 */
/** Where the results card's upgrade rows sit (stage coordinates), for drawing and clicks. */
export const SHOP_ROW = { x: 664, y: 222, w: 424, h: 56, gap: 6 };

/** The upgrade row under a stage point (its index), or -1. */
export function perkRowAt(x, y) {
  const r = SHOP_ROW;
  if (x < r.x || x > r.x + r.w) return -1;
  const i = Math.floor((y - r.y) / (r.h + r.gap));
  return i >= 0 && i < PERKS.length && y - r.y - i * (r.h + r.gap) <= r.h ? i : -1;
}

/** The night's takings on the left; the stall's bank and its upgrades for sale on the right. */
export function drawResults(ctx, shift, time, servedDishes, ready, outcome, progress) {
  dim(ctx, 0.62);
  roundRect(ctx, 160, 52, 960, 616, 20, '#f6ecd8');
  roundRect(ctx, 160, 52, 960, 88, 20, '#7d3a28');
  text(ctx, `NIGHT ${shift.night.id} · ${shift.night.name.toUpperCase()}`, 640, 76, 15, '#f6d7b0');
  text(ctx, shift.closedEarly ? 'STALL CLOSED' : 'LAST LANTERN OUT', 640, 110, 32, '#ffe1a6');
  const cx = 404;
  const stars = starsFor(shift);
  for (let i = 0; i < 3; i += 1) drawStar(ctx, cx - 90 + i * 90, 184, i === 1 ? 38 : 31, i < stars, time);
  const verdict = shift.closedEarly && stars === 0 ? 'The lanterns flicker out early…' : VERDICTS[stars];
  text(ctx, verdict, cx, 236, 18, PALETTE.ink, 'center', 'italic bold');
  ctx.font = `bold 40px ${FONT}`;
  const coinsWidth = ctx.measureText(`${shift.coins}`).width;
  ctx.font = `normal 17px ${FONT}`;
  const left = cx - (40 + coinsWidth + 12 + ctx.measureText('coins tonight').width) / 2;
  drawCoin(ctx, left + 18, 280, 17);
  text(ctx, `${shift.coins}`, left + 44, 282, 40, '#b07a12', 'left');
  text(ctx, 'coins tonight', left + 56 + coinsWidth, 286, 17, PALETTE.inkSoft, 'left', 'normal');
  const rows = [
    ['Dishes served', shift.vipServed > 0 ? `${shift.served} (${shift.vipServed} VIP)` : String(shift.served)],
    ['Customers lost', String(shift.missed)],
    ['Best combo', shift.bestCombo > 1 ? `x${shift.bestCombo}` : '–'],
    ['PERFECT pulls', shift.perfects > 0 ? `${shift.perfects} (+${shift.perfects * SCORE.perfectBonus})` : '–'],
    ['Best on this night', `${Math.max(outcome?.best ?? 0, shift.coins)} coins`],
  ];
  rows.forEach(([name, value], i) => {
    const y = 324 + i * 26;
    ctx.fillStyle = i % 2 ? 'rgba(43,34,48,0.05)' : 'rgba(43,34,48,0.1)';
    ctx.fillRect(196, y - 12, 416, 24);
    text(ctx, name, 210, y, 16, PALETTE.ink, 'left', 'normal');
    text(ctx, value, 598, y, 16, PALETTE.ink, 'right');
  });
  servedDishes.slice(-6).forEach((contents, i, list) => {
    drawDish(ctx, contents, cx - (list.length - 1) * 35 + i * 70, 482, 23);
  });
  const next = shift.night.stars.find((needed) => needed > shift.coins);
  text(ctx, next ? `${next - shift.coins} more coins for the next star` : 'Every star earned!', cx, 522, 14, PALETTE.inkSoft, 'center', 'normal');
  if (progress) drawShop(ctx, progress, outcome, time);
  const nextNight = NIGHTS.find((n) => n.id === shift.night.id + 1);
  if (outcome?.opened && nextNight) {
    roundRect(ctx, 400, 564, 480, 34, 10, PALETTE.good);
    text(ctx, `Night ${nextNight.id} unlocked: ${nextNight.name}!`, 640, 582, 17, '#14301c');
  }
  if (ready) {
    const blink = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.globalAlpha = blink;
    const prompt = stars > 0 && nextNight ? `Space: Night ${nextNight.id} · R: replay this night` : 'Space: try this night again';
    text(ctx, prompt, 640, 634, 19, '#7d3a28');
    ctx.globalAlpha = 1;
  }
}

function drawShop(ctx, progress, outcome, time) {
  const r = SHOP_ROW;
  roundRect(ctx, r.x - 12, 158, r.w + 24, 392, 14, 'rgba(125,58,40,0.1)');
  text(ctx, 'STALL UPGRADES', r.x + 4, 180, 17, '#7d3a28', 'left');
  ctx.font = `bold 16px ${FONT}`;
  drawCoin(ctx, r.x + r.w - 18 - ctx.measureText(`${progress.bank} banked`).width, 180, 10);
  text(ctx, `${progress.bank} banked`, r.x + r.w - 4, 181, 16, '#b07a12', 'right');
  text(ctx, 'Every night’s coins bank here: 1–5 or click to buy', r.x + 4, 203, 12.5, PALETTE.inkSoft, 'left', 'normal');
  PERKS.forEach((perk, i) => {
    const y = r.y + i * (r.h + r.gap);
    const have = progress.perks.includes(perk.id);
    const afford = !have && progress.bank >= perk.cost;
    const fresh = outcome?.bought === i ? Math.max(0, 1 - (time - outcome.boughtAt) * 1.5) : 0;
    roundRect(ctx, r.x, y, r.w, r.h, 10, have ? '#d9efd9' : afford ? '#fff7e2' : 'rgba(43,34,48,0.06)');
    if (afford || fresh > 0) {
      ctx.strokeStyle = fresh > 0 ? `rgba(46,158,82,${0.4 + fresh * 0.6})` : '#e0a63a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(r.x + 1, y + 1, r.w - 2, r.h - 2, 10);
      ctx.stroke();
    }
    roundRect(ctx, r.x + 10, y + 14, 28, 28, 7, have ? PALETTE.good : '#7d3a28');
    text(ctx, have ? '✓' : String(i + 1), r.x + 24, y + 29, 15, '#fff', 'center');
    text(ctx, perk.name, r.x + 50, y + 19, 16, have || afford ? PALETTE.ink : PALETTE.inkSoft, 'left');
    text(ctx, perk.words, r.x + 50, y + 39, 13, PALETTE.inkSoft, 'left', 'normal');
    if (have) text(ctx, 'OWNED', r.x + r.w - 14, y + 29, 14, '#2e7d46', 'right');
    else {
      drawCoin(ctx, r.x + r.w - 62, y + 28, 9);
      text(ctx, String(perk.cost), r.x + r.w - 14, y + 29, 16, afford ? '#b07a12' : PALETTE.inkSoft, 'right');
    }
  });
  if (outcome?.note) text(ctx, outcome.note, r.x + r.w / 2, 540, 13.5, outcome.bought >= 0 ? '#2e7d46' : '#a8231d', 'center');
}
