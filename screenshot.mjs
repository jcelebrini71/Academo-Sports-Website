// Full-page screenshot of a URL via Puppeteer.
// Usage: node screenshot.mjs <url> [label]
// Saves to ./temporary screenshots/screenshot-N[-label].png (auto-incremented, never overwritten).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, 'temporary screenshots');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3];
const width = Number(process.env.WIDTH) || 1440;
const height = Number(process.env.HEIGHT) || 900;

fs.mkdirSync(OUT_DIR, { recursive: true });

// Next number = highest existing N + 1
const nums = fs
  .readdirSync(OUT_DIR)
  .map((f) => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const n = nums.length ? Math.max(...nums) + 1 : 1;
const safeLabel = label ? '-' + label.replace(/[^a-z0-9_-]+/gi, '-') : '';
const outFile = path.join(OUT_DIR, `screenshot-${n}${safeLabel}.png`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Scroll through the page so lazy-loaded / scroll-triggered content renders.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 400);
        y += 400;
        if (y < document.body.scrollHeight) setTimeout(step, 50);
        else { window.scrollTo(0, 0); resolve(); }
      };
      step();
    });
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({ path: outFile, fullPage: true });
  console.log(`Saved ${path.relative(ROOT, outFile)}`);
} finally {
  await browser.close();
}
