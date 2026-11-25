// Headless Chrome over the DevTools protocol, shared by the screenshot and smoke-test tools:
// serves game/ on a free port, starts Chrome with a throwaway profile, and hands back a page
// client. Node 22+, standard library only (built-in WebSocket and fetch).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { serveGame } from '../serve.ts';

export const repo = fileURLToPath(new URL('..', import.meta.url));
export const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export type Page = {
  send: (method: string, params?: object) => Promise<any>;
  on: (method: string, handler: (params: any) => void) => void;
  close: () => void;
};

function connect(url: string): Promise<Page> {
  return new Promise((ready, fail) => {
    const socket = new WebSocket(url);
    let id = 0;
    const waiting = new Map<number, (message: any) => void>();
    const handlers = new Map<string, ((params: any) => void)[]>();
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && waiting.has(message.id)) {
        waiting.get(message.id)!(message);
        waiting.delete(message.id);
      } else if (message.method) for (const handler of handlers.get(message.method) ?? []) handler(message.params);
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
        on(method, handler) {
          handlers.set(method, [...(handlers.get(method) ?? []), handler]);
        },
        close: () => socket.close(),
      });
  });
}

/** Run `work(page, gameUrl)` against a fresh headless Chrome at 1280x720, then tidy everything up. */
export async function withChrome(chromePath: string, work: (page: Page, gameUrl: string) => Promise<void>): Promise<void> {
  const server = serveGame(join(repo, 'game'), 0);
  await new Promise((done) => server.on('listening', done));
  const gameUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/index.html`;
  const profile = mkdtempSync(join(tmpdir(), 'steam-lantern-chrome-'));
  const debugPort = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let target: any = null;
    // A freshly updated Chrome can take several seconds to come up: allow it 40.
    for (let attempt = 0; attempt < 200 && target === null; attempt += 1) {
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
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await work(page, gameUrl);
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
}

export function chromeFromArgs(args: string[]): string {
  const i = args.indexOf('--chrome');
  return i === -1 ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : args[i + 1];
}
