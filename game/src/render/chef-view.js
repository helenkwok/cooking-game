// The stall's cook, seen from above and a little in front: a round cook in an indigo jacket, a
// tall red headscarf and an apron, waddling as they walk and holding what they carry up high.
import { drawDish, drawIngredient } from './food-art.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawChef(ctx, chef, time) {
  const step = chef.moving ? Math.sin(chef.walk) : 0;
  const bob = chef.moving ? Math.abs(Math.sin(chef.walk)) * 4 : Math.sin(chef.bob * 2.5) * 1.2;
  const x = chef.x;
  const y = chef.y;
  ellipse(ctx, x, y + 4, 28, 11, 'rgba(0,0,0,0.3)');
  ctx.save();
  ctx.translate(x, y - bob);
  // Feet.
  ellipse(ctx, -10 + step * 4, -2, 9, 6, '#2b2020');
  ellipse(ctx, 10 - step * 4, -2, 9, 6, '#2b2020');
  // Body, apron and sash.
  ellipse(ctx, 0, -26, 25, 27, '#2f3f75');
  ctx.beginPath();
  ctx.moveTo(-15, -36);
  ctx.lineTo(15, -36);
  ctx.lineTo(18, -6);
  ctx.quadraticCurveTo(0, 0, -18, -6);
  ctx.closePath();
  ctx.fillStyle = '#f3ead9';
  ctx.fill();
  ctx.fillStyle = '#e0533d';
  ctx.fillRect(-22, -38, 44, 6);
  // Arms reach up when carrying.
  const carrying = chef.held !== null;
  const armY = carrying ? -54 : -26;
  ellipse(ctx, -24, armY, 8, 10, '#2f3f75');
  ellipse(ctx, 24, armY, 8, 10, '#2f3f75');
  ellipse(ctx, -24, armY - 6, 6, 6, '#f1c49b');
  ellipse(ctx, 24, armY - 6, 6, 6, '#f1c49b');
  // Head, face toward the direction of travel.
  ellipse(ctx, 0, -58, 19, 18, '#f1c49b');
  ellipse(ctx, 6 * chef.facing, -56, 2.6, 3.2, '#2b2020');
  ellipse(ctx, -5 + 6 * chef.facing, -56, 2.6, 3.2, '#2b2020');
  ellipse(ctx, 2 * chef.facing - 9, -50, 4, 2.5, 'rgba(240,120,110,0.5)');
  ellipse(ctx, 2 * chef.facing + 9, -50, 4, 2.5, 'rgba(240,120,110,0.5)');
  // Headscarf with a knot that swings.
  ctx.beginPath();
  ctx.ellipse(0, -68, 20, 13, 0, Math.PI, TAU);
  ctx.fillStyle = '#d63c2f';
  ctx.fill();
  ctx.fillStyle = '#b52d22';
  ctx.fillRect(-20, -70, 40, 5);
  const swing = Math.sin(time * 5 + chef.walk) * 0.3;
  ctx.save();
  ctx.translate(-18 * chef.facing, -68);
  ctx.rotate(swing - 0.6 * chef.facing);
  ellipse(ctx, -6 * chef.facing, 2, 8, 4, '#d63c2f');
  ctx.restore();
  // What they carry, held above the head.
  if (carrying) {
    if (chef.held.dish) drawDish(ctx, chef.held.contents, 0, -92, 26, { steam: time });
    else drawIngredient(ctx, chef.held, 0, -90, 52, time);
  }
  ctx.restore();
}
