// Render the robot from a chosen camera, for comparison with a reference
// picture. Usage: node scripts/shot.mjs [url] [out.png] [cam] [look]
import {chromium} from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:22311/';
const out = process.argv[3] || '/tmp/shot.png';
const cam = process.argv[4] || '';
const look = process.argv[5] || '';

const browser = await chromium.launch({headless: true, args: ['--use-angle=metal', '--enable-gpu']});
const page = await browser.newPage({viewport: {width: 1400, height: 1000}});
const query = cam ? `?cam=${encodeURIComponent(cam)}&look=${encodeURIComponent(look)}` : '';
await page.goto(url + query, {waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => window.__SAFFRON_QA__?.robotLoaded, null, {timeout: 60000});
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const q = window.__SAFFRON_QA__;
  const robot = q.scene.getObjectByName('PRESENTATION_ROBOT_ROOT');
  robot.updateWorldMatrix(true, true);
  const box = new (Object.getPrototypeOf(q.robotBounds).constructor === Array ? Object : Object)();
  return {bounds: q.robotBounds, triangles: q.triangles, errors: q.errors};
});
console.log(JSON.stringify(info));
await page.screenshot({path: out});
await browser.close();
console.log('shot written to', out);
