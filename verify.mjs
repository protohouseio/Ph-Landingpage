import { chromium } from "playwright";

const out = process.argv[2] ?? ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

// t=0: right after load, logo phase should be starting/mid-animation
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/gsap-00-loadstart.png` });

// t~1.2s: logo should be grown, lines converged
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/gsap-01-logogrown.png` });

// t~2.5s: intro should have risen away, story phase visible, scroll unlocked
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}/gsap-02-storyvisible.png` });

const bodyOverflow = await page.evaluate(() => document.documentElement.style.overflow);
console.log("html overflow after intro:", JSON.stringify(bodyOverflow));

// Now scroll through the story via wheel (Lenis intercepts wheel events)
const pinRange = await page.evaluate(() => {
  const st = window.ScrollTrigger?.getAll?.();
  return st && st.length ? Math.round(st[0].end - st[0].start) : null;
});
console.log("scrollTrigger pin range:", pinRange);

const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log("document scrollHeight:", totalHeight);

for (const [name, frac] of [
  ["s1", 0.06],
  ["s2", 0.18],
  ["s3", 0.32],
  ["s4-circle", 0.5],
  ["s5-split", 0.62],
  ["s6-hero", 0.68],
]) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(frac * totalHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/gsap-${name}.png` });
  console.log(`shot ${name} at scrollY frac ${frac}`);
}

console.log("console errors:", errors.length);
errors.forEach((e) => console.log("  ERR:", e));
await browser.close();
