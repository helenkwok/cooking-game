// The kitchen itself: the lantern-lit back wall, the tiled floor, the wooden counters and every
// station on them, with what each holds and how far along it is.
import { FLOOR, ISLAND, PALETTE, FONT, COOK } from '../config.js';
import { cookerGauge } from '../kitchen.js';
import { INGREDIENTS, matchRecipe, nextStep, STEP_CHOP } from '../recipes.js';
import { ASSEMBLY, BIN, BOARD, CRATE, GRIDDLE, PASS, POT, SHELF } from '../stations.js';
import { drawDish, drawIngredient, drawSteam } from './food-art.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function label(ctx, text, x, y, size, colour, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

// ---- The room -----------------------------------------------------------------------------------

export function drawRoom(ctx, time, rush) {
  // Back wall and its hanging lanterns (they glow warmer in the rush).
  const wall = ctx.createLinearGradient(0, 0, 0, 160);
  wall.addColorStop(0, '#24182e');
  wall.addColorStop(1, PALETTE.wall);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 1280, 160);

  // Floor tiles.
  ctx.fillStyle = PALETTE.floorGrout;
  ctx.fillRect(180, 250, 920, 360);
  const tile = 46;
  for (let row = 0; row * tile < 360; row += 1) {
    for (let col = 0; col * tile < 920; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(182 + col * tile, 252 + row * tile, tile - 3, tile - 3);
    }
  }
  // A warm pool of lamp light on the floor, and the edge shadow under the counters.
  const pool = ctx.createRadialGradient(640, 420, 40, 640, 420, 520);
  pool.addColorStop(0, rush ? 'rgba(255,170,90,0.20)' : 'rgba(255,190,120,0.14)');
  pool.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = pool;
  ctx.fillRect(180, 250, 920, 360);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(180, 262, 920, 14);
  // Floor mat by the pass.
  roundRect(ctx, 820, 520, 260, 64, 10, 'rgba(120,40,40,0.55)');
  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = 'rgba(255,200,150,0.12)';
    ctx.fillRect(834 + i * 28, 526, 12, 52);
  }
  void time;
}

function counterSlab(ctx, x, y, w, h, faceH) {
  ctx.fillStyle = PALETTE.counterFace;
  ctx.fillRect(x, y + h, w, faceH);
  const top = ctx.createLinearGradient(x, y, x, y + h);
  top.addColorStop(0, PALETTE.counterTopLight);
  top.addColorStop(1, PALETTE.counterTop);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, h);
  // Wood grain.
  ctx.strokeStyle = 'rgba(120,70,40,0.18)';
  ctx.lineWidth = 2;
  for (let gy = y + 9; gy < y + h; gy += 13) {
    ctx.beginPath();
    ctx.moveTo(x + 4, gy);
    ctx.bezierCurveTo(x + w * 0.3, gy - 3, x + w * 0.6, gy + 4, x + w - 4, gy);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.counterEdge;
  ctx.fillRect(x, y + h - 4, w, 4);
}

/** The U of counters: the back one, the two sides. The front counter is drawn after the chef. */
export function drawBackCounters(ctx) {
  counterSlab(ctx, 24, 146, 1232, 102, 16);
  counterSlab(ctx, 24, 248, 162, 440, 0);
  counterSlab(ctx, 1094, 248, 162, 440, 0);
  ctx.fillStyle = PALETTE.counterFace;
  ctx.fillRect(186, 262, 8, 338);
  ctx.fillRect(1086, 262, 8, 338);
}

/** The island in the middle of the floor, with its shadow and the stall's painted name on its face. */
export function drawIsland(ctx) {
  const { x, y, w, h } = ISLAND;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x + 6, y + h + 14, w, 12);
  counterSlab(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#4e2c1c';
  ctx.fillRect(x + 8, y + h + 3, w - 16, 12);
  label(ctx, 'STEAM  LANTERN', x + w / 2, y + h + 10, 11, '#e7b46a');
}

export function drawFrontCounter(ctx) {
  counterSlab(ctx, 24, 596, 1232, 106, 18);
  // The pass: a gap in the counter through to the dining tent, under a heat lamp.
  roundRect(ctx, 830, 596, 236, 110, 8, '#3a2531');
  const lamp = ctx.createRadialGradient(948, 640, 10, 948, 640, 140);
  lamp.addColorStop(0, 'rgba(255,170,80,0.55)');
  lamp.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(820, 590, 256, 124);
  roundRect(ctx, 838, 604, 220, 92, 6, '#c9c1b0');
  roundRect(ctx, 842, 608, 212, 84, 5, '#e8e1d2');
}

