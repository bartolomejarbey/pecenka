#!/usr/bin/env node
/** Screenshoty hostovského portálu naostro — přihlásí se a projde protokol. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.argv[2] || "qa-portal";
/**
 * Fáze pobytu, ve které se má portál projít.
 *
 * Portál vypadá jinak před příjezdem, na místě a u odjezdu — projít ho v jedné
 * fázi znamená vidět třetinu. Přepnutí jede přes ukázkový režim, který posouvá
 * termín rezervace; funguje jen na místní databázi.
 *
 *   node scripts/dev/qa-portal.mjs <adresář> <vs> <kód> [faze]
 */
const FAZE = process.argv[5] || null;
const BASE = process.env.QA_URL || "https://sedmyles.vercel.app";
const VS = process.argv[3] || "2610000015";
const KOD = process.argv[4] || "S8DEZ5HB";
const SHELL = path.join(os.homedir(),
  `Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-${process.arch === "arm64" ? "arm64" : "x64"}/chrome-headless-shell`);

fs.mkdirSync(OUT, { recursive: true });
const profil = fs.mkdtempSync(path.join(os.tmpdir(), "qa-p-"));
const port = 9755;
const chrome = spawn(SHELL, ["--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
  "--no-first-run",`--user-data-dir=${profil}`,`--remote-debugging-port=${port}`,"about:blank"], { stdio: "ignore" });

const spat = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await spat(200);
  try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
const sock = new WebSocket(ws);
await new Promise((r) => sock.addEventListener("open", r, { once: true }));
let id = 0; const cek = new Map();
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cek.has(m.id)) { const { res, rej } = cek.get(m.id); cek.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result); }
});
const send = (method, params = {}, sid) => new Promise((res, rej) => {
  const z = { id: ++id, method, params }; if (sid) z.sessionId = sid;
  cek.set(z.id, { res, rej }); sock.send(JSON.stringify(z));
  setTimeout(() => cek.has(z.id) && (cek.delete(z.id), rej(new Error("t/o " + method))), 40000);
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s("Page.enable"); await s("Runtime.enable");
await s("Emulation.setDeviceMetricsOverride", { width: 393, height: 852, deviceScaleFactor: 2, mobile: true });

const jdi = async (cesta) => {
  await s("Page.navigate", { url: BASE + cesta });
  for (let i = 0; i < 150; i++) {
    await spat(100);
    const r = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
    if (r.result.value === "complete") break;
  }
  await spat(700);
};
const snimek = async (jmeno) => {
  const v = await s("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
  const o = await s("Page.captureScreenshot", { format: "jpeg", quality: 82, captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 393, height: Math.min(v.result.value, 2400), scale: 1 } });
  fs.writeFileSync(path.join(OUT, `${jmeno}.jpg`), Buffer.from(o.data, "base64"));
};

if (FAZE) {
  await jdi("/pobyt/ukazka");
  await s("Runtime.evaluate", {
    expression: `[...document.querySelectorAll('form')].find(f => f.querySelector('input[value="${FAZE}"]'))?.requestSubmit()`,
  });
  await spat(4000);
  console.log("fáze:", FAZE);
}

await jdi("/pobyt/prihlaseni");
await snimek("1-prihlaseni");

await s("Runtime.evaluate", { expression: `(() => {
  const set = (sel, val) => { const el = document.querySelector(sel);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('#vs', ${JSON.stringify(VS)}); set('#kod', ${JSON.stringify(KOD)});
  document.querySelector('form').requestSubmit(); return true; })()` });
await spat(4000);
const kde = await s("Runtime.evaluate", { expression: "location.pathname", returnByValue: true });
console.log("po přihlášení:", kde.result.value);
await snimek("2-prehled");

await jdi("/pobyt/domek");
await snimek("3-domek");

await jdi("/pobyt/odjezd");
await snimek("4-odjezd");

await jdi("/pobyt/pomoc");
await snimek("5-pomoc");

await jdi("/pobyt/protokol");
await snimek("6-fotky");
const zona = await s("Runtime.evaluate", { expression: "document.querySelector('h1')?.textContent", returnByValue: true });
console.log("první zóna:", zona.result.value);

/*
 * Dotykové cíle a přetečení.
 *
 * Měří se na poslední otevřené stránce; pro celý průchod se skript pouští
 * pro každou fázi zvlášť. Čtyřicet čtyři pixelů je hranice, pod kterou se
 * palcem netrefí ani člověk bez brýlí.
 */
const audit = await s("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const male = [...document.querySelectorAll('a,button,[role=button],input,summary')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        const st = getComputedStyle(e);
        // Prvky schované pro odečítače (sr-only) se neklepají — vstup pro
        // soubor v průvodci focením spouští viditelné tlačítko vedle.
        const skryty = st.clipPath !== 'none' || st.clip !== 'auto' || st.opacity === '0';
        if (skryty || r.width <= 1 || r.height <= 1) return false;
        // Odkaz uvnitř odstavce je součást věty, ne samostatná akce.
        const vVete = e.tagName === 'A' && e.parentElement?.tagName === 'P';
        if (vVete) return false;
        return r.height < 44 || r.width < 44;
      })
      .map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40));
    return { male, sirka: document.documentElement.scrollWidth };
  })()`,
});
const a = audit.result.value;
if (a.male.length) console.log("malé cíle:", a.male.join(" | "));
if (a.sirka > 393) console.log("vodorovné přetečení:", a.sirka, "px");

console.log("hotovo:", fs.readdirSync(OUT).length, "snímků");
sock.close(); chrome.kill(); fs.rmSync(profil, { recursive: true, force: true });
