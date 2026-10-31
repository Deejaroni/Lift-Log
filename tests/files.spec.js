// Keeps the page, the js/ files and the offline cache list in step, and files a manageable size.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const jsFiles = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`);
const cached = [...read("sw.js").matchAll(/"([^"]+)"/g)].map(m => m[1]);
const scripts = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);

test("every app script is loaded by the page and cached for offline use", () => {
  const loaded = new Set([...scripts, "js/version.js"]);   // version.js is imported by a module script
  expect(jsFiles.filter(f => !loaded.has(f))).toEqual([]);
  expect(jsFiles.filter(f => !cached.includes(f))).toEqual([]);
  expect(scripts.filter(f => !cached.includes(f))).toEqual([]);
});

test("the page loads main.js last, after everything it starts up", () => {
  const app = scripts.filter(f => f.startsWith("js/"));
  expect(app[app.length - 1]).toBe("js/main.js");
  expect(app.slice(0, 2)).toEqual(["js/ui.js", "js/state.js"]);
});

test("code files stay under about 600 lines", () => {
  // exercise-library.js is the exercise list itself (data, not code).
  const long = jsFiles.filter(f => f !== "js/exercise-library.js").map(f => [f, read(f).split("\n").length]).filter(([, n]) => n > 600);
  expect(long).toEqual([]);
  expect(read("index.html").split("\n").length).toBeLessThan(600);
});
