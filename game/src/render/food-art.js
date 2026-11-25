// Hand-drawn food, all canvas paths: every ingredient at every stage of prep, burnt food, and the
// finished dishes in their bowls and on their plates, toppings laid where a cook would put them.
import { INGREDIENTS, layered, VESSEL_BOWL, vesselFor } from '../recipes.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function stroke(ctx, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A tiny repeatable jitter so drawings vary between copies but never flicker between frames. */
function jitter(seed) {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

// ---- Ingredients, s = the size of the box they fit in -------------------------------------------

function drawNoodlesRaw(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  for (let i = -5; i <= 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, i * s * 0.035);
    ctx.lineTo(s * 0.42, i * s * 0.035 + s * 0.02);
    stroke(ctx, i % 2 ? '#f3d68a' : '#e6c46e', s * 0.05);
  }
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-s * 0.06, -s * 0.22, s * 0.12, s * 0.44);
  ctx.restore();
}

function drawNoodleSwirl(ctx, x, y, r, gloss = true) {
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    const a0 = i * 0.9;
    for (let t = 0; t <= 1; t += 0.05) {
      const a = a0 + t * 5.2;
      const rr = r * (0.2 + 0.75 * t) * (0.9 + 0.1 * Math.sin(i + t * 9));
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.92;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    stroke(ctx, i % 2 ? '#f1cf6b' : '#e3b54d', r * 0.16);
  }
  if (gloss) {
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.35, Math.PI * 1.1, Math.PI * 1.6);
    stroke(ctx, 'rgba(255,255,230,0.6)', r * 0.08);
  }
}

function drawEggRaw(ctx, x, y, s) {
  ellipse(ctx, x + s * 0.05, y + s * 0.08, s * 0.26, s * 0.12, 'rgba(0,0,0,0.18)');
  ellipse(ctx, x, y, s * 0.24, s * 0.31, '#f4e7d3');
  ellipse(ctx, x - s * 0.07, y - s * 0.12, s * 0.07, s * 0.1, 'rgba(255,255,255,0.7)');
}

function drawEggHalf(ctx, x, y, s, rotation = 0) {
  ellipse(ctx, x, y, s * 0.22, s * 0.28, '#fbf6ec', rotation);
  ellipse(ctx, x, y + s * 0.02, s * 0.12, s * 0.13, '#f39c12', rotation);
  ellipse(ctx, x - s * 0.03, y - s * 0.02, s * 0.06, s * 0.05, '#ffc94d', rotation);
}

function drawScallionRaw(ctx, x, y, s) {
  for (let i = 0; i < 2; i += 1) {
    const oy = y + (i - 0.5) * s * 0.16;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, oy);
    ctx.lineTo(x + s * 0.1, oy);
    stroke(ctx, '#f2f5e4', s * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, oy);
    ctx.quadraticCurveTo(x + s * 0.3, oy - s * 0.08, x + s * 0.45, oy - s * 0.04 + i * s * 0.06);
    stroke(ctx, i ? '#3fa34d' : '#57bb5a', s * 0.1);
  }
}

function drawScallionRing(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  stroke(ctx, '#4caf50', r * 0.55);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, TAU);
  ctx.fillStyle = '#c5e8a5';
  ctx.fill();
}

function drawScallionChopped(ctx, x, y, s) {
  for (let i = 0; i < 11; i += 1) {
    const a = i * 2.4;
    const d = s * 0.25 * Math.sqrt(jitter(i + 3));
    drawScallionRing(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, s * 0.055);
  }
}

function drawMushroomCap(ctx, x, y, s) {
  ellipse(ctx, x, y + s * 0.04, s * 0.3, s * 0.24, '#5b3a24');
  ellipse(ctx, x, y, s * 0.28, s * 0.22, '#8a5a36');
  for (let i = 0; i < 5; i += 1) {
    const a = i * 1.3 + 0.3;
    ellipse(ctx, x + Math.cos(a) * s * 0.14, y + Math.sin(a) * s * 0.1, s * 0.035, s * 0.025, '#d9b48a');
  }
}

