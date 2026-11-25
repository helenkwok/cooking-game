// The chef: walks the floor with WASD or the arrow keys, or walks to a clicked station by itself
// (steering round the island) and works it on arrival. Carries one thing at a time: an
// ingredient or a dish.
import { CHEF, FLOOR, ISLAND } from './config.js';

export function createChef() {
  return { x: 640, y: 320, held: null, target: null, facing: 1, walk: 0, moving: false, bob: 0 };
}

export function resetChef(chef) {
  Object.assign(chef, createChef());
}

/** The island grown by `pad` on every side. */
function grown(pad) {
  return { left: ISLAND.x - pad, right: ISLAND.x + ISLAND.w + pad, top: ISLAND.y - pad, bottom: ISLAND.y + ISLAND.h + pad };
}

/** Does the segment from (x0, y0) to (x1, y1) pass through box `b`? (A slab test.) */
function segmentHits(x0, y0, x1, y1, b) {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const edges = [[-dx, x0 - b.left], [dx, b.right - x0], [-dy, y0 - b.top], [dy, b.bottom - y0]];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** The next point to head for on the way to (tx, ty): straight there, or the best corner round the island. */
export function waypoint(x, y, tx, ty) {
  const body = grown(CHEF.radius - 2);
  if (!segmentHits(x, y, tx, ty, body)) return { x: tx, y: ty };
  const g = grown(CHEF.radius + 6);
  const corners = [[g.left, g.top], [g.right, g.top], [g.left, g.bottom], [g.right, g.bottom]];
  let best = null;
  let bestCost = Infinity;
  for (const [cx, cy] of corners) {
    if (segmentHits(x, y, cx, cy, body)) continue;
    const onward = segmentHits(cx, cy, tx, ty, body) ? 2 * (ISLAND.w + ISLAND.h) * 0.25 : 0;
    const cost = Math.hypot(cx - x, cy - y) + Math.hypot(tx - cx, ty - cy) + onward;
    if (cost < bestCost) {
      bestCost = cost;
      best = { x: cx, y: cy };
    }
  }
  return best ?? { x: tx, y: ty };
}

/** Push the chef's body out of the island if a step took it in. */
function collide(chef) {
  const b = grown(0);
  const nx = Math.min(b.right, Math.max(b.left, chef.x));
  const ny = Math.min(b.bottom, Math.max(b.top, chef.y));
  const dx = chef.x - nx;
  const dy = chef.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= CHEF.radius) return;
  if (d > 0) {
    chef.x = nx + (dx / d) * CHEF.radius;
    chef.y = ny + (dy / d) * CHEF.radius;
  } else {
    // The centre is inside: leave by the nearest side.
    const exits = [[chef.x - b.left, -1, 0], [b.right - chef.x, 1, 0], [chef.y - b.top, 0, -1], [b.bottom - chef.y, 0, 1]];
    exits.sort((p, q) => p[0] - q[0]);
    const [depth, ex, ey] = exits[0];
    chef.x += ex * (depth + CHEF.radius);
    chef.y += ey * (depth + CHEF.radius);
  }
}

/**
 * Move the chef for one step. `dx`, `dy` is the keyboard's direction (each -1..1); any key
 * cancels a click-walk. Returns the station reached by a click-walk this step, or null.
 */
export function moveChef(chef, stations, dx, dy, dt) {
  let vx = dx;
  let vy = dy;
  let arrived = null;
  const stepLength = CHEF.speed * dt;
  if (vx !== 0 || vy !== 0) {
    chef.target = null;
    const length = Math.hypot(vx, vy);
    vx /= length;
    vy /= length;
  } else if (chef.target !== null) {
    const s = stations.find((station) => station.id === chef.target);
    const distance = Math.hypot(s.ax - chef.x, s.ay - chef.y);
    if (distance <= stepLength + 0.5) {
      chef.x = s.ax;
      chef.y = s.ay;
      chef.target = null;
      arrived = s;
      vx = 0;
      vy = 0;
    } else {
      const next = waypoint(chef.x, chef.y, s.ax, s.ay);
      const d = Math.max(0.001, Math.hypot(next.x - chef.x, next.y - chef.y));
      vx = (next.x - chef.x) / d;
      vy = (next.y - chef.y) / d;
    }
  }
  chef.moving = vx !== 0 || vy !== 0;
  if (chef.moving) {
    chef.x = Math.min(FLOOR.right, Math.max(FLOOR.left, chef.x + vx * stepLength));
    chef.y = Math.min(FLOOR.bottom, Math.max(FLOOR.top, chef.y + vy * stepLength));
    collide(chef);
    if (Math.abs(vx) > 0.2) chef.facing = vx > 0 ? 1 : -1;
    chef.walk += dt * 11;
  }
  chef.bob += dt;
  return arrived;
}

/** The station the chef can work from where they stand (the closest in reach), or null. */
export function stationInReach(chef, stations) {
  let best = null;
  let bestDistance = CHEF.reach;
  for (const s of stations) {
    const distance = Math.hypot(s.ax - chef.x, s.ay - chef.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = s;
    }
  }
  return best;
}
