// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps,
// world events become sounds and effects, and the renderer paints. The game moves between four
// screens: the title (with the five-night picker), play, paused and the end-of-night results.
//
// ?seed=N fixes the tickets; ?night=N opens on that night. ?shot=service|lastcall|menu|results
// stages that scene through the real rules instead of running the loop, paints it and sets
// window.__shotReady for a screenshot.
import { COOK, STEP } from './config.js';
import { createAudio } from './audio.js';
import { chopAt } from './kitchen.js';
import { NIGHTS } from './nights.js';
import { loadProgress, recordNight, saveProgress } from './progress.js';
import { buyPerk, PERKS, usePerks } from './perks.js';
import { nextStep, STEP_CHOP } from './recipes.js';
import { createRandom } from './random.js';
import { phaseIndex, secondsLeft, starsFor } from './shift.js';
import { BOARD, stationAt } from './stations.js';
import { stationInReach } from './chef.js';
import { createWorld } from './world.js';
import { createInput, KEY_CONFIRM, KEY_CRATE, KEY_LEFT, KEY_MUTE, KEY_PAUSE, KEY_RETRY, KEY_RIGHT, KEY_TOSS, KEY_USE } from './input.js';
import { applyEvents, createEffects, updateEffects } from './render/effects.js';
import { stageToKitchen } from './render/layout.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render/renderer.js';
import { perkRowAt } from './render/screens-view.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const SOUND_FOR = {
  chop: (a, e) => a.play('chop', e.stroke),
  chopped: (a) => a.play('chopped'),
  pickup: (a) => a.play('pickup'),
  place: (a) => a.play('place'),
  drop: (a) => a.play('place'),
  plate: (a) => a.play('plate'),
  splash: (a) => a.play('splash'),
  sizzle: (a) => a.play('sizzle'),
  cooked: (a) => a.play('cooked'),
  perfect: (a) => a.play('perfect'),
  burnt: (a) => a.play('burnt'),
  serve: (a, e) => {
    a.play('serve', e.combo);
    a.play('coin');
  },
  ticket: (a) => a.play('ticket'),
  expire: (a) => a.play('expire'),
  refuse: (a) => a.play('refuse'),
  bin: (a) => a.play('bin'),
  phase: (a) => a.play('phase'),
  over: (a) => a.play('over'),
};

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const fx = createEffects();

/** Where the title screen's night cards sit (stage coordinates), for clicks. */
function nightCardAt(x, y) {
  for (let i = 0; i < NIGHTS.length; i += 1) {
    const cx = 146 + i * 200;
    if (x >= cx && x <= cx + 188 && y >= 392 && y <= 504) return NIGHTS[i].id;
  }
  return null;
}

