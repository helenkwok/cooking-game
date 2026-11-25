// Paints one frame: fits the 1280x720 stage to the window (letterboxed, sharp on high-density
// screens), then draws the room, the counters and stations, the chef, the front counter, the
// effects, the order board and service panel, and whichever screen is up.
import { ISLAND, STAGE } from '../config.js';
import { stationInReach } from '../chef.js';
import { openTickets } from '../orders.js';
import { phaseIndex } from '../shift.js';
import { heldTag, ticketProgress, usefulStations } from '../hints.js';
import { drawChef, drawHeldTag } from './chef-view.js';
import { drawFloaters, drawParticles } from './effects.js';
import { drawBanner, drawOrderBoard, drawServicePanel } from './hud-view.js';
import { drawBackCounters, drawFrontCounter, drawIsland, drawRoom, drawStations, drawStringLights } from './kitchen-view.js';
import { drawPaused, drawResults, drawTitle } from './screens-view.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    view.scale = Math.min(canvas.width / STAGE.width, canvas.height / STAGE.height);
    view.ox = (canvas.width - STAGE.width * view.scale) / 2;
    view.oy = (canvas.height - STAGE.height * view.scale) / 2;
  }

  /** A pointer's client position in stage coordinates. */
  function toStage(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return {
      x: ((clientX - rect.left) * dpr - view.ox) / view.scale,
      y: ((clientY - rect.top) * dpr - view.oy) / view.scale,
    };
  }

  /**
   * Draw `world` under `screen`. `ui` carries what only the view knows: the effects, the time,
   * the hovered station, the best takings and the night's served dishes.
   */
  function draw(world, screen, ui) {
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#100a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shake = ui.fx.shake > 0 ? ui.fx.shake * 10 : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + (Math.random() - 0.5) * shake, view.oy + (Math.random() - 0.5) * shake);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, STAGE.width, STAGE.height);
    ctx.clip();

    const time = ui.time;
    const rush = phaseIndex(world.shift) === 1;
    const playing = screen === SCREEN_PLAY;
    const reach = playing ? stationInReach(world.chef, world.stations) : null;
    const wanted = new Set(openTickets(world.orders).map((t) => t.recipe.id));
    const useful = playing || ui.hints ? usefulStations(world) : new Set();
    const common = { time, reach, hover: playing ? ui.hover : null, knives: ui.fx.knives, wanted, passDisplay: ui.fx.passDisplay, useful };
    const tag = playing || ui.hints ? heldTag(world) : null;

    drawRoom(ctx, time, rush);
    drawBackCounters(ctx);
    drawStations(ctx, world.stations, { ...common, sides: ['back', 'left', 'right'] });
    // The chef passes behind the island when north of it and in front of it when south.
    const behind = world.chef.y < ISLAND.y + ISLAND.h / 2;
    if (behind) drawChef(ctx, world.chef, time);
    drawIsland(ctx);
    drawStations(ctx, world.stations, { ...common, sides: ['island'] });
    if (!behind) drawChef(ctx, world.chef, time);
    drawFrontCounter(ctx);
    drawStations(ctx, world.stations, { ...common, sides: ['front'] });
    if (tag !== null) drawHeldTag(ctx, world.chef, tag);
    drawStringLights(ctx, time, rush);
    drawParticles(ctx, ui.fx);
    drawFloaters(ctx, ui.fx);
    drawOrderBoard(ctx, world.orders, time, ticketProgress(world));
    drawServicePanel(ctx, world.shift, time, ui.fx.coinPulse);
    if (ui.fx.banner !== null && playing) drawBanner(ctx, ui.fx.banner.message, ui.fx.banner.sub, ui.fx.banner.life);

    if (screen === SCREEN_TITLE) drawTitle(ctx, time, ui.best);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_OVER) drawResults(ctx, world.shift, ui.best, time, ui.servedDishes);
    ctx.restore();
  }

  return { draw, toStage };
}
