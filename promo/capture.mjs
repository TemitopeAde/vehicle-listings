// Records the promo: drives the real dashboard, storefront listings and vehicle
// details in a headless browser, captures frames over CDP and logs every click
// and keystroke with the same clock, so render.mjs can line the sound up.
//
// Needs the app running with local demo data (see promo/README.md).
import { chromium } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROMO_BASE_URL || "http://localhost:4350";
const OUT = process.env.PROMO_BUILD_DIR || path.join(here, "build");
const framesDir = path.join(OUT, "frames");
const runtime = await fs.readFile(path.join(here, "runtime.js"), "utf8");

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const events = [];
const frames = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const jitter = (ms, spread = 0.25) => ms * (1 - spread + Math.random() * spread * 2);

const browser = await chromium.launch({ args: ["--hide-scrollbars"] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

let writing = Promise.resolve();
cdp.on("Page.screencastFrame", (frame) => {
  const index = frames.length;
  const file = `frame-${String(index).padStart(6, "0")}.jpg`;
  frames.push({ file, ts: frame.metadata.timestamp });
  const bytes = Buffer.from(frame.data, "base64");
  writing = writing.then(() => fs.writeFile(path.join(framesDir, file), bytes));
  cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
});

await page.addInitScript(runtime);
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 95,
  maxWidth: 1920,
  maxHeight: 1080,
  everyNthFrame: 1,
});

let cursor = { x: 960, y: 540 };

async function moveTo(x, y, ms = 800) {
  const steps = Math.max(12, Math.round(ms / 16));
  const sx = cursor.x;
  const sy = cursor.y;
  for (let i = 1; i <= steps; i++) {
    const e = ease(i / steps);
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(ms / steps);
  }
  cursor = { x, y };
}

async function centerOf(locator) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error("Element is not on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function clickEl(locator, ms = 850) {
  const c = await centerOf(locator);
  await moveTo(c.x, c.y, ms);
  await sleep(180);
  events.push({ t: Date.now(), kind: "click" });
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(260);
}

// Clicks a field and makes sure it has focus before any keystrokes are sent.
async function focusField(locator) {
  await locator.waitFor();
  await sleep(300);
  await clickEl(locator);
  const focused = await locator.evaluate((el) => el === document.activeElement);
  if (!focused) {
    await sleep(400);
    await clickEl(locator);
  }
}

async function typeText(text, delay = 120) {
  for (const ch of text) {
    events.push({ t: Date.now(), kind: "key" });
    await page.keyboard.type(ch);
    await sleep(jitter(delay));
  }
}

async function scrollBy(dy, ms) {
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(16);
  }
}

const promo = (fn, ...args) =>
  page.evaluate(([name, a]) => window.__promo[name](...a), [fn, args]);

async function wipeTo(url, readyText) {
  await promo("wipeIn");
  await sleep(750);
  await page.goto(BASE + url, { waitUntil: "domcontentloaded" });
  await page.getByText(readyText, { exact: false }).first().waitFor({ timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await promo("cursorAt", cursor.x, cursor.y);
  await sleep(200);
  await promo("wipeOut");
  await sleep(700);
}

// ---------- storyboard ----------

await page.goto(BASE + "/promo/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("domcontentloaded");
await promo("card", {
  title: "Vehicle Listings",
  sub: "Run your dealership from one connected workspace.",
  chips: ["Dealer workspace", "Storefront", "Vehicle details"],
});
await promo("cursorAt", cursor.x, cursor.y);
await page.getByText("Welcome to your showroom", { exact: false }).first().waitFor({ timeout: 60000 });
await page.waitForLoadState("networkidle").catch(() => {});
await sleep(3600);
await promo("hideCard");
await sleep(700);

// 01 dashboard overview
await promo("caption", "01", "Your dealer workspace", "Stock, inquiries and analytics in one place.");
await promo("zoom", 1.05, 50, 50, 7000);
await sleep(2200);
await clickEl(page.getByRole("button", { name: "Vehicles", exact: true }));
await page.waitForLoadState("networkidle").catch(() => {});
await sleep(900);

// 02 manage inventory
await promo("zoom", 1, 50, 50, 900);
await promo("caption", "02", "Manage your inventory", "Search, edit and publish every listing.");
const search = page.getByPlaceholder("Search by vehicle title…");
await focusField(search);
await typeText("Toyota", 150);
await sleep(1600);
await scrollBy(420, 1400);
await sleep(900);
await scrollBy(-420, 900);
await sleep(500);
await promo("hideCaption");

// 03 storefront listings
await wipeTo("/promo/listings", "Find your next chapter.");
await promo("caption", "03", "Buyers browse a live showroom", "Filters, sorting and photos on your own site.");
const storeSearch = page.getByPlaceholder("Make, model or keyword");
await focusField(storeSearch);
await typeText("Lexus", 140);
await sleep(1400);
await clickEl(page.getByRole("button", { name: "View vehicle" }).first(), 900);
await sleep(600);
await promo("hideCaption");

// 04 vehicle details (opens inline on the listings page)
await page.getByRole("heading", { name: "2020 Lexus RX 350 F Sport" }).first().waitFor({ timeout: 30000 });
await sleep(400);
await promo("caption", "04", "Every detail, one tap away", "Gallery, specs, pricing and a share link.");
await scrollBy(560, 2600);
await sleep(900);
await clickEl(page.getByRole("button", { name: "Share", exact: true }).first(), 800);
await sleep(1300);
await promo("hideCaption");
await scrollBy(-560, 1200);
await sleep(600);

// end card
await promo("card", {
  title: "Vehicle Listings",
  sub: "Inventory, inquiries and buyers, all in one place.",
  chips: ["List once", "Show everywhere", "Sell faster"],
  light: true,
});
await sleep(4200);

await cdp.send("Page.stopScreencast").catch(() => {});
await sleep(400);
await writing;
await browser.close();

await fs.writeFile(
  path.join(OUT, "timeline.json"),
  JSON.stringify({ frames, events }, null, 2),
);
console.log(`frames: ${frames.length}, events: ${events.length}, output: ${OUT}`);
