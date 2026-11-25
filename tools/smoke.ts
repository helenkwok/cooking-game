// A smoke test of the real game loop in headless Chrome: opens the game with ?debug, starts a
// shift with Space, then cooks the first ticket with real mouse clicks and key presses (crates by
// number key, stations by click, chopping by holding the mouse, plating, serving at the pass),
// waiting on the live state between moves. Fails on any page error or if the dish is not served.
// Saves a frame of the live game to --frame <file.jpg> for a look.
//   node tools/smoke.ts [--chrome <path>] [--frame <file.jpg>] [--seed N]
import { writeFileSync } from 'node:fs';
import { chromeFromArgs, sleep, withChrome, type Page } from './chrome.ts';

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const framePath = option('--frame');
const seed = option('--seed') ?? '3';
const errors: string[] = [];

const CRATE_KEYS: Record<string, number> = { noodles: 1, egg: 2, scallion: 3, mushroom: 4, tofu: 5, pork: 6, broth: 7, chili: 8 };

async function read(page: Page, expression: string) {
  const result = await page.send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${expression}: ${result.exceptionDetails.text}`);
  return result.result.value;
}

async function waitFor(page: Page, expression: string, what: string, timeoutMs = 15000) {
  const start = Date.now();
  while (!(await read(page, expression))) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await sleep(50);
  }
}

async function press(page: Page, key: string, code: string, keyCode: number, holdMs = 40) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
  await sleep(holdMs);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
}

async function click(page: Page, x: number, y: number, holdMs = 30) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(holdMs);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

const idle = 'window.__world.chef.target === null';

/** Click station `id` and wait for the chef to get there and work it. */
async function visit(page: Page, id: string) {
  const [x, y] = await read(page, `(() => { const s = window.__world.station('${id}'); return [s.cx, s.cy]; })()`);
  await click(page, x, y);
  await sleep(60);
  await waitFor(page, idle, `the chef to reach ${id}`);
}

/** Fetch `kind` by its number key and run it through its steps; ends holding it ready. */
async function prepare(page: Page, kind: string) {
  const n = CRATE_KEYS[kind];
  await press(page, String(n), `Digit${n}`, 48 + n);
  await sleep(60);
  await waitFor(page, `${idle} && window.__world.chef.held !== null`, `the chef to take ${kind}`);
  for (;;) {
    const step = await read(page, `(() => { const h = window.__world.chef.held; const steps = { noodles: ['boil'], egg: ['boil'], scallion: ['chop'], mushroom: ['chop', 'sear'], tofu: ['sear'], pork: ['sear', 'chop'], broth: [], chili: [] }[h.kind]; return h.done < steps.length ? steps[h.done] : null; })()`);
    if (step === null) return;
    const id = step === 'chop' ? 'board-c' : step === 'boil' ? 'pot-a' : 'griddle-a';
    await visit(page, id);
    const [x, y] = await read(page, `(() => { const s = window.__world.station('${id}'); return [s.cx, s.cy]; })()`);
    if (step === 'chop') {
      // Hold the mouse on the board until the knife is done.
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await waitFor(page, `window.__world.station('${id}').item.done > ${await read(page, `window.__world.station('${id}').item.done`)}`, 'the chopping');
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    } else {
      await waitFor(page, `window.__world.station('${id}').item.progress === 0 && window.__world.station('${id}').item.done > 0 || window.__world.station('${id}').item.done >= 1 && window.__world.station('${id}').item.progress > 0.05`, `${kind} to cook`);
    }
    // Space picks it back up (the chef is standing at the station).
    await press(page, ' ', 'Space', 32);
    await sleep(80);
  }
}

await withChrome(chromeFromArgs(args), async (page, gameUrl) => {
  page.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
  page.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') errors.push(p.args.map((a: any) => a.value ?? a.description).join(' '));
  });
  await page.send('Page.navigate', { url: `${gameUrl}?seed=${seed}&debug` });
  await waitFor(page, 'window.__world !== undefined', 'the game to boot');
  await press(page, ' ', 'Space', 32);
  await waitFor(page, 'window.__world.orders.tickets.length > 0', 'the first ticket');
  const recipe = await read(page, 'window.__world.orders.tickets[0].recipe');
  console.log(`first ticket: ${recipe.name} (${recipe.items.join(', ')})`);
  for (const kind of recipe.items) {
    await prepare(page, kind);
    await visit(page, 'assembly-1');
    console.log(`  plated ${kind}`);
  }
  await visit(page, 'assembly-1');
  await visit(page, 'pass');
  const shift = await read(page, '({ served: window.__world.shift.served, coins: window.__world.shift.coins, time: window.__world.shift.time })');
  console.log(`served ${shift.served} for ${shift.coins} coins at ${shift.time.toFixed(1)}s`);
  if (shift.served !== 1) errors.push('the dish was not served');
  // Pause and resume with P.
  await press(page, 'p', 'KeyP', 80);
  await sleep(150);
  await press(page, 'p', 'KeyP', 80);
  // Leave the chef holding something, mid-kitchen, for the saved frame.
  await press(page, '2', 'Digit2', 50);
  await sleep(500);
  if (framePath !== null) {
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    writeFileSync(framePath, Buffer.from(data, 'base64'));
    console.log(`frame saved to ${framePath}`);
  }
});

if (errors.length > 0) {
  console.error(`smoke test failed:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('smoke test passed: a ticket cooked and served, no page errors');