function drawMushroomSlices(ctx, x, y, s, seared) {
  for (let i = 0; i < 3; i += 1) {
    const ox = x + (i - 1) * s * 0.2;
    const oy = y + (i % 2) * s * 0.06;
    ctx.beginPath();
    ctx.ellipse(ox, oy, s * 0.13, s * 0.16, -0.2 + i * 0.2, Math.PI, TAU);
    ctx.lineTo(ox + s * 0.03, oy + s * 0.12);
    ctx.lineTo(ox - s * 0.03, oy + s * 0.12);
    ctx.closePath();
    ctx.fillStyle = seared ? '#6b3f1f' : '#c9a37a';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ox, oy, s * 0.13, s * 0.16, -0.2 + i * 0.2, Math.PI, TAU);
    stroke(ctx, seared ? '#3d2210' : '#7a5232', s * 0.035);
    if (seared) {
      ctx.beginPath();
      ctx.arc(ox - s * 0.03, oy - s * 0.08, s * 0.04, Math.PI, TAU);
      stroke(ctx, 'rgba(255,220,170,0.5)', s * 0.02);
    }
  }
}

function drawTofuCube(ctx, x, y, w, seared) {
  ctx.fillStyle = seared ? '#a8641f' : '#d8d2c2';
  ctx.fillRect(x - w / 2, y - w / 2 + w * 0.18, w, w * 0.82);
  ctx.fillStyle = seared ? '#e2a04a' : '#fbf8ef';
  ctx.fillRect(x - w / 2, y - w / 2, w, w * 0.72);
  if (seared) {
    ctx.fillStyle = 'rgba(120,60,10,0.45)';
    ctx.fillRect(x - w / 2, y - w * 0.05, w, w * 0.08);
  }
}

function drawPorkRaw(ctx, x, y, s) {
  ctx.beginPath();
  ctx.roundRect(x - s * 0.36, y - s * 0.2, s * 0.72, s * 0.4, s * 0.12);
  ctx.fillStyle = '#e88f8f';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.05);
  ctx.bezierCurveTo(x - s * 0.1, y - s * 0.12, x + s * 0.1, y + s * 0.04, x + s * 0.32, y - s * 0.06);
  stroke(ctx, '#fbe3dc', s * 0.07);
  ctx.beginPath();
  ctx.roundRect(x - s * 0.36, y - s * 0.2, s * 0.72, s * 0.4, s * 0.12);
  stroke(ctx, '#c46a6a', s * 0.03);
}

function drawPorkSeared(ctx, x, y, s) {
  ctx.beginPath();
  ctx.roundRect(x - s * 0.36, y - s * 0.2, s * 0.72, s * 0.4, s * 0.12);
  ctx.fillStyle = '#8c4a26';
  ctx.fill();
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + i * s * 0.13 - s * 0.06, y - s * 0.17);
    ctx.lineTo(x + i * s * 0.13 + s * 0.06, y + s * 0.17);
    stroke(ctx, '#4a2412', s * 0.04);
  }
  ctx.beginPath();
  ctx.ellipse(x - s * 0.12, y - s * 0.08, s * 0.12, s * 0.04, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255,210,150,0.35)';
  ctx.fill();
}

function drawChashu(ctx, x, y, r) {
  ellipse(ctx, x, y, r, r * 0.92, '#7a3b1c');
  ellipse(ctx, x, y, r * 0.8, r * 0.74, '#f2c6a8');
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.04) {
    const a = t * TAU * 1.6;
    const rr = r * 0.7 * (1 - t * 0.85);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.9;
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  stroke(ctx, '#c98a64', r * 0.13);
}

function drawPorkSliced(ctx, x, y, s) {
  drawChashu(ctx, x - s * 0.12, y + s * 0.04, s * 0.2);
  drawChashu(ctx, x + s * 0.13, y - s * 0.04, s * 0.2);
}

