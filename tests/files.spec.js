// Keeps the page, the js/ modules and the offline cache list in step, and files a manageable size.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const jsFiles = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`);
const cached = [...read("sw.js").matchAll(/"([^"]+)"/g)].map(m => m[1]);
const html = read("index.html");
const importsOf = f => [...read(f).matchAll(/^import (?:[^;]*? from )?"\.\/([^"]+)";/gm)].map(m => `js/${m[1]}`);

test("the page starts one module, app.js, and no classic app scripts", () => {
  expect([...html.matchAll(/<script type="module" src="([^"]+)"/g)].map(m => m[1])).toEqual(["js/app.js"]);
  expect([...html.matchAll(/<script src="(js\/[^"]+)"/g)]).toEqual([]);
});

test("every module is reached through imports and cached for offline use", () => {
  const reached = new Set(["js/app.js", "js/version.js"]);   // version.js is imported by the page's inline module
  const queue = ["js/app.js"];
  while (queue.length) for (const f of importsOf(queue.shift())) if (!reached.has(f)) { reached.add(f); queue.push(f); }
  expect(jsFiles.filter(f => !reached.has(f))).toEqual([]);
  expect(jsFiles.filter(f => !cached.includes(f))).toEqual([]);
});

test("start-up runs ui and state first and main last", () => {
  const order = importsOf("js/app.js");
  expect(order.slice(0, 2)).toEqual(["js/ui.js", "js/state.js"]);
  expect(order[order.length - 1]).toBe("js/main.js");
});

test("code files stay under about 600 lines", () => {
  // exercise-library.js is the exercise list itself (data, not code).
  const long = jsFiles.filter(f => f !== "js/exercise-library.js").map(f => [f, read(f).split("\n").length]).filter(([, n]) => n > 600);
  expect(long).toEqual([]);
  expect(html.split("\n").length).toBeLessThan(600);
});
