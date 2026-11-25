// Where each part of the screen goes. The order board and service panel run along the top at
// full size; the kitchen is drawn in its own coordinates and scaled into the left-hand view (down
// to the street where diners sit on their stools); the sidebar (nights, stove, kitchen key) stands
// to its right (nights, next up, in hand, key) and a strip of controls runs beneath.

/** The kitchen's own coordinates that are shown (x 26..1254, y 146..770) and how they map to the screen. */
export const KITCHEN_VIEW = { scale: 0.86, srcX: 26, srcY: 146, srcW: 1228, srcH: 624, x: 10, y: 150 };

export const SIDEBAR = { x: 1076, y: 150, w: 194, h: 564 };
export const STATUS_BAR = { x: 10, y: 692, w: 1056, h: 22 };

/** Apply the kitchen view's transform to `ctx` (call between save and restore). */
export function enterKitchen(ctx) {
  const v = KITCHEN_VIEW;
  ctx.translate(v.x, v.y);
  ctx.scale(v.scale, v.scale);
  ctx.translate(-v.srcX, -v.srcY);
  ctx.beginPath();
  ctx.rect(v.srcX, v.srcY, v.srcW, v.srcH);
  ctx.clip();
}

/** A screen (stage) point in kitchen coordinates, for clicks and hovering. */
export function stageToKitchen(x, y) {
  const v = KITCHEN_VIEW;
  return { x: (x - v.x) / v.scale + v.srcX, y: (y - v.y) / v.scale + v.srcY };
}

/** A kitchen point on the screen. */
export function kitchenToStage(x, y) {
  const v = KITCHEN_VIEW;
  return { x: (x - v.srcX) * v.scale + v.x, y: (y - v.srcY) * v.scale + v.y };
}
