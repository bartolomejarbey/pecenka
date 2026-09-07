#!/usr/bin/env node
/**
 * Snímek jedné stránky.
 *
 * `qa-shots.mjs` projde celý web a měří; tohle je opak — jedna adresa, jedno
 * rozlišení, volitelně odrolované. Při práci na jedné obrazovce se to volá
 * desetkrát za sebou a čekat kvůli tomu na průchod třinácti stránkami nemá
 * smysl.
 *
 *   node scripts/dev/snimek.mjs <url> <soubor.jpg> [šířka] [výška] [mobil 0|1] [scrollY]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, out, w = "393", h = "852", mobile = "1", scrollY = "0"] = process.argv.slice(2);
if (!url || !out) {
  console.error("Použití: node scripts/dev/snimek.mjs <url> <soubor.jpg> [š] [v] [mobil] [scrollY]");
  process.exit(1);
}

const SHELL = path.join(
  os.homedir(),
  `Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-${
    process.arch === "arm64" ? "arm64" : "x64"
  }/chrome-headless-shell`,
);

const profil = fs.mkdtempSync(path.join(os.tmpdir(), "snimek-"));
const port = 9820 + Math.floor(Math.random() * 40);
const chrome = spawn(
  SHELL,
  ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-first-run",
   `--user-data-dir=${profil}`, `--remote-debugging-port=${port}`, "about:blank"],
  { stdio: "ignore" },
);

const spat = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await spat(200);
  try {
    ws = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {}
}

const sock = new WebSocket(ws);
await new Promise((r) => sock.addEventListener("open", r, { once: true }));
let id = 0;
const cek = new Map();
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cek.has(m.id)) {
    const { res, rej } = cek.get(m.id);
    cek.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
});
const send = (method, params = {}, sid) =>
  new Promise((res, rej) => {
    const z = { id: ++id, method, params };
    if (sid) z.sessionId = sid;
    cek.set(z.id, { res, rej });
    sock.send(JSON.stringify(z));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s("Page.enable");
await s("Runtime.enable");
await s("Emulation.setDeviceMetricsOverride", {
  width: +w, height: +h, deviceScaleFactor: 2, mobile: mobile === "1",
});

await s("Page.navigate", { url });
for (let i = 0; i < 100; i++) {
  await spat(100);
  const r = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
  if (r.result.value === "complete") break;
}
/*
 * `readyState: complete` na streamovaném Nextu nestačí — dokument je hotový,
 * ale obsah ještě dotéká a snímek zachytí kostru z `loading.tsx`.
 * Čekáme, dokud kostra nezmizí.
 */
for (let i = 0; i < 60; i++) {
  const r = await s("Runtime.evaluate", {
    expression: `!document.querySelector('[aria-busy="true"]')`,
    returnByValue: true,
  });
  if (r.result.value) break;
  await spat(200);
}
await spat(800);
if (+scrollY > 0) {
  await s("Runtime.evaluate", { expression: `window.scrollTo(0, ${+scrollY})` });
  await spat(600);
}

const o = await s("Page.captureScreenshot", { format: "jpeg", quality: 82 });
fs.writeFileSync(out, Buffer.from(o.data, "base64"));
console.log(out);

sock.close();
chrome.kill();
await spat(300);
// Chrome dopisuje profil ještě chvíli po `kill`.
fs.rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
process.exit(0);