function drawBrothCup(ctx, x, y, s) {
  ellipse(ctx, x, y + s * 0.05, s * 0.32, s * 0.26, '#7d8b93');
  ellipse(ctx, x, y, s * 0.3, s * 0.24, '#c9d3d8');
  ellipse(ctx, x, y + s * 0.01, s * 0.24, s * 0.18, '#d99a3e');
  ellipse(ctx, x - s * 0.06, y - s * 0.04, s * 0.04, s * 0.025, '#f6c96b');
  ellipse(ctx, x + s * 0.08, y + s * 0.04, s * 0.03, s * 0.02, '#f6c96b');
}

function drawChiliDish(ctx, x, y, s) {
  ellipse(ctx, x, y + s * 0.04, s * 0.28, s * 0.2, '#6f2a1d');
  ellipse(ctx, x, y, s * 0.26, s * 0.18, '#f3ebdd');
  ellipse(ctx, x, y + s * 0.01, s * 0.2, s * 0.13, '#c0261a');
  for (let i = 0; i < 6; i += 1) {
    ellipse(ctx, x + (jitter(i) - 0.5) * s * 0.3, y + (jitter(i + 9) - 0.5) * s * 0.18, s * 0.025, s * 0.015, '#ff7043');
  }
}

function drawBurnt(ctx, x, y, s, time) {
  ellipse(ctx, x, y, s * 0.32, s * 0.22, '#1e1a1a');
  ellipse(ctx, x - s * 0.1, y - s * 0.05, s * 0.12, s * 0.08, '#3a302c');
  ellipse(ctx, x + s * 0.12, y + s * 0.03, s * 0.1, s * 0.07, '#2b2522');
  for (let i = 0; i < 3; i += 1) {
    const rise = ((time * 0.7 + i / 3) % 1);
    ellipse(ctx, x + Math.sin(rise * 6 + i) * s * 0.12, y - s * 0.2 - rise * s * 0.5, s * (0.08 + rise * 0.08), s * (0.06 + rise * 0.06), `rgba(90,90,90,${0.5 * (1 - rise)})`);
  }
}

/** Draw one ingredient as it currently is (raw, prepped, cooked or ruined), centred in a box of size `s`. */
export function drawIngredient(ctx, item, x, y, s, time = 0) {
  if (item.burnt) {
    drawBurnt(ctx, x, y, s, time);
    return;
  }
  const done = item.done;
  switch (item.kind) {
    case 'noodles':
      if (done === 0) drawNoodlesRaw(ctx, x, y, s);
      else drawNoodleSwirl(ctx, x, y, s * 0.3);
      break;
    case 'egg':
      if (done === 0) drawEggRaw(ctx, x, y, s);
      else {
        drawEggHalf(ctx, x - s * 0.13, y, s * 0.9, -0.2);
        drawEggHalf(ctx, x + s * 0.13, y, s * 0.9, 0.2);
      }
      break;
    case 'scallion':
      if (done === 0) drawScallionRaw(ctx, x, y, s);
      else drawScallionChopped(ctx, x, y, s);
      break;
    case 'mushroom':
      if (done === 0) drawMushroomCap(ctx, x, y, s);
      else drawMushroomSlices(ctx, x, y, s, done >= 2);
      break;
    case 'tofu':
      drawTofuCube(ctx, x - s * 0.13, y + s * 0.05, s * 0.24, done >= 1);
      drawTofuCube(ctx, x + s * 0.13, y + s * 0.07, s * 0.24, done >= 1);
      drawTofuCube(ctx, x, y - s * 0.1, s * 0.24, done >= 1);
      break;
    case 'pork':
      if (done === 0) drawPorkRaw(ctx, x, y, s);
      else if (done === 1) drawPorkSeared(ctx, x, y, s);
      else drawPorkSliced(ctx, x, y, s);
      break;
    case 'broth':
      drawBrothCup(ctx, x, y, s);
      break;
    case 'chili':
      drawChiliDish(ctx, x, y, s);
      break;
    default:
  }
}

