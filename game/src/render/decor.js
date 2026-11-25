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

/** A red paper lantern (chochin) hanging from the valance, with a warm glow. */
function drawChochin(ctx, x, y, time) {
  const sway = Math.sin(time * 1.3 + x) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  const glow = ctx.createRadialGradient(0, 30, 6, 0, 30, 80);
  glow.addColorStop(0, 'rgba(255,120,60,0.5)');
  glow.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-80, -50, 160, 160);
  ctx.fillStyle = '#2b1d22';
  ctx.fillRect(-12, 0, 24, 6);
  ellipse(ctx, 0, 32, 24, 28, '#d8322a');
  ctx.strokeStyle = 'rgba(120,20,15,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-24 + i * 0.4, 6 + i * 9.5);
    ctx.quadraticCurveTo(0, 10 + i * 9.5, 24 - i * 0.4, 6 + i * 9.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#2b1d22';
  ctx.fillRect(-12, 58, 24, 6);
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('湯', 0, 32);
  ctx.restore();
}

/**
 * The stall's noren valance across the top: red cloth with a white wave band and a scalloped hem,
 * the stall's name in the middle, and a paper lantern at each end.
 */
export function drawNoren(ctx, time) {
  const top = 146;
  ctx.fillStyle = '#b8261f';
  ctx.fillRect(20, top, 1240, 18);
  ctx.strokeStyle = 'rgba(255,245,230,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 20; x <= 1260; x += 4) {
    const y = top + 9 + Math.sin(x / 14) * 3;
    if (x === 20) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Scalloped hem.
  ctx.fillStyle = '#b8261f';
  for (let x = 20; x < 1260; x += 40) {
    ctx.beginPath();
    ctx.arc(x + 20, top + 18, 20, 0, Math.PI);
    ctx.fill();
  }
  // The name panel.
  ctx.beginPath();
  ctx.roundRect(520, top, 240, 34, [0, 0, 10, 10]);
  ctx.fillStyle = '#8f1c17';
  ctx.fill();
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('STEAM  LANTERN  ラーメン', 640, top + 17);
  drawChochin(ctx, 44, top + 4, time);
  drawChochin(ctx, 1236, top + 4, time);
}

/** Condiments on the counter by the diners: a tub of red pickled ginger and a cup of chopsticks. */
export function drawCondiments(ctx, x, y) {
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 16, 44, 32, 6);
  ctx.fillStyle = 'rgba(235,240,245,0.75)';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 19, y - 13, 38, 18, 4);
  ctx.fillStyle = '#e8414a';
  ctx.fill();
  ctx.strokeStyle = '#ff9aa0';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 15 + i * 6, y - 10);
    ctx.lineTo(x - 12 + i * 6, y);
    ctx.stroke();
  }
  drawChopstickCup(ctx, x + 40, y + 6);
}

/** Darkens the stage's edges a little, so the eye goes to the kitchen's middle. */
/** Where the stall's light falls (kitchen coordinates): x, y, reach, strength. */
const LIGHTS = [[640, 400, 430, 1], [640, 210, 520, 0.8], [948, 650, 230, 1], [1172, 400, 230, 0.9], [100, 390, 210, 0.8], [36, 180, 160, 1], [1244, 180, 160, 1]];
let nightShade = null;

/** Night falls round the stall: a dusk tint with pools of lantern light cut out of it (drawn once). */
function shadeLayer() {
  if (nightShade !== null || typeof document === 'undefined') return nightShade;
  nightShade = document.createElement('canvas');
  nightShade.width = 1280;
  nightShade.height = 800;
  const g = nightShade.getContext('2d');
  g.fillStyle = 'rgba(20,8,34,0.5)';
  g.fillRect(0, 0, 1280, 800);
  g.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of LIGHTS) {
    const hole = g.createRadialGradient(x, y, r * 0.15, x, y, r);
    hole.addColorStop(0, `rgba(0,0,0,${a})`);
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hole;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return nightShade;
}

/** Festival Decor: bunting strung across the stall and a row of paper lanterns along the back. */
export function drawBunting(ctx, time) {
  const colours = ['#e5534b', '#f2a541', '#7cb342', '#8fb8de', '#b07cd8', '#ffd25a'];
  for (const [y0, sag] of [[244, 22], [250, 16]]) {
    ctx.strokeStyle = 'rgba(40,20,20,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, y0);
    ctx.quadraticCurveTo(640, y0 + sag * 2, 1130, y0);
    ctx.stroke();
    for (let k = 1; k < 24; k += 1) {
      const t = k / 24;
      const x = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 640 + t * t * 1130;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
      const sway = Math.sin(time * 2 + k) * 2;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x + sway, y + 20);
      ctx.closePath();
      ctx.fillStyle = colours[(k + (y0 === 250 ? 3 : 0)) % colours.length];
      ctx.fill();
    }
    if (y0 === 244) break;
  }
  for (const x of [300, 520, 760, 980]) drawChochin(ctx, x, 286, time);
}

export function drawVignette(ctx, time = 0) {
  const shade = shadeLayer();
  if (shade !== null) ctx.drawImage(shade, 0, 0);
  // The lanterns' warm glow, breathing a little.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a] of LIGHTS) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7);
    glow.addColorStop(0, `rgba(255,150,60,${0.07 * a * (0.9 + 0.1 * Math.sin(time * 2 + x))})`);
    glow.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  const v = ctx.createRadialGradient(640, 400, 380, 640, 400, 860);
  v.addColorStop(0, 'rgba(20,8,20,0)');
  v.addColorStop(1, 'rgba(20,8,20,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1280, 720);
}
