// The service worker runs here in a sandbox with fake caches and network, so no browser is needed.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadWorker({ cached = {}, network = {} } = {}) {
  const handlers = {}, store = new Map(), log = { fetched: [], skipWaiting: 0, opened: [] };
  const key = r => new URL(typeof r === "string" ? r : r.url, "https://app.test/").pathname;
  const cache = name => ({
    addAll: async reqs => { for (const r of reqs) { log.fetched.push({ url: key(r), cache: r.cache }); store.set(`${name}${key(r)}`, `${name}:${key(r)}`); } },
    match: async r => store.get(`${name}${key(r)}`),
    put: async (r, res) => store.set(`${name}${key(r)}`, res),
  });
  Object.entries(cached).forEach(([name, urls]) => urls.forEach(u => store.set(`${name}${key(u)}`, `${name}:${key(u)}`)));
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => { log.skipWaiting++; },
    clients: { claim: async () => {} },
  };
  const ctx = {
    self, location: new URL("https://app.test/"), URL,
    // Like the browser, resolve relative paths against the worker's own address.
    Request: class extends Request { constructor(u, o) { super(new URL(u, "https://app.test/"), o); } },
    caches: { open: async n => { log.opened.push(n); return cache(n); }, keys: async () => [], delete: async () => true, match: async () => undefined },
    fetch: async r => { log.fetched.push({ url: key(r), network: true }); if (!(key(r) in network)) throw new Error("offline"); return { page: network[key(r)], clone() { return this; } }; },
  };
  const src = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8").replace('"__BUILD__"', '"v2"');
  vm.runInNewContext(src, ctx);
  const run = async (type, init) => {
    let p = null, res = null;
    const ev = { ...init, waitUntil: x => { p = x; }, respondWith: x => { res = x; } };
    handlers[type](ev);
    if (p) await p;
    return res && (await res);
  };
  return { run, log };
}
const nav = url => ({ request: { method: "GET", mode: "navigate", url: `https://app.test${url}` } });

test("installing fetches fresh copies and waits instead of taking over", async () => {
  const { run, log } = loadWorker();
  await run("install", {});
  expect(log.fetched.length).toBeGreaterThan(5);
  expect(log.fetched.every(f => f.cache === "reload")).toBe(true);
  expect(log.skipWaiting).toBe(0);
});

test("the page asks the waiting version to take over", async () => {
  const { run, log } = loadWorker();
  await run("message", { data: "skipWaiting" });
  expect(log.skipWaiting).toBe(1);
});

test("the page comes from the same version as its files", async () => {
  const { run, log } = loadWorker({ cached: { v1: ["/index.html", "/"], v2: ["/index.html", "/", "/css/app.css"] }, network: { "/": "network page" } });
  expect(await run("fetch", nav("/"))).toBe("v2:/");
  expect(await run("fetch", { request: { method: "GET", mode: "no-cors", url: "https://app.test/css/app.css" } })).toBe("v2:/css/app.css");
  expect(log.fetched.filter(f => f.network)).toEqual([]);
});

test("without a cached page it falls back to the network", async () => {
  const { run } = loadWorker({ network: { "/": "network page" } });
  expect((await run("fetch", nav("/"))).page).toBe("network page");
});
