// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps,
// world events become sounds and effects, and the renderer paints. The game moves between four
// screens: title, play, paused and the end-of-night results.
//
// ?seed=N fixes the tickets. ?shot=service|menu|lastcall|results stages that scene through the
// real rules instead of running the loop, paints it and sets window.__shotReady for a screenshot.
import { BEST_KEY, COOK, STEP } from './config.js';
import { createAudio } from './audio.js';
import { chopAt } from './kitchen.js';
import { nextStep, STEP_CHOP } from './recipes.js';
import { createRandom } from './random.js';
import { phaseIndex, secondsLeft } from './shift.js';
import { BOARD, stationAt } from './stations.js';
import { stationInReach } from './chef.js';
import { createWorld } from './world.js';
import { createInput, KEY_CONFIRM, KEY_CRATE, KEY_MUTE, KEY_PAUSE, KEY_TOSS, KEY_USE } from './input.js';
import { applyEvents, createEffects, updateEffects } from './render/effects.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render/renderer.js';
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

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best night then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, fx);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { fx, time: scene.time, hover: null, best: scene.best, servedDishes: scene.servedDishes, hints: true });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const audio = createAudio();
  const input = createInput(canvas, renderer.toStage);
  let screen = SCREEN_TITLE;
  let best = readBest();
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

  function startShift() {
    world.reset();
    Object.assign(fx, createEffects());
    servedDishes = [];
    warnedLastSeconds = false;
    lastTick = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    audio.setIntensity(0);
    announce('The stall is open. Tickets will arrive on the board.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    overAt = clock;
    audio.stopMusic();
    if (world.shift.coins > best) {
      best = world.shift.coins;
      saveBest(best);
    }
    announce(`Night over. ${world.shift.coins} coins, ${world.shift.served} dishes served.`);
  }

  /** A click in play: chop at a board in reach, else walk to the clicked station and work it. */
  function clickStation(x, y) {
    const s = stationAt(world.stations, x, y);
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

  function handlePresses() {
    for (const press of input.takePresses()) {
      if (press.type === KEY_MUTE) {
        audio.unlock();
        announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
        continue;
      }
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        // The results card holds a moment, so a last frantic Space doesn't skip it.
        const settled = screen === SCREEN_TITLE || clock - overAt > 1.2;
        if (settled && (press.type === KEY_CONFIRM || press.type === 'click')) startShift();
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
      } else if (e.type === 'ticket') announce('New ticket on the board.');
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
        if (world.shift.over) endShift();
      }
      audio.setIntensity(phaseIndex(world.shift) >= 1 ? 1 : 0);
    } else {
      accumulator = 0;
      updateEffects(fx, dt);
    }
    audio.tick();
    const hover = input.pointer.inside ? stationAt(world.stations, input.pointer.x, input.pointer.y) : null;
    renderer.draw(world, screen, { fx, time: clock, hover, best, servedDishes, ready: clock - overAt > 1.2 });
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

  announce('Steam Lantern. Press Space or click to open the stall.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
