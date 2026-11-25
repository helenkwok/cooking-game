// The stall's lived-in details: a stack of glazed bowls and a chopstick cup in the back-left
// corner, bamboo steamers puffing in the back-right one, the tip jar on the front counter that
// fills with coins as the night's takings grow, and the vignette that frames the kitchen.
import { FONT } from '../config.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawBowlStack(ctx, x, y) {
  for (let i = 0; i < 4; i += 1) {
    const by = y - i * 9;
    ellipse(ctx, x, by + 4, 40, 15, '#22365e');
    ellipse(ctx, x, by, 40, 15, '#3d5f99');
    ellipse(ctx, x, by - 1, 33, 11, '#f3ead9');
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU;
    ellipse(ctx, x + Math.cos(a) * 37, y - 27 + Math.sin(a) * 13.5, 3, 2, '#f6e7c8');
  }
}

function drawChopstickCup(ctx, x, y) {
  ctx.strokeStyle = '#8a5a36';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 8 + i * 4, y - 10);
    ctx.lineTo(x - 16 + i * 8, y - 52 + (i % 2) * 6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(x - 16, y - 18, 32, 36, 6);
  ctx.fillStyle = '#b8321f';
  ctx.fill();
  ctx.fillStyle = '#f0c27a';
  ctx.fillRect(x - 16, y - 6, 32, 5);
}

function drawSteamers(ctx, x, y, time) {
  for (let i = 0; i < 3; i += 1) {
    const by = y - i * 18;
    ctx.beginPath();
    ctx.roundRect(x - 46, by - 10, 92, 22, 8);
    ctx.fillStyle = i % 2 ? '#c99a5a' : '#d8ab68';
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,70,30,0.6)';
    ctx.lineWidth = 2;
    for (let k = -3; k <= 3; k += 1) {
      ctx.beginPath();
      ctx.moveTo(x + k * 12, by - 9);
      ctx.lineTo(x + k * 12, by + 11);
      ctx.stroke();
    }
  }
  ellipse(ctx, x, y - 46, 46, 12, '#e3bb7a');
  ellipse(ctx, x, y - 48, 12, 6, '#b78845');
  for (let i = 0; i < 4; i += 1) {
    const rise = (time * 0.45 + i / 4) % 1;
    ellipse(ctx, x - 24 + i * 16 + Math.sin(rise * 6 + i) * 6, y - 60 - rise * 60, 10 + rise * 12, 7 + rise * 8, `rgba(255,255,255,${0.4 * (1 - rise)})`);
  }
}

/** The back corners of the counter, either side of the crates. */
export function drawCornerProps(ctx, time) {
  drawBowlStack(ctx, 112, 214);
  drawChopstickCup(ctx, 186, 214);
  drawSteamers(ctx, 1150, 222, time);
}

/** The tip jar: glass with a paper label, filling with coins as the takings grow. */
export function drawTipJar(ctx, x, y, coins) {
  const fill = Math.min(1, coins / 400);
  ellipse(ctx, x, y + 34, 40, 10, 'rgba(0,0,0,0.25)');
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 30, 68, 64, 14);
  ctx.fillStyle = 'rgba(210,235,240,0.35)';
  ctx.fill();
  if (fill > 0) {
    const top = y + 30 - 56 * fill;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x - 30, y - 26, 60, 56, 11);
    ctx.clip();
    ctx.fillStyle = '#d9a52c';
    ctx.fillRect(x - 30, top, 60, y + 30 - top);
    for (let i = 0; i < 14 * fill + 2; i += 1) {
      ellipse(ctx, x - 22 + ((i * 17) % 44), top + 4 + ((i * 7) % 10), 8, 3.5, i % 2 ? '#ffd25a' : '#f0bc3a');
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 30, 68, 64, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x - 26, y - 22, 6, 40);
  ctx.beginPath();
  ctx.roundRect(x - 38, y - 40, 76, 12, 5);
  ctx.fillStyle = '#7d3a28';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 24, y + 2, 48, 20, 4);
  ctx.fillStyle = '#f6ecd8';
  ctx.fill();
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7d3a28';
  ctx.fillText('TIPS', x, y + 12.5);
}

/** Darkens the stage's edges a little, so the eye goes to the kitchen's middle. */
export function drawVignette(ctx) {
  const v = ctx.createRadialGradient(640, 400, 380, 640, 400, 860);
  v.addColorStop(0, 'rgba(20,8,20,0)');
  v.addColorStop(1, 'rgba(20,8,20,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1280, 720);
}
