/**
 * Browser smoke test for the built game (run after `npm run build`).
 * Serves dist/, opens it in headless Chromium, checks there are no page errors,
 * and checks that pressing an arrow key moves the player.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join('dist', path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

let ok = true;
const fail = (msg: string) => {
  ok = false;
  console.error(`FAIL ${msg}`);
};

try {
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__drr !== undefined, null, { timeout: 15000 });
  const before = await page.evaluate(() => window.__drr!.state().player);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__drr!.state().player);
  if (after.y <= before.y) fail(`player did not move down (before y=${before.y}, after y=${after.y})`);
  else console.log(`ok   player moved from (${before.x},${before.y}) to (${after.x},${after.y})`);
} catch (e) {
  fail(String(e));
}

if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
else console.log('ok   no page errors');

await browser.close();
server.close();
process.exit(ok ? 0 : 1);
