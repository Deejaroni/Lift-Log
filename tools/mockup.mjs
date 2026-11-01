// Mockups before building: turns a small spec file into one self-contained page with a light and a dark phone
// side by side at 390 px, drawn with the app's real stylesheet, tokens, font and figure code.
// Run: npm run mockup -- path/to/spec.mjs   Output: tools/out/mockup/<spec name>.html, plus .png stills for checking.
//
// A spec exports default { title, note?, layout?: "grid" | "screen", cards: [...] }. Each card is one of:
//   { title?, caption?, html }                         html is a string, or (mode) => string, using the app's classes
//   { title?, pattern, kind?, roles?, steps? }         pattern is a key in PATTERNS, or a draft pattern object
// "grid" puts cards two to a row (good for animations); "screen" stacks them full width (good for a whole screen).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out", "mockup");
const app = f => pathToFileURL(path.join(ROOT, f)).href;
const { figureMarkup, FIGURE_VIEWBOX } = await import(app("js/figure.js"));
const { PATTERNS } = await import(app("js/movements.js"));

const specPath = process.argv[2];
if (!specPath) { console.error("Usage: npm run mockup -- path/to/spec.mjs"); process.exit(1); }
const spec = (await import(pathToFileURL(path.resolve(specPath)).href)).default;
const name = path.basename(specPath).replace(/\.m?js$/, "");

// The app's stylesheet, with the font inlined so the page opens anywhere, and each token set scoped to a phone.
let css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8");
const font = fs.readFileSync(path.join(ROOT, "fonts/archivo-latin-wdth-normal.woff2")).toString("base64");
css = css.replace(/url\(\.\.\/fonts\/archivo-latin-wdth-normal\.woff2\)/g, `url(data:font/woff2;base64,${font})`);
const vars = block => (block.match(/--[\w-]+:[^;]+;/g) || []).join("");
const light = vars(css.match(/^:root\{([\s\S]*?)\n\}/m)[1]), dark = vars(css.match(/^:root\[data-theme="dark"\]\{([\s\S]*?)\n\}/m)[1]);

const N = 32;
function patternCard(c) {
  const p = typeof c.pattern === "string" ? PATTERNS[c.pattern] : c.pattern;
  if (!p) throw new Error(`No pattern "${c.pattern}"`);
  const ts = Array.from({ length: N }, (_, i) => p.loop ? i / N : i / (N - 1));
  const frames = ts.map(t => `<g class="f">${figureMarkup(p, t, c.roles || {}, c.kind || "barbell")}</g>`).join("");
  const steps = c.steps || p.steps || [];
  return `<svg class="mk-fig" viewBox="${FIGURE_VIEWBOX}" data-period="${p.loop === true ? 1600 : p.loop || p.period || 3200}"${p.loop ? " data-loop" : ""}>${frames}</svg>`
    + (steps.length ? `<ol class="mk-steps">${steps.map(s => `<li>${s}</li>`).join("")}</ol>` : "");
}
const card = (c, mode) => `<div class="mk-card">${c.title ? `<b class="mk-title">${c.title}</b>` : ""}${c.pattern ? patternCard(c) : typeof c.html === "function" ? c.html(mode) : c.html || ""}${c.caption ? `<p class="mk-cap">${c.caption}</p>` : ""}</div>`;
const phone = mode => `<div class="phone ${mode}"><div class="mk-mode">${mode === "light" ? "Light" : "Dark"}</div><div class="mk-${spec.layout || "grid"}">${spec.cards.map(c => card(c, mode)).join("")}</div></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${spec.title}</title>
<style>${css}
html,body{background:#8a9099 !important;color:#111}
body{margin:0;padding:16px;font-family:Archivo,system-ui,sans-serif}
.mk-head{max-width:820px;margin:0 auto 12px;color:#fff}.mk-head h1{margin:0;font-size:22px}.mk-head p{margin:4px 0 0;line-height:1.4}
.mk-wrap{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}
.phone{${light};color-scheme:light;width:390px;box-sizing:border-box;padding:16px;background:var(--bg);color:var(--ink);border-radius:24px}
.phone.dark{${dark};color-scheme:dark}
.mk-mode{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em}
.mk-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mk-screen{display:grid;gap:12px}
.mk-grid .mk-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px;font-size:12px}
.mk-title{display:block;margin:4px 0}.mk-fig{width:100%;display:block}.mk-steps{margin:0;padding-left:16px;color:var(--muted)}
.mk-cap{margin:6px 0 0;color:var(--muted);font-size:13px}.f{display:none}.f.on{display:inline}</style></head>
<body><div class="mk-head"><h1>${spec.title}</h1>${spec.note ? `<p>${spec.note}</p>` : ""}</div><div class="mk-wrap">${phone("light")}${phone("dark")}</div>
<script>
const ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
function phase(ms,per){const u=(ms/per)%1;if(u<.08)return 0;if(u<.46)return ease((u-.08)/.38);if(u<.58)return 1;if(u<.94)return 1-ease((u-.58)/.36);return 0;}
const svgs=[...document.querySelectorAll(".mk-fig")];
window.show=fixed=>{const now=performance.now();for(const s of svgs){const f=s.children,n=f.length,per=+s.dataset.period;
  const i=fixed!=null?Math.min(n-1,Math.round(fixed*(n-1))):s.hasAttribute("data-loop")?Math.floor(((now/per)%1)*n):Math.round(phase(now,per)*(n-1));
  for(let j=0;j<n;j++)f[j].classList.toggle("on",j===i);}};
function tick(){if(!window.frozen)show();requestAnimationFrame(tick);} requestAnimationFrame(tick);
</script></body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, `${name}.html`);
fs.writeFileSync(file, html);

// Stills for checking before sending: the whole page at the start and end of each movement.
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 860, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => document.fonts.ready);
for (const [t, tag] of [[0, "start"], [1, "end"]]) {
  await page.evaluate(t => { window.frozen = true; window.show(t); }, t);
  await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: true });
}
await browser.close();
console.log(`Mockup: ${path.relative(ROOT, file)} (stills: ${name}-start.png, ${name}-end.png)`);
