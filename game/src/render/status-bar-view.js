// The strip under the kitchen: the controls, always in view.
import { FONT } from '../config.js';
import { STATUS_BAR } from './layout.js';

export function drawStatusBar(ctx) {
  const { x, y, w, h } = STATUS_BAR;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fillStyle = '#2b1d22';
  ctx.fill();
  ctx.font = `bold 12.5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e7c27a';
  const keys = 'WASD / click: walk   ·   Space: work   ·   hold Space: chop   ·   1–8: crates   ·   Q: bin   ·   P: pause   ·   M: mute';
  ctx.fillText(keys, x + w / 2, y + h / 2 + 1);
}
