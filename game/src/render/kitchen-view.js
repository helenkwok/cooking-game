// The kitchen itself: the lantern-lit back wall, the tiled floor, the wooden counters and every
// station on them, with what each holds and how far along it is.
import { FLOOR, ISLAND, PALETTE, FONT, COOK } from '../config.js';
import { cookerGauge } from '../kitchen.js';
import { fitsRecipe, INGREDIENTS, matchRecipe, nextStep, RECIPES, STEP_CHOP } from '../recipes.js';
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

  // Floor: glazed cream and terracotta tiles, each a shade off its neighbours, with a soft
  // highlight on its top edge.
  ctx.fillStyle = PALETTE.floorGrout;
  ctx.fillRect(180, 250, 920, 360);
  const tile = 46;
  for (let row = 0; row * tile < 360; row += 1) {
    for (let col = 0; col * tile < 920; col += 1) {
      const x = 182 + col * tile;
      const y = 252 + row * tile;
      ctx.fillStyle = (row + col) % 2 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, tile - 3, tile - 3);
      const shade = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
      ctx.fillStyle = `rgba(120,70,30,${0.06 * (shade - Math.floor(shade))})`;
      ctx.fillRect(x, y, tile - 3, tile - 3);
      ctx.fillStyle = 'rgba(255,255,240,0.22)';
      ctx.fillRect(x, y, tile - 3, 3);
    }
  }
  // A woven rug in the walkway between the island and the front counter.
  roundRect(ctx, 430, 486, 420, 84, 12, '#a8452f');
  roundRect(ctx, 438, 494, 404, 68, 9, '#c4573a');
  ctx.strokeStyle = '#f0c27a';
  ctx.lineWidth = 3;
  ctx.strokeRect(448, 504, 384, 48);
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(462 + i * 32, 528);
    ctx.lineTo(472 + i * 32, 516);
    ctx.lineTo(482 + i * 32, 528);
    ctx.lineTo(472 + i * 32, 540);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#f0c27a' : '#2f4a7a';
    ctx.fill();
  }
  // Floor mat by the pass.
  roundRect(ctx, 870, 520, 210, 64, 10, 'rgba(110,50,30,0.7)');
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = 'rgba(255,210,160,0.18)';
    ctx.fillRect(882 + i * 28, 526, 12, 52);
  }
  // A warm pool of lamp light, and the soft shadow the counters cast on the floor.
  const pool = ctx.createRadialGradient(640, 400, 60, 640, 420, 560);
  pool.addColorStop(0, rush ? 'rgba(255,190,110,0.16)' : 'rgba(255,220,160,0.10)');
  pool.addColorStop(1, 'rgba(60,25,10,0.32)');
  ctx.fillStyle = pool;
  ctx.fillRect(180, 250, 920, 360);
  const back = ctx.createLinearGradient(0, 262, 0, 300);
  back.addColorStop(0, 'rgba(60,25,10,0.45)');
  back.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = back;
  ctx.fillRect(180, 262, 920, 38);
  for (const [x0, dir] of [[194, 1], [1086, -1]]) {
    const side = ctx.createLinearGradient(x0, 0, x0 + dir * 30, 0);
    side.addColorStop(0, 'rgba(60,25,10,0.35)');
    side.addColorStop(1, 'rgba(60,25,10,0)');
    ctx.fillStyle = side;
    ctx.fillRect(Math.min(x0, x0 + dir * 30), 262, 30, 340);
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

/** Festoon lights strung over the back counter, swinging a little and glowing warm. */
export function drawStringLights(ctx, time, rush) {
  const posts = [24, 230, 436, 640, 844, 1050, 1256];
  const colours = ['#ffcf6b', '#ff8a5c', '#ffe9a8', '#ff6f6f'];
  ctx.strokeStyle = 'rgba(30,20,20,0.8)';
  ctx.lineWidth = 2;
  let bulb = 0;
  for (let i = 0; i < posts.length - 1; i += 1) {
    const a = posts[i];
    const b = posts[i + 1];
    const sag = 16 + Math.sin(time * 1.3 + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(a, 146);
    ctx.quadraticCurveTo((a + b) / 2, 146 + sag * 2, b, 146);
    ctx.stroke();
    for (let k = 1; k < 6; k += 1) {
      const t = k / 6;
      const x = (1 - t) * (1 - t) * a + 2 * (1 - t) * t * ((a + b) / 2) + t * t * b;
      const y = 146 + 2 * (1 - t) * t * sag * 2 + 5;
      const twinkle = rush ? 0.75 + 0.25 * Math.sin(time * 9 + bulb * 1.7) : 0.9;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 16);
      glow.addColorStop(0, `rgba(255,190,110,${0.5 * twinkle})`);
      glow.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = colours[bulb % colours.length];
      ctx.globalAlpha = twinkle;
      ctx.fill();
      ctx.globalAlpha = 1;
      bulb += 1;
    }
  }
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
  drawDish(ctx, s.dish, s.cx, s.cy - 2, 41, { glow, steam: s.dish.length > 0 ? time + s.cx : 0 });
  const tag = dishTag(s.dish, recipe, wanted);
  if (tag !== null) {
    ctx.font = `bold 12px ${FONT}`;
    const w = Math.min(138, ctx.measureText(tag.text).width + 14);
    roundRect(ctx, s.cx - w / 2, s.y - 17, w, 21, 7, tag.fill);
    label(ctx, tag.text, s.cx, s.y - 6, 12, tag.ink);
  }
}

/**
 * What a mat's dish is on its way to: "Lantern Ramen 3/4" while it is being built, "READY ·
 * Ember Noodles" once it is complete and a ticket wants it.
 */
function dishTag(contents, recipe, wanted) {
  if (contents.length === 0) return null;
  if (recipe !== null) {
    return wanted.has(recipe.id)
      ? { text: `READY · ${recipe.name}`, fill: PALETTE.good, ink: PALETTE.ink }
      : { text: `${recipe.name} (no ticket)`, fill: PALETTE.warn, ink: PALETTE.ink };
  }
  let best = null;
  for (const candidate of RECIPES) {
    if (!wanted.has(candidate.id) || !fitsRecipe(contents, candidate)) continue;
    if (best === null || candidate.items.length < best.items.length) best = candidate;
  }
  if (best === null) return { text: 'No match: bin it', fill: '#5a2c22', ink: '#ffd0c4' };
  return { text: `${best.name} ${contents.length}/${best.items.length}`, fill: PALETTE.paper, ink: PALETTE.ink };
}

function drawPass(ctx, s, time, display) {
  label(ctx, 'PASS · SERVE HERE', s.x + 14, s.y + s.h - 14, 12, PALETTE.inkSoft, 'left');
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