// ---- Stations -----------------------------------------------------------------------------------

function drawCrate(ctx, s, time) {
  if (s.kind === 'broth') {
    // A steel stock urn with a tap.
    roundRect(ctx, s.x + 14, s.y + 6, s.w - 28, s.h - 12, 14, PALETTE.steelDark);
    roundRect(ctx, s.x + 18, s.y + 8, s.w - 36, s.h - 18, 12, PALETTE.steel);
    ctx.beginPath();
    ctx.ellipse(s.cx, s.y + 28, 26, 14, 0, 0, TAU);
    ctx.fillStyle = '#c47d2c';
    ctx.fill();
    drawSteam(ctx, s.cx, s.y + 20, 22, time);
  } else if (s.kind === 'chili') {
    // A glazed chili-oil crock.
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy + 6, 34, 30, 0, 0, TAU);
    ctx.fillStyle = '#7a2418';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy - 2, 26, 18, 0, 0, TAU);
    ctx.fillStyle = '#b8321f';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy - 4, 20, 12, 0, 0, TAU);
    ctx.fillStyle = '#d8402a';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s.cx + 6, s.cy - 6);
    ctx.lineTo(s.cx + 30, s.cy - 30);
    ctx.strokeStyle = '#d9c4a0';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    // A slatted wooden crate full of the raw ingredient.
    roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 6, '#7b4f2c');
    roundRect(ctx, s.x + 9, s.y + 9, s.w - 18, s.h - 18, 4, '#4d2f1a');
    const raw = { kind: s.kind, done: 0, burnt: false };
    drawIngredient(ctx, raw, s.cx - 16, s.cy - 2, 44);
    drawIngredient(ctx, raw, s.cx + 16, s.cy + 4, 44);
    drawIngredient(ctx, raw, s.cx, s.cy - 10, 44);
    ctx.fillStyle = '#9a6a3e';
    ctx.fillRect(s.x + 4, s.y + s.h - 16, s.w - 8, 8);
  }
  // Name tag and hotkey.
  roundRect(ctx, s.cx - 46, s.y + s.h - 14, 92, 20, 5, PALETTE.paper);
  label(ctx, INGREDIENTS[s.kind].name, s.cx + 9, s.y + s.h - 4, 12, PALETTE.ink);
  roundRect(ctx, s.cx - 44, s.y + s.h - 12, 16, 16, 4, PALETTE.ink);
  label(ctx, s.key, s.cx - 36, s.y + s.h - 4, 11, PALETTE.paper);
}

function drawProgressRing(ctx, x, y, r, fraction, colour, width = 6) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = width + 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, fraction));
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawBoard(ctx, s, time, knife) {
  roundRect(ctx, s.x + 10, s.y + 12, s.w - 20, s.h - 22, 12, PALETTE.boardDark);
  roundRect(ctx, s.x + 12, s.y + 10, s.w - 24, s.h - 24, 11, PALETTE.board);
  ctx.strokeStyle = 'rgba(150,100,50,0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(s.x + 24, s.y + 26 + i * 16);
    ctx.lineTo(s.x + s.w - 30, s.y + 22 + i * 16);
    ctx.stroke();
  }
  if (s.item !== null) drawIngredient(ctx, s.item, s.cx - 4, s.cy - 2, 70, time);
  // The cleaver: lifts and drops with each stroke.
  const lift = knife > 0 ? Math.sin(knife * Math.PI) * 18 : 0;
  ctx.save();
  ctx.translate(s.x + s.w - 30, s.cy - 6 - lift);
  ctx.rotate(knife > 0 ? -0.5 * Math.sin(knife * Math.PI) : 0.15);
  roundRect(ctx, -10, -30, 28, 36, 3, '#c9d1d6');
  roundRect(ctx, -10, -30, 28, 6, 2, '#eef3f6');
  roundRect(ctx, -2, 6, 12, 26, 3, '#3b2a20');
  ctx.restore();
  // Chop pips: how many strokes this item still needs.
  if (s.item !== null && nextStep(s.item) === STEP_CHOP) {
    for (let i = 0; i < COOK.chopStrokes; i += 1) {
      ctx.beginPath();
      ctx.arc(s.x + 26 + i * 14, s.y + s.h - 6, 5, 0, TAU);
      ctx.fillStyle = i < s.chop ? PALETTE.good : 'rgba(40,20,10,0.55)';
      ctx.fill();
    }
    label(ctx, 'CHOP', s.cx, s.y + 2, 12, PALETTE.text);
  }
}

