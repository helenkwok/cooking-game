// Takes the game's screenshots: serves game/, opens each scene in shots.json in headless Chrome
// at 1280x720 over the DevTools protocol, waits for window.__shotReady, and saves Chrome's own
// JPEG of the page into screenshots/ (lowering the quality until it fits the 256 KiB cap).
// Node 22+, standard library only (it uses Node's built-in WebSocket and fetch):
//   node tools/shoot.ts [--chrome <path to chrome>] [--only <name>] [--out <dir>]
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { serveGame } from '../serve.ts';

const MAX_BYTES = 262144;
const repo = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const chromePath = option('--chrome') ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const only = option('--only');
const outDir = option('--out') ?? join(repo, 'screenshots');

type Shot = { name: string; query: string };
const shots: Shot[] = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A tiny DevTools client: send(method, params) resolves with the result. */
function connect(url: string): Promise<{ send: (method: string, params?: object) => Promise<any>; close: () => void }> {
  return new Promise((ready, fail) => {
    const socket = new WebSocket(url);
    let id = 0;
    const waiting = new Map<number, (message: any) => void>();
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && waiting.has(message.id)) {
        waiting.get(message.id)!(message);
        waiting.delete(message.id);
      }
    };
    socket.onerror = () => fail(new Error(`cannot reach ${url}`));
    socket.onopen = () =>
      ready({
        send(method, params = {}) {
          id += 1;
          const mine = id;
          socket.send(JSON.stringify({ id: mine, method, params }));
          return new Promise((resolve, reject) =>
            waiting.set(mine, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))),
          );
        },
        close: () => socket.close(),
      });
  });
}

const server = serveGame(join(repo, 'game'), 0);
await new Promise((done) => server.on('listening', done));
const gamePort = (server.address() as AddressInfo).port;

const profile = mkdtempSync(join(tmpdir(), 'steam-lantern-chrome-'));
const debugPort = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

try {
  let target: any = null;
  for (let attempt = 0; attempt < 50 && target === null; attempt += 1) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      target = list.find((t: any) => t.type === 'page') ?? null;
    } catch {
      // Chrome is still starting.
    }
  }
  if (target === null) throw new Error('Chrome did not open a page');
  const page = await connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  mkdirSync(outDir, { recursive: true });

  for (const shot of shots) {
    if (only && shot.name !== only) continue;
    await page.send('Page.navigate', { url: `http://127.0.0.1:${gamePort}/index.html${shot.query}` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i += 1) {
      await sleep(100);
      const result = await page.send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
      ready = result.result.value === true;
    }
    if (!ready) throw new Error(`${shot.name}: the scene never said it was ready`);
    let quality = 92;
    let bytes: Buffer;
    do {
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
      bytes = Buffer.from(data, 'base64');
      quality -= 4;
    } while (bytes.length > MAX_BYTES && quality > 40);
    writeFileSync(join(outDir, shot.name), bytes);
    console.log(`${shot.name}: ${bytes.length} bytes at quality ${quality + 4}`);
  }
  page.close();
} finally {
  chrome.kill();
  server.close();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may still hold its profile for a moment; the temp folder is harmless.
  }
}
