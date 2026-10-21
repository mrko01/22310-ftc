// Visual tour of the 3D experience: a frame every step of the scroll
// timeline, so every chapter and every camera move can be inspected.
// Usage: node scripts/tour.mjs [url] [outdir] [steps]
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const url = process.argv[2] || 'http://127.0.0.1:22311/';
const out = process.argv[3] || '/tmp/tour';
const steps = Number(process.argv[4] || 21);
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true, args: ['--use-angle=metal', '--enable-gpu']});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
const problems = [];
page.on('pageerror', (error) => problems.push('page error: ' + error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !/WebGL/.test(message.text())) problems.push('console: ' + message.text().slice(0, 200));
});
await page.goto(url, {waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => window.__SAFFRON_QA__?.robotLoaded, null, {timeout: 60000});

const height = await page.evaluate(() => document.querySelector('#experience').offsetHeight - innerHeight);
for (let step = 0; step < steps; step++) {
  const progress = step / (steps - 1);
  await page.evaluate((y) => scrollTo(0, y), Math.round(height * progress));
  await page.waitForTimeout(step === 0 ? 3000 : 2200);
  const qa = await page.evaluate(() => {
    const q = window.__SAFFRON_QA__;
    return {
      progress: Number((q.progress || 0).toFixed(3)),
      triangles: q.triangles,
      drawCalls: q.drawCalls,
      fieldLoaded: q.fieldLoaded,
      errors: q.errors,
      robot: q.robotBounds,
    };
  });
  const name = `${String(Math.round(progress * 100)).padStart(3, '0')}`;
  await page.screenshot({path: `${out}/frame-${name}.png`});
  console.log(`frame ${name}%  progress=${qa.progress} tris=${qa.triangles} calls=${qa.drawCalls} field=${qa.fieldLoaded}`);
  if (qa.errors && qa.errors.length) console.log('   scene errors:', JSON.stringify(qa.errors).slice(0, 300));
}
if (problems.length) {
  console.log('\nproblems:');
  for (const problem of [...new Set(problems)]) console.log('  ' + problem);
}
await browser.close();
console.log('tour written to', out);