function drawCooker(ctx, s, time) {
  const gauge = cookerGauge(s);
  const flicker = 0.75 + 0.25 * Math.sin(time * 20 + s.cy);
  if (s.type === POT) {
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, 40, 0, TAU);
    ctx.fillStyle = '#26262b';
    ctx.fill();
    if (s.item !== null) {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, 42, 0, TAU);
      ctx.strokeStyle = `rgba(80,140,255,${0.5 * flicker})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, 36, 0, TAU);
    ctx.fillStyle = PALETTE.steelDark;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, 31, 0, TAU);
    ctx.fillStyle = s.item !== null && s.item.burnt ? '#5d5a4a' : '#7fa7b8';
    ctx.fill();
    roundRect(ctx, s.cx + 34, s.cy - 5, 26, 10, 4, '#3b2a20');
    if (s.item !== null) {
      for (let i = 0; i < 6; i += 1) {
        const phase = (time * 1.6 + i * 0.37) % 1;
        ctx.beginPath();
        ctx.arc(s.cx + Math.cos(i * 2.1) * 20, s.cy + Math.sin(i * 2.1) * 18, 2 + phase * 4, 0, TAU);
        ctx.strokeStyle = `rgba(230,245,255,${0.7 * (1 - phase)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      drawIngredient(ctx, s.item, s.cx, s.cy, 46, time);
      drawSteam(ctx, s.cx, s.cy - 16, 20, time + s.cy);
    }
  } else {
    roundRect(ctx, s.x + 8, s.y + 6, s.w - 16, s.h - 12, 8, '#1f1d1f');
    if (s.item !== null) {
      ctx.fillStyle = `rgba(255,110,30,${0.35 * flicker})`;
      ctx.fillRect(s.x + 10, s.y + 8, s.w - 20, s.h - 16);
    }
    roundRect(ctx, s.x + 14, s.y + 12, s.w - 28, s.h - 24, 6, '#3a3638');
    ctx.strokeStyle = '#2a2729';
    ctx.lineWidth = 3;
    for (let gx = s.x + 24; gx < s.x + s.w - 20; gx += 12) {
      ctx.beginPath();
      ctx.moveTo(gx, s.y + 16);
      ctx.lineTo(gx, s.y + s.h - 16);
      ctx.stroke();
    }
    if (s.item !== null) drawIngredient(ctx, s.item, s.cx, s.cy, 56, time);
  }
  if (s.item !== null && !s.item.burnt) {
    const r = s.type === POT ? 42 : 34;
    if (gauge.overdone > 0) {
      const flash = gauge.warn && Math.floor(time * 6) % 2 === 0;
      drawProgressRing(ctx, s.cx, s.cy, r, 1 - gauge.overdone, flash ? PALETTE.bad : PALETTE.warn);
      // A tag on the counter beside the burner: ready to take, or about to burn.
      roundRect(ctx, s.x - 10, s.cy - 12, 52, 24, 8, gauge.warn ? (flash ? PALETTE.bad : '#8a1f1a') : PALETTE.good);
      label(ctx, gauge.warn ? 'HOT!' : 'READY', s.x + 16, s.cy + 1, 12, gauge.warn ? '#fff' : PALETTE.ink);
    } else drawProgressRing(ctx, s.cx, s.cy, r, gauge.cooking, PALETTE.good);
  } else if (s.item !== null && s.item.burnt) {
    roundRect(ctx, s.x - 10, s.cy - 12, 52, 24, 8, '#2b2020');
    label(ctx, 'BIN IT', s.x + 16, s.cy + 1, 11, '#ff8f84');
  }
}

function drawBin(ctx, s) {
  roundRect(ctx, s.x + 18, s.y + 6, s.w - 36, s.h - 12, 10, PALETTE.steelDark);
  roundRect(ctx, s.x + 22, s.y + 10, s.w - 44, s.h - 20, 8, '#2e3439');
  label(ctx, 'BIN · Q', s.cx, s.cy, 13, PALETTE.steel);
}

