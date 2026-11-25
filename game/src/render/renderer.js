// Paints one frame: fits the 1280x720 stage to the window (letterboxed, sharp on high-density
// screens), draws the kitchen into its view (room, counters and stations, the chef, the front
// counter, the effects), then the order board and service panel along the top, the sidebar and
// the status bar, and whichever screen is up.
import { STAGE, ISLAND } from '../config.js';
import { stationInReach } from '../chef.js';
import { openTickets } from '../orders.js';
import { phaseIndex } from '../shift.js';
import { heldTag, ticketProgress, usefulStations } from '../hints.js';
import { drawChef, drawHeldTag, drawRoute } from './chef-view.js';
import { drawCornerProps, drawTipJar, drawVignette } from './decor.js';
import { drawFloaters, drawParticles } from './effects.js';
import { drawBanner, drawOrderBoard, drawServicePanel } from './hud-view.js';
import { drawBackCounters, drawFrontCounter, drawIsland, drawRoom, drawStations, drawStringLights } from './kitchen-view.js';
import { enterKitchen, KITCHEN_VIEW } from './layout.js';
import { drawPaused, drawResults, drawTitle } from './screens-view.js';
import { drawSidebar } from './sidebar-view.js';
import { drawStatusBar } from './status-bar-view.js';

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

  function drawKitchen(world, ui, playing) {
    const time = ui.time;
    const rush = phaseIndex(world.shift) === 1;
    const reach = playing ? stationInReach(world.chef, world.stations) : null;
    const wanted = new Set(openTickets(world.orders).map((t) => t.recipe.id));
    const useful = playing || ui.hints ? usefulStations(world) : new Set();
    const common = { time, reach, hover: playing ? ui.hover : null, knives: ui.fx.knives, wanted, passDisplay: ui.fx.passDisplay, useful };
    const tag = playing || ui.hints ? heldTag(world) : null;
    ctx.save();
    if (ui.fx.shake > 0) ctx.translate((Math.random() - 0.5) * ui.fx.shake * 10, (Math.random() - 0.5) * ui.fx.shake * 10);
    enterKitchen(ctx);
    drawRoom(ctx, time, rush);
    drawBackCounters(ctx);
    drawCornerProps(ctx, time);
    drawStations(ctx, world.stations, { ...common, sides: ['back', 'left', 'right'] });
    drawRoute(ctx, world.chef, world.stations, time);
    // The chef passes behind the island when north of it and in front of it when south.
    const behind = world.chef.y < ISLAND.y + ISLAND.h / 2;
    if (behind) drawChef(ctx, world.chef, time);
    drawIsland(ctx);
    drawStations(ctx, world.stations, { ...common, sides: ['island'] });
    if (!behind) drawChef(ctx, world.chef, time);
    drawFrontCounter(ctx);
    drawTipJar(ctx, 116, 650, world.shift.coins);
    drawStations(ctx, world.stations, { ...common, sides: ['front'] });
    if (tag !== null) drawHeldTag(ctx, world.chef, tag);
    drawStringLights(ctx, time, rush);
    drawVignette(ctx);
    drawParticles(ctx, ui.fx);
    drawFloaters(ctx, ui.fx, false);
    ctx.restore();
    // A thin frame round the kitchen view.
    const v = KITCHEN_VIEW;
    ctx.strokeStyle = '#2b1d22';
    ctx.lineWidth = 4;
    ctx.strokeRect(v.x, v.y, v.srcW * v.scale, v.srcH * v.scale);
  }

  /**
   * Draw `world` under `screen`. `ui` carries what only the view knows: the effects, the time,
   * the hovered station, the best takings, the night's served dishes and the campaign record.
   */
  function draw(world, screen, ui) {
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#100a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, STAGE.width, STAGE.height);
    ctx.clip();
    ctx.fillStyle = '#1b1220';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    const playing = screen === SCREEN_PLAY;
    drawKitchen(world, ui, playing);
    drawOrderBoard(ctx, world.orders, ui.time, ticketProgress(world));
    drawServicePanel(ctx, world.shift, ui.time, ui.fx.coinPulse);
    drawSidebar(ctx, world, ui.progress, ui.time);
    drawStatusBar(ctx, world);
    drawFloaters(ctx, ui.fx, true);
    if (ui.fx.banner !== null && playing) drawBanner(ctx, ui.fx.banner.message, ui.fx.banner.sub, ui.fx.banner.life);

    if (screen === SCREEN_TITLE) drawTitle(ctx, ui.time, ui.progress, ui.selected);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_OVER) drawResults(ctx, world.shift, ui.time, ui.servedDishes, ui.ready ?? true, ui.outcome);
    ctx.restore();
  }

  return { draw, toStage };
}
