#!/usr/bin/env node
/**
 * Screenshoty administrace — přihlásí se a projde obrazovky.
 *   node scripts/dev/qa-admin.mjs <adresář> [heslo]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.argv[2] || "qa-admin";
const HESLO = process.argv[3] || "TajneHeslo2026";
const EMAIL = process.env.ADMIN_EMAIL || "admin@sedmyles.cz";
const BASE = process.env.QA_URL || "http://127.0.0.1:3000";
const SHELL = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell",
);

const STRANKY = [
  ["prihlaseni", "/admin/prihlaseni"],
  ["dnes", "/admin"],
  ["kalendar", "/admin/kalendar"],
  ["rezervace", "/admin/rezervace"],
  ["penize", "/admin/penize"],
  ["nastaveni", "/admin/nastaveni"],
];
const VIEWPORTY = [
  { tag: "d", width: 1440, height: 1100, dsf: 1, mobile: false },
  { tag: "m", width: 393, height: 900, dsf: 2, mobile: true },
];

fs.mkdirSync(OUT, { recursive: true });
const profil = fs.mkdtempSync(path.join(os.tmpdir(), "qa-admin-"));
const port = 9700;
const chrome = spawn(SHELL, [
  "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-first-run",
  `--user-data-dir=${profil}`, `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });

const spat = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await spat(200);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const cek = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cek.has(m.id)) {
    const { res, rej } = cek.get(m.id); cek.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
});
const send = (method, params = {}, sid) => new Promise((res, rej) => {
  const z = { id: ++id, method, params }; if (sid) z.sessionId = sid;
  cek.set(z.id, { res, rej }); ws.send(JSON.stringify(z));
  setTimeout(() => cek.has(z.id) && (cek.delete(z.id), rej(new Error("timeout " + method))), 30000);
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s("Page.enable"); await s("Runtime.enable");

const jdi = async (cesta) => {
  await s("Page.navigate", { url: BASE + cesta });
  for (let i = 0; i < 100; i++) {
    await spat(100);
    const r = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
    if (r.result.value === "complete") break;
  }
  await spat(400);
};

// přihlášení
await s("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await jdi("/admin/prihlaseni");
await s("Runtime.evaluate", {
  expression: `(() => {
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#email', ${JSON.stringify(EMAIL)});
    set('#heslo', ${JSON.stringify(HESLO)});
    document.querySelector('form').requestSubmit();
    return true;
  })()`,
});
await spat(3000);
const kde = await s("Runtime.evaluate", { expression: "location.pathname", returnByValue: true });
console.log("po přihlášení:", kde.result.value);

for (const vp of VIEWPORTY) {
  await s("Emulation.setDeviceMetricsOverride", {
    width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, mobile: vp.mobile,
  });
  for (const [name, cesta] of STRANKY) {
    if (name === "prihlaseni" && vp.tag === "m") continue;
    await jdi(cesta);
    const vyska = await s("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
    const shot = await s("Page.captureScreenshot", {
      format: "jpeg", quality: 78, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(vyska.result.value, 4000), scale: 1 },
    });
    fs.writeFileSync(path.join(OUT, `${vp.tag}-${name}.jpg`), Buffer.from(shot.data, "base64"));
  }
}

// detail rezervace
const kod = await s("Runtime.evaluate", {
  expression: `(async () => {
    const r = await fetch('/admin/rezervace');
    const t = await r.text();
    const m = t.match(/\\/admin\\/rezervace\\/(SL-\\d\\d-\\d{4})/);
    return m ? m[1] : null;
  })()`, awaitPromise: true, returnByValue: true,
});
if (kod.result.value) {
  for (const vp of VIEWPORTY) {
    await s("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, mobile: vp.mobile });
    await jdi(`/admin/rezervace/${kod.result.value}`);
    const vyska = await s("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
    const shot = await s("Page.captureScreenshot", {
      format: "jpeg", quality: 78, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(vyska.result.value, 4000), scale: 1 },
    });
    fs.writeFileSync(path.join(OUT, `${vp.tag}-detail.jpg`), Buffer.from(shot.data, "base64"));
  }
  console.log("detail:", kod.result.value);
}

console.log("hotovo:", fs.readdirSync(OUT).length, "snímků");
ws.close(); chrome.kill(); fs.rmSync(profil, { recursive: true, force: true });