function drawShelf(ctx, s, time) {
  roundRect(ctx, s.x + 6, s.y + 8, s.w - 12, s.h - 16, 8, '#a36f43');
  roundRect(ctx, s.x + 10, s.y + 12, s.w - 20, s.h - 24, 6, '#b8834f');
  label(ctx, 'SHELF', s.cx, s.y + s.h - 18, 11, 'rgba(60,30,10,0.6)');
  if (s.item !== null) {
    if (s.item.dish) drawDish(ctx, s.item.contents, s.cx, s.cy - 4, 32, { steam: time });
    else drawIngredient(ctx, s.item, s.cx, s.cy - 6, 58, time);
  }
}

function drawAssembly(ctx, s, time, wanted) {
  // A bamboo serving mat.
  roundRect(ctx, s.x + 6, s.y + 6, s.w - 12, s.h - 12, 8, '#cdb27a');
  ctx.fillStyle = 'rgba(120,90,40,0.35)';
  for (let i = 0; i < 8; i += 1) ctx.fillRect(s.x + 12 + i * 13.5, s.y + 8, 2, s.h - 16);
  const recipe = matchRecipe(s.dish);
  const glow = recipe !== null ? (wanted.has(recipe.id) ? 'rgba(120,255,150,0.75)' : 'rgba(255,220,120,0.5)') : null;
  drawDish(ctx, s.dish, s.cx, s.cy - 2, 36, { glow, steam: s.dish.length > 0 ? time + s.cx : 0 });
  if (recipe !== null) {
    roundRect(ctx, s.cx - 58, s.y - 16, 116, 20, 6, wanted.has(recipe.id) ? PALETTE.good : PALETTE.warn);
    label(ctx, recipe.name, s.cx, s.y - 6, 12, PALETTE.ink);
  }
}

function drawPass(ctx, s, time, display) {
  label(ctx, 'PASS', s.x + 22, s.y + 18, 13, PALETTE.ink, 'left');
  // The service bell.
  ctx.beginPath();
  ctx.arc(s.x + s.w - 30, s.y + 30, 16, Math.PI, TAU);
  ctx.fillStyle = '#e0b43c';
  ctx.fill();
  ctx.fillStyle = '#9b7a22';
  ctx.fillRect(s.x + s.w - 50, s.y + 30, 40, 6);
  ctx.beginPath();
  ctx.arc(s.x + s.w - 30, s.y + 12, 4, 0, TAU);
  ctx.fillStyle = '#f5d76e';
  ctx.fill();
  // Dishes just sent out sit on the pass a moment under the lamp.
  display.forEach((entry, index) => {
    const x = s.x + 70 + index * 64;
    drawDish(ctx, entry.contents, x, s.cy + 6, 28, { steam: time + index });
  });
}

/** Every station, with the one the chef can reach and the one under the mouse outlined. */
export function drawStations(ctx, stations, { time, reach, hover, knives, wanted, passDisplay, sides, useful }) {
  for (const s of stations) {
    if (!sides.includes(s.side)) continue;
    switch (s.type) {
      case CRATE: drawCrate(ctx, s, time); break;
      case BOARD: drawBoard(ctx, s, time, knives[s.id] ?? 0); break;
      case POT:
      case GRIDDLE: drawCooker(ctx, s, time); break;
      case BIN: drawBin(ctx, s); break;
      case SHELF: drawShelf(ctx, s, time); break;
      case ASSEMBLY: drawAssembly(ctx, s, time, wanted); break;
      case PASS: drawPass(ctx, s, time, passDisplay); break;
      default:
    }
    if (useful.has(s.id) && s !== reach) {
      // Where what you hold can go next: a dashed green outline that breathes.
      ctx.save();
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath();
      ctx.roundRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6, 10);
      ctx.strokeStyle = `rgba(140,255,170,${0.55 + 0.3 * Math.sin(time * 5)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    if (s === reach || s === hover) {
      ctx.beginPath();
      ctx.roundRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2, 10);
      ctx.strokeStyle = s === reach ? `rgba(255,240,160,${0.75 + 0.25 * Math.sin(time * 8)})` : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = s === reach ? 4 : 2;
      ctx.stroke();
    }
  }
}

export { FLOOR };
