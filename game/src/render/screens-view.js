// The screens over the kitchen: the title sign and how to play, the pause card and the end-of-night
// results with their stars.
import { FONT, PALETTE, SHIFT } from '../config.js';
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
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, r * 1.05, r * 0.85 * Math.abs(i * 0.6 + (i === 0 ? 0.01 : 0)), r, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a272d';
  ctx.fillRect(-r * 0.5, r * 1.9, r, r * 0.25);
  ctx.restore();
}

export function drawTitle(ctx, time, best) {
  dim(ctx, 0.55);
  for (let i = 0; i < 6; i += 1) drawLantern(ctx, 120 + i * 208, 40 + (i % 2) * 18, 22, time);
  // The stall's sign.
  roundRect(ctx, 330, 92, 620, 150, 18, '#5a2c22');
  roundRect(ctx, 340, 102, 600, 130, 14, '#7d3a28');
  ctx.strokeStyle = '#e0b45a';
  ctx.lineWidth = 3;
  ctx.strokeRect(352, 114, 576, 106);
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,80,0.8)';
  ctx.shadowBlur = 24;
  text(ctx, 'STEAM LANTERN', 640, 158, 64, '#ffe1a6');
  ctx.restore();
  text(ctx, 'a night-market noodle stall', 640, 204, 20, '#f6d7b0', 'center', 'italic bold');

  // Tonight's menu.
  roundRect(ctx, 150, 268, 980, 196, 14, 'rgba(246,236,216,0.95)');
  text(ctx, "TONIGHT'S MENU", 640, 290, 16, PALETTE.inkSoft);
  RECIPES.forEach((recipe, i) => {
    const x = 232 + i * 163;
    drawDish(ctx, recipe.items, x, 352, 34, { steam: time + i });
    text(ctx, recipe.name, x, 404, 14, PALETTE.ink);
    recipe.items.forEach((kind, k) => drawIngredientIcon(ctx, kind, x - (recipe.items.length - 1) * 11 + k * 22, 434, 22));
  });

  // How to play.
  roundRect(ctx, 150, 480, 980, 150, 14, 'rgba(30,18,36,0.88)');
  const lines = [
    ['Move', 'WASD / arrow keys, or click a station to walk there'],
    ['Work', 'Space or E: pick up, put down, plate, serve; hold Space (or the mouse) to chop'],
    ['Prep', 'Chop on a board, boil in a pot, sear on the griddle. Watch the rings: food burns'],
    ['Serve', 'Build the dish on a mat, carry it to the PASS before the ticket runs out'],
    ['Keys', '1–8 walk to a crate · Q bins what you hold · P pauses · M mutes'],
  ];
  lines.forEach(([head, body], i) => {
    text(ctx, head, 236, 506 + i * 25, 15, '#ffb36b', 'right');
    text(ctx, body, 252, 506 + i * 25, 15, PALETTE.text, 'left', 'normal');
  });
  const blink = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  text(ctx, 'Click or press Space to open the stall', 640, 666, 24, '#ffe1a6');
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `Best night: ${best} coins`, 640, 698, 14, 'rgba(255,240,220,0.7)', 'center', 'normal');
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
  ctx.fillStyle = filled ? PALETTE.coin : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#c99a2e' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

const VERDICTS = ['The lanterns flicker out early…', 'A decent night at the market', 'The queue went round the block!', 'Legend of the night market!'];

export function drawResults(ctx, shift, best, time, servedDishes) {
  dim(ctx, 0.62);
  roundRect(ctx, 300, 70, 680, 580, 20, '#f6ecd8');
  roundRect(ctx, 300, 70, 680, 86, 20, '#7d3a28');
  text(ctx, shift.closedEarly ? 'STALL CLOSED' : 'LAST LANTERN OUT', 640, 113, 38, '#ffe1a6');
  const stars = starsFor(shift.coins);
  for (let i = 0; i < 3; i += 1) drawStar(ctx, 540 + i * 100, 208, i === 1 ? 44 : 36, i < stars, time);
  text(ctx, VERDICTS[stars], 640, 266, 20, PALETTE.ink, 'center', 'italic bold');
  ctx.font = `bold 46px ${FONT}`;
  const coinsWidth = ctx.measureText(`${shift.coins}`).width;
  ctx.font = `normal 18px ${FONT}`;
  const left = 640 - (44 + coinsWidth + 12 + ctx.measureText('coins tonight').width) / 2;
  drawCoin(ctx, left + 20, 316, 20);
  text(ctx, `${shift.coins}`, left + 48, 318, 46, '#b07a12', 'left');
  text(ctx, 'coins tonight', left + 60 + coinsWidth, 322, 18, PALETTE.inkSoft, 'left', 'normal');
  const rows = [
    ['Dishes served', String(shift.served)],
    ['Customers lost', String(shift.missed)],
    ['Best combo', shift.bestCombo > 1 ? `x${shift.bestCombo}` : '–'],
    ['Best night', `${Math.max(best, shift.coins)} coins`],
  ];
  rows.forEach(([name, value], i) => {
    const y = 372 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(43,34,48,0.05)' : 'rgba(43,34,48,0.1)';
    ctx.fillRect(380, y - 15, 520, 30);
    text(ctx, name, 396, y, 18, PALETTE.ink, 'left', 'normal');
    text(ctx, value, 884, y, 18, PALETTE.ink, 'right');
  });
  // The night's last few dishes, lined up.
  servedDishes.slice(-6).forEach((contents, i, list) => {
    drawDish(ctx, contents, 640 - (list.length - 1) * 50 + i * 100, 540, 30);
  });
  const next = SHIFT.stars.find((needed) => needed > shift.coins);
  text(ctx, next ? `${next - shift.coins} more coins for the next star` : 'Every star earned!', 640, 590, 15, PALETTE.inkSoft, 'center', 'normal');
  const blink = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  text(ctx, 'Space or click to cook another night', 640, 624, 20, '#7d3a28');
  ctx.globalAlpha = 1;
}
