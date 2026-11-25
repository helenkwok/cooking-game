// Takes the game's screenshots: opens each scene in shots.json in headless Chrome at 1280x720,
// waits for window.__shotReady, and saves Chrome's own JPEG of the page into screenshots/
// (lowering the quality until it fits the 256 KiB cap).
//   node tools/shoot.ts [--chrome <path to chrome>] [--only <name>] [--out <dir>]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromeFromArgs, repo, sleep, withChrome } from './chrome.ts';

const MAX_BYTES = 262144;
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const only = option('--only');
const outDir = option('--out') ?? join(repo, 'screenshots');

type Shot = { name: string; query: string };
const shots: Shot[] = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));

await withChrome(chromeFromArgs(args), async (page, gameUrl) => {
  mkdirSync(outDir, { recursive: true });
  for (const shot of shots) {
    if (only && shot.name !== only) continue;
    await page.send('Page.navigate', { url: `${gameUrl}${shot.query}` });
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
});