/** A small icon of an ingredient as it goes into a dish (the prepped form), for tickets. */
export function drawIngredientIcon(ctx, kind, x, y, s) {
  drawIngredient(ctx, { kind, done: INGREDIENTS[kind].steps.length, burnt: false }, x, y, s);
}

// ---- Dishes -------------------------------------------------------------------------------------

/** Each topping's spot in a bowl of radius r: around the rim, leaving the noodles a centre. */
const TOPPING_SPOTS = {
  pork: [-0.5, 0.55],
  egg: [0.5, 0.5],
  mushroom: [0.45, -0.5],
  tofu: [-0.48, -0.45],
  chili: [0.05, 0.62],
};

function drawToppings(ctx, contents, x, y, r) {
  for (const kind of layered(contents)) {
    const spot = TOPPING_SPOTS[kind];
    if (kind === 'broth' || kind === 'scallion' || kind === 'noodles') continue;
    const px = x + spot[0] * r;
    const py = y + spot[1] * r * 0.9;
    if (kind === 'pork') {
      drawChashu(ctx, px - r * 0.1, py, r * 0.3);
      drawChashu(ctx, px + r * 0.15, py - r * 0.08, r * 0.3);
    } else if (kind === 'egg') {
      drawEggHalf(ctx, px, py, r * 0.75, 0.4);
      drawEggHalf(ctx, px + r * 0.2, py - r * 0.18, r * 0.75, 0.9);
    } else if (kind === 'mushroom') drawMushroomSlices(ctx, px, py, r * 0.75, true);
    else if (kind === 'tofu') {
      drawTofuCube(ctx, px - r * 0.12, py, r * 0.22, true);
      drawTofuCube(ctx, px + r * 0.12, py + r * 0.04, r * 0.22, true);
      drawTofuCube(ctx, px, py - r * 0.16, r * 0.22, true);
    } else if (kind === 'chili') {
      for (let i = 0; i < 7; i += 1) {
        const a = i * 0.9;
        ellipse(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.5, r * 0.09, r * 0.06, 'rgba(214,40,22,0.85)');
      }
      for (let i = 0; i < 6; i += 1) ellipse(ctx, px + (jitter(i) - 0.5) * r * 0.5, py + (jitter(i + 4) - 0.5) * r * 0.3, r * 0.05, r * 0.03, '#ff5a2a');
    }
  }
  if (contents.includes('scallion')) {
    for (let i = 0; i < 12; i += 1) {
      const a = i * 2.3;
      const d = r * 0.65 * Math.sqrt(jitter(i + 11));
      drawScallionRing(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, r * 0.065);
    }
  }
}

/**
 * Each soup has its own broth, so dishes read apart at a glance: a creamy pork-bone white for the
 * six-topping feast, miso orange where mushrooms go in, a clear golden salt broth where tofu goes
 * in without noodles, dark soy for the rest, and a red chili-oil glaze for dry noodles.
 */
function brothStyle(contents) {
  if (!contents.includes('broth')) return contents.includes('chili') ? { soup: '#9b2b1e', fat: '#d8573a' } : { soup: '#e9d9bf', fat: '#f6ead2' };
  if (contents.includes('pork') && contents.includes('mushroom')) return { soup: '#efe2c8', fat: '#fff6e4' };
  if (contents.includes('mushroom')) return { soup: '#c8803a', fat: '#eab070' };
  if (contents.includes('tofu') && !contents.includes('noodles')) return { soup: '#e9c766', fat: '#fff0a8' };
  return { soup: '#8a4a22', fat: '#c98a4a' };
}

/** A sheet of nori tucked against the rim. */
function drawNori(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x - r * 0.52, y - r * 0.18);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#1f2e22';
  ctx.fillRect(-r * 0.16, -r * 0.34, r * 0.32, r * 0.62);
  ctx.fillStyle = 'rgba(120,160,110,0.35)';
  ctx.fillRect(-r * 0.12, -r * 0.3, r * 0.06, r * 0.54);
  ctx.restore();
}

