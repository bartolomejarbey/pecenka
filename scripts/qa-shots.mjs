#!/usr/bin/env node
/**
 * Vizuální QA webu — screenshoty a měření přes Chrome DevTools Protocol.
 *
 * Playwright se na tomhle stroji nespustí, takže mluvíme s chrome-headless-shell
 * přímo přes CDP (WebSocket je v Node 21+ vestavěný, žádná závislost navíc).
 *
 *   node scripts/qa-shots.mjs <výstupní-adresář> [--url http://127.0.0.1:3000] [--motion]
 *
 * Ve výchozím stavu se hlásí `prefers-reduced-motion: reduce`, aby byl snímek
 * ustálený a nechytal animace v půlce. S `--motion` se měří i doběh animací.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.argv[2] || "qa";
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};
const BASE = arg("--url", "http://127.0.0.1:3000");
const MOTION = process.argv.includes("--motion");

const SHELL = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell",
);

const PAGES = [
  ["home", "/"],
  ["domky", "/domky"],
  ["achat", "/domky/achat"],
  ["mech", "/domky/mech"],
  ["rezervace", "/rezervace"],
  ["lokalita", "/lokalita"],
  ["cenik", "/cenik"],
  ["galerie", "/galerie"],
  ["faq", "/faq"],
  ["o-nas", "/o-nas"],
  ["kontakt", "/kontakt"],
  ["darkovy-poukaz", "/darkovy-poukaz"],
];

const VIEWPORTY = [
  { tag: "d", width: 1440, height: 900, dsf: 1, mobile: false },
  { tag: "m", width: 393, height: 852, dsf: 2, mobile: true },
];

/* ===== minimalistický CDP klient ===== */

function cdp(ws) {
  let id = 0;
  const cekajici = new Map();
  const posluchaci = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && cekajici.has(m.id)) {
      const { res, rej } = cekajici.get(m.id);
      cekajici.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method) {
      (posluchaci.get(m.method) || []).forEach((f) => f(m.params));
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const zprava = { id: ++id, method, params };
      if (sessionId) zprava.sessionId = sessionId;
      cekajici.set(zprava.id, { res, rej });
      ws.send(JSON.stringify(zprava));
      setTimeout(() => cekajici.has(zprava.id) && (cekajici.delete(zprava.id), rej(new Error(`timeout ${method}`))), 30000);
    });
  const on = (method, fn) => posluchaci.set(method, [...(posluchaci.get(method) || []), fn]);
  return { send, on };
}

const spat = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(SHELL)) {
    console.error(`Chybí chrome-headless-shell: ${SHELL}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const port = 9222 + Math.floor(process.pid % 500);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "qa-chrome-"));
  const chrome = spawn(SHELL, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--no-first-run",
    `--user-data-dir=${profil}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await spat(250);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch {}
  }
  if (!wsUrl) {
    chrome.kill();
    console.error("Chrome nenaběhl");
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const { send } = cdp(ws);

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);

  await s("Page.enable");
  await s("Runtime.enable");
  await s("Network.enable");
  if (!MOTION) await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  const zprava = [];

  for (const vp of VIEWPORTY) {
    await s("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dsf,
      mobile: vp.mobile,
    });

    for (const [name, cesta] of PAGES) {
      const t0 = Date.now();
      await s("Page.navigate", { url: BASE + cesta });
      // počkat na load event
      await new Promise((res) => {
        const timer = setTimeout(res, 15000);
        const kontrola = setInterval(async () => {
          try {
            const r = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
            if (r.result.value === "complete") {
              clearInterval(kontrola);
              clearTimeout(timer);
              res();
            }
          } catch {}
        }, 120);
      });
      // cookie lišta pryč, ať nezakrývá obsah
      await s("Runtime.evaluate", { expression: "try{localStorage.setItem('sedmyles-cookies','ack')}catch(e){}" });
      await spat(MOTION ? 1400 : 450);

      const metriky = await s("Runtime.evaluate", {
        expression: `(() => {
          const n = performance.getEntriesByType('navigation')[0] || {};
          const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          const res = performance.getEntriesByType('resource');
          return JSON.stringify({
            dcl: Math.round(n.domContentLoadedEventEnd || 0),
            load: Math.round(n.loadEventEnd || 0),
            fcp: fcp ? Math.round(fcp.startTime) : null,
            lcp: lcp ? Math.round(lcp.startTime) : null,
            pozadavku: res.length,
            js: Math.round(res.filter(r => r.initiatorType === 'script' || r.name.endsWith('.js')).reduce((a,r)=>a+(r.transferSize||0),0)/1024),
            obrazky: Math.round(res.filter(r => r.initiatorType === 'img').reduce((a,r)=>a+(r.transferSize||0),0)/1024),
            vyska: document.documentElement.scrollHeight,
            prekryv: (() => {
              // vodorovný přetok = nejčastější mobilní chyba
              const w = document.documentElement.clientWidth;
              return [...document.querySelectorAll('body *')]
                .filter(el => el.getBoundingClientRect().right > w + 1)
                .slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + (el.className.toString().slice(0,60)));
            })(),
            skryte: document.querySelectorAll('[data-reveal]:not([data-revealed])').length,
          });
        })()`,
        returnByValue: true,
      });
      const m = JSON.parse(metriky.result.value);

      const shot = await s("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT, `${vp.tag}-${name}.png`), Buffer.from(shot.data, "base64"));

      // celá stránka
      const full = await s("Page.captureScreenshot", {
        format: "jpeg",
        quality: 72,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: vp.width, height: Math.min(m.vyska, 12000), scale: 1 },
      });
      fs.writeFileSync(path.join(OUT, `${vp.tag}-${name}-full.jpg`), Buffer.from(full.data, "base64"));

      zprava.push({ vp: vp.tag, stranka: name, msCelkem: Date.now() - t0, ...m });
    }
  }

  fs.writeFileSync(path.join(OUT, "metriky.json"), JSON.stringify(zprava, null, 1));
  console.log(JSON.stringify(zprava, null, 1));
  ws.close();
  chrome.kill();
  fs.rmSync(profil, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