function runShot(name) {
  const scene = stageShot(name, world, fx);
  // The scene is staged by the base rules; it is drawn with the upgrades its campaign owns.
  usePerks(scene.progress?.perks ?? []);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { fx, time: scene.time, hover: null, servedDishes: scene.servedDishes, hints: true, progress: scene.progress, selected: scene.selected, outcome: scene.outcome });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const audio = createAudio();
  const input = createInput(canvas, renderer.toStage);
  const progress = loadProgress();
  const nightParam = Number.parseInt(params.get('night') ?? '', 10);
  let selected = Number.isInteger(nightParam) && nightParam >= 1 && nightParam <= NIGHTS.length ? nightParam : progress.unlocked;
  let screen = SCREEN_TITLE;
  let outcome = null;
  let accumulator = 0;
  let last = performance.now();
  let clock = 0;
  let servedDishes = [];
  let warnedLastSeconds = false;
  let lastTick = 0;
  let mouseChop = null;
  let overAt = 0;

  // Browsers only let sound start inside a real key or pointer handler.
  window.addEventListener('keydown', () => audio.unlock());
  window.addEventListener('pointerdown', () => audio.unlock());

  function announce(message) {
    status.textContent = message;
  }

  function startNight(nightId) {
    selected = nightId;
    usePerks(progress.perks);
    world.reset(nightId);
    Object.assign(fx, createEffects());
    servedDishes = [];
    warnedLastSeconds = false;
    lastTick = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    audio.setIntensity(0);
    announce(`Night ${nightId}: ${world.shift.night.name}. The stall is open.`);
  }

  function endNight() {
    screen = SCREEN_OVER;
    overAt = clock;
    audio.stopMusic();
    const night = world.shift.night.id;
    const best = progress.best[night] ?? 0;
    const opened = recordNight(progress, night, world.shift.coins, starsFor(world.shift));
    outcome = { best, opened, bought: -1, boughtAt: 0, note: '' };
    announce(`Night over. ${world.shift.coins} coins, ${world.shift.served} dishes served.${opened ? ' A new night is open.' : ''}`);
  }

  /** A click in play: chop at a board in reach, else walk to the clicked station and work it. */
  function clickStation(sx, sy) {
    const p = stageToKitchen(sx, sy);
    const s = stationAt(world.stations, p.x, p.y);
    if (s === null) return;
    const reach = stationInReach(world.chef, world.stations);
    if (s === reach && s.type === BOARD && world.chef.held === null && s.item !== null && nextStep(s.item) === STEP_CHOP) {
      chopAt(world, s);
      mouseChop = s.id;
      return;
    }
    // Holding the button on a far board keeps chopping once the chef gets there.
    if (s.type === BOARD) mouseChop = s.id;
    world.walkTo(s);
  }

  function titlePress(press) {
    if (press.type === KEY_CRATE && press.index < NIGHTS.length) {
      if (press.index + 1 <= progress.unlocked) selected = press.index + 1;
    } else if (press.type === KEY_LEFT) selected = Math.max(1, selected - 1);
    else if (press.type === KEY_RIGHT) selected = Math.min(progress.unlocked, selected + 1);
    else if (press.type === KEY_CONFIRM) startNight(selected);
    else if (press.type === 'click') {
      const card = nightCardAt(press.x, press.y);
      if (card !== null && card <= progress.unlocked && card !== selected) selected = card;
      else startNight(selected);
    }
  }

  function resultsPress(press) {
    // The card holds a moment, so a last frantic Space doesn't skip it.
    if (clock - overAt <= 1.2) return;
    const row = press.type === 'click' ? perkRowAt(press.x, press.y) : press.type === KEY_CRATE && press.index < PERKS.length ? press.index : -1;
    if (row >= 0) {
      shop(row);
      return;
    }
    const night = world.shift.night.id;
    const canAdvance = starsFor(world.shift) > 0 && night < NIGHTS.length;
    if (press.type === KEY_RETRY) startNight(night);
    else if (press.type === KEY_CONFIRM || press.type === 'click') startNight(canAdvance ? night + 1 : night);
    else if (press.type === KEY_PAUSE) screen = SCREEN_TITLE;
  }

  /** Buy upgrade `index` from the bank on the results card. */
  function shop(index) {
    const refused = buyPerk(progress, index);
    if (refused === null) {
      saveProgress(progress);
      Object.assign(outcome, { bought: index, boughtAt: clock, note: `${PERKS[index].name} is yours from the next night on!` });
      audio.play('coin');
      audio.play('perfect');
    } else {
      Object.assign(outcome, { bought: -1, note: refused });
      audio.play('refuse');
    }
    announce(outcome.note);
  }

  function handlePresses() {
    for (const press of input.takePresses()) {
      if (press.type === KEY_MUTE) {
        audio.unlock();
        announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
        continue;
      }
      if (screen === SCREEN_TITLE) {
        titlePress(press);
        continue;
      }
      if (screen === SCREEN_OVER) {
        resultsPress(press);
        continue;
      }
      if (screen === SCREEN_PAUSED) {
        if (press.type === KEY_PAUSE || press.type === KEY_CONFIRM || press.type === 'click') {
          screen = SCREEN_PLAY;
          audio.startMusic();
        }
        continue;
      }
      if (press.type === KEY_PAUSE) {
        screen = SCREEN_PAUSED;
        audio.stopMusic();
      } else if (press.type === KEY_USE) world.useStation();
      else if (press.type === KEY_TOSS && world.chef.held !== null) {
        world.chef.held = null;
        world.events.push({ type: 'bin', x: world.chef.x, y: world.chef.y - 90 });
      } else if (press.type === KEY_CRATE) world.walkTo(world.stations.find((s) => s.key === String(press.index + 1)));
      else if (press.type === 'click') clickStation(press.x, press.y);
    }
  }

  function drainEvents() {
    for (const e of world.events) {
      SOUND_FOR[e.type]?.(audio, e);
      if (e.type === 'serve') {
        servedDishes.push(e.contents);
        announce(`Served for ${e.earned} coins.`);
      } else if (e.type === 'ticket') announce(e.vip ? 'A VIP ticket: double pay, short wait.' : 'New ticket on the board.');
      else if (e.type === 'expire') announce('A customer walked out.');
    }
    applyEvents(fx, world.events, world.orders);
    world.events.length = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    clock += dt;
    handlePresses();
    if (!input.pointer.down) mouseChop = null;
    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const dir = input.direction();
        const chopHeld = input.useHeld() || mouseChop !== null;
        world.step(STEP, { dx: dir.dx, dy: dir.dy, chopHeld, chopRate: COOK.holdChopRate, chopBoard: input.useHeld() ? null : mouseChop });
        if (!warnedLastSeconds && secondsLeft(world.shift) <= 30) {
          warnedLastSeconds = true;
          fx.banner = { message: '30 SECONDS', sub: 'Get those last bowls out!', life: 0 };
        }
        // The last ten seconds tick audibly.
        const whole = Math.ceil(secondsLeft(world.shift));
        if (whole <= 10 && whole !== lastTick) {
          lastTick = whole;
          if (whole > 0) audio.play('tick', whole <= 3);
        }
        drainEvents();
        updateEffects(fx, STEP);
        accumulator -= STEP;
        if (world.shift.over) endNight();
      }
      audio.setIntensity(phaseIndex(world.shift) >= 1 ? 1 : 0);
    } else {
      accumulator = 0;
      updateEffects(fx, dt);
    }
    audio.tick();
    let hover = null;
    if (input.pointer.inside) {
      const p = stageToKitchen(input.pointer.x, input.pointer.y);
      hover = stationAt(world.stations, p.x, p.y);
    }
    renderer.draw(world, screen, { fx, time: clock, hover, servedDishes, ready: clock - overAt > 1.2, progress, selected, outcome });
  }

  // Leaving the tab pauses a running service rather than letting tickets run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
    }
  });

  // ?debug exposes the live world to the smoke test (tools/smoke.ts); nothing reads it otherwise.
  if (params.has('debug')) window.__world = world;

  announce('Steam Lantern. Choose a night with 1 to 5, then press Space or click to open the stall.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