/** Red pickled ginger and a scatter of sesame, as a ramen cart finishes a bowl. */
function drawGarnish(ctx, x, y, r) {
  ctx.strokeStyle = '#e8414a';
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + r * (0.12 + i * 0.05), y - r * 0.12);
    ctx.lineTo(x + r * (0.2 + i * 0.05), y - r * 0.02);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i += 1) {
    ellipse(ctx, x + (jitter(i + 21) - 0.5) * r * 0.9, y + (jitter(i + 37) - 0.5) * r * 0.8, r * 0.025, r * 0.016, '#f8f0dc');
  }
}

/**
 * A dish seen from above at radius r: a glazed bowl on its saucer for noodle and soup dishes, a
 * plate for the rest, an empty serving board when there is nothing in it yet.
 */
export function drawDish(ctx, contents, x, y, r, { glow = null, steam = 0 } = {}) {
  ellipse(ctx, x + r * 0.08, y + r * 0.14, r * 1.12, r * 0.98, 'rgba(0,0,0,0.25)');
  if (glow !== null) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 0.8;
    ellipse(ctx, x, y, r * 1.12, r * 1.02, glow);
    ctx.restore();
  }
  if (contents.length === 0) {
    ellipse(ctx, x, y, r * 1.05, r * 0.95, '#efe6d6');
    ellipse(ctx, x, y, r * 0.8, r * 0.72, '#f9f4ea');
    return;
  }
  if (vesselFor(contents) === VESSEL_BOWL) {
    ellipse(ctx, x, y + r * 0.06, r * 1.12, r * 1.0, '#e9e1d2');
    ellipse(ctx, x, y, r, r * 0.92, '#2f4a7a');
    ellipse(ctx, x, y, r * 0.93, r * 0.85, '#3d5f99');
    // The rim's painted wave pattern: the stall's own glaze.
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU;
      ellipse(ctx, x + Math.cos(a) * r * 0.965, y + Math.sin(a) * r * 0.885, r * 0.05, r * 0.035, '#f6e7c8');
    }
    const style = brothStyle(contents);
    ellipse(ctx, x, y, r * 0.82, r * 0.75, style.soup);
    if (contents.includes('broth')) {
      ellipse(ctx, x - r * 0.25, y - r * 0.3, r * 0.08, r * 0.05, style.fat);
      ellipse(ctx, x + r * 0.3, y + r * 0.1, r * 0.06, r * 0.04, style.fat);
      ellipse(ctx, x - r * 0.05, y + r * 0.35, r * 0.05, r * 0.035, style.fat);
    }
    if (contents.includes('noodles')) drawNoodleSwirl(ctx, x, y, r * 0.48);
    if (contents.includes('broth') && contents.includes('noodles') && contents.includes('egg')) drawNori(ctx, x, y, r);
    drawToppings(ctx, contents, x, y, r * 0.8);
    if (contents.includes('broth') && contents.includes('noodles')) drawGarnish(ctx, x, y, r);
  } else {
    ellipse(ctx, x, y, r * 1.08, r * 0.98, '#d9d2c4');
    ellipse(ctx, x, y - r * 0.02, r * 1.04, r * 0.94, '#fbf8f1');
    ellipse(ctx, x, y - r * 0.02, r * 0.78, r * 0.7, '#f1ebdf');
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.02, r * 0.92, r * 0.83, 0, 0, TAU);
    stroke(ctx, '#c76b3a', r * 0.03);
    drawToppings(ctx, contents, x, y, r * 0.85);
  }
  if (steam > 0) drawSteam(ctx, x, y - r * 0.4, r, steam);
}

/** Rising wisps over hot food; `time` animates them. */
export function drawSteam(ctx, x, y, r, time) {
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    const rise = (time * 0.5 + i / 3) % 1;
    ctx.beginPath();
    const bx = x + (i - 1) * r * 0.35;
    ctx.moveTo(bx, y - rise * r * 0.4);
    ctx.bezierCurveTo(bx + r * 0.2, y - r * 0.4 - rise * r, bx - r * 0.2, y - r * 0.7 - rise * r, bx + r * 0.05, y - r * 1.1 - rise * r);
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - rise)})`;
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
