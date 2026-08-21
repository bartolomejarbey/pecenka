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
/**
 * Škrcení CPU. Bez něj je na vývojářském Macu všechno pod 200 ms a jank se
 * neukáže — ten se pozná až na telefonu za pět tisíc. 4× je zhruba střední
 * Android, 6× ten nejpomalejší, co ještě někdo používá.
 */
const CPU = Number(arg("--cpu", "1"));
/** Filtr stránek, např. `--jen "cenik|lokalita"`. */
const JEN = arg("--jen", null);
/**
 * Kolikrát každou stránku změřit. Jedno měření je při škrceném CPU šum —
 * dlouhé úlohy se mezi běhy liší i dvojnásobně. Reportuje se medián.
 */
const OPAKOVAT = Number(arg("--opakovat", "1"));

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
  if (CPU > 1) await s("Emulation.setCPUThrottlingRate", { rate: CPU });
  /*
   * Cache vypnutá. S teplou cache dorazí obrázky okamžitě a posuny rozvržení
   * zmizí — měřilo by se tak jen druhé načtení stránky, které nikoho netrápí.
   * `--cache` ji zapne zpátky, když je potřeba měřit opakovanou návštěvu.
   */
  if (!process.argv.includes("--cache")) await s("Network.setCacheDisabled", { cacheDisabled: true });
  if (!MOTION) await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  // Lišta cookies by zakrývala spodek každého snímku — odbavíme ji před načtením.
  // Zároveň se rovnou nasadí sběr posunů rozvržení a dlouhých úloh: obojí musí
  // běžet od první snímky, po `load` už je pozdě.
  await s("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      try{localStorage.setItem('sedmyles-cookies','ack')}catch(e){}
      window.__cls = 0; window.__dlouhe = [];
      try {
        new PerformanceObserver((l) => {
          for (const z of l.getEntries()) {
            if (z.hadRecentInput) continue;
            window.__cls += z.value;
            // Kdo skáče. Bez toho je CLS jen číslo, které se nedá opravit.
            const zdroje = (z.sources || []).map((s) => {
              const el = s.node;
              if (!el || !el.tagName) return '?';
              const cn = typeof el.className === 'string' ? el.className : '';
              const a = s.previousRect || {}, b = s.currentRect || {};
              const jmeno = el.tagName.toLowerCase() + (cn ? '.' + cn.trim().split(/\s+/).slice(0,2).join('.') : '');
              if (a.top === undefined) return jmeno;
              return jmeno + ' y ' + Math.round(a.top) + '->' + Math.round(b.top)
                + ' h ' + Math.round(a.height) + '->' + Math.round(b.height);
            });
            (window.__clsKdo ||= []).push(
              z.value.toFixed(3) + " v " + Math.round(z.startTime) + " ms: " +
              (zdroje.length ? zdroje.join(" + ") : "bez zdroje"));
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch(e) {}
      try {
        new PerformanceObserver((l) => {
          // Čas vzniku rozlišuje hydrataci (hned po načtení) od scrollu.
          for (const z of l.getEntries())
            window.__dlouhe.push({ ms: Math.round(z.duration), kdy: Math.round(z.startTime) });
        }).observe({ type: 'longtask', buffered: true });
      } catch(e) {}
      // LCP se dá přečíst jen přes observer, getEntriesByType ji nevrací.
      window.__lcp = null;
      try {
        new PerformanceObserver((l) => {
          const z = l.getEntries().pop();
          if (z) window.__lcp = Math.round(z.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch(e) {}
    `,
  });

  // Chyby v konzoli sbíráme průběžně; klíč je adresa stránky, kterou zrovna měříme.
  let aktualni = "";
  const chyby = new Map();
  const zapis = (text) => {
    if (!text) return;
    const k = chyby.get(aktualni) ?? [];
    if (k.length < 6 && !k.includes(text)) k.push(text);
    chyby.set(aktualni, k);
  };
  ws.addEventListener("message", (ev) => {
    let z;
    try { z = JSON.parse(ev.data); } catch { return; }
    if (z.method === "Runtime.exceptionThrown") {
      const d = z.params?.exceptionDetails;
      zapis(d?.exception?.description ?? d?.text);
    }
    if (z.method === "Runtime.consoleAPICalled" && z.params?.type === "error") {
      zapis(z.params.args?.map((a) => a.value ?? a.description ?? a.type).join(" "));
    }
  });

  const zprava = [];

  for (const vp of VIEWPORTY) {
    await s("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dsf,
      mobile: vp.mobile,
    });

    for (const [name, cesta] of PAGES) {
      if (JEN && !new RegExp(JEN).test(name)) continue;
      for (let opak = 0; opak < OPAKOVAT; opak++) {
      const t0 = Date.now();
      aktualni = `${vp.name} ${cesta}`;
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
      if (MOTION) {
        /*
         * LCP se zastaví až první interakcí — programový scroll se za ni
         * nepočítá, takže by ji přepsal kterýkoli větší obrázek dole na
         * stránce. Zafixujeme ji tady, před projetím.
         */
        await s("Runtime.evaluate", { expression: "window.__lcpDoScrollu = window.__lcp" });
        // Projet stránku dolů a zpět. Reveal běží při scrollu — bez projetí
        // by se dlouhé úlohy z odhalování nikdy nezměřily.
        await s("Runtime.evaluate", {
          expression: `(async () => {
            const krok = innerHeight * 0.8;
            for (let y = 0; y < document.body.scrollHeight; y += krok) {
              scrollTo(0, y);
              await new Promise(r => setTimeout(r, 90));
            }
            scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 250));
          })()`,
          awaitPromise: true,
        });
      }
      await spat(MOTION ? 600 : 450);

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
            lcp: window.__lcpDoScrollu ?? window.__lcp,
            pozadavku: res.length,
            js: Math.round(res.filter(r => r.initiatorType === 'script' || r.name.endsWith('.js')).reduce((a,r)=>a+(r.transferSize||0),0)/1024),
            obrazky: Math.round(res.filter(r => r.initiatorType === 'img').reduce((a,r)=>a+(r.transferSize||0),0)/1024),
            vyska: document.documentElement.scrollHeight,
            prekryv: (() => {
              // Vodorovný přetok = nejčastější mobilní chyba. Elementy oříznuté
              // předkem s overflow:hidden se nepočítají — ty nic nerozbíjejí.
              const w = document.documentElement.clientWidth;
              const orezany = (el) => {
                for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                  const o = getComputedStyle(p);
                  if (o.overflowX !== 'visible' && p.getBoundingClientRect().right <= w + 1) return true;
                }
                return false;
              };
              const popis = (el) => {
                const cn = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
                const a = s.previousRect || {}, b = s.currentRect || {};
              const jmeno = el.tagName.toLowerCase() + (cn ? '.' + cn.trim().split(/\s+/).slice(0,2).join('.') : '');
              if (a.top === undefined) return jmeno;
              return jmeno + ' y ' + Math.round(a.top) + '->' + Math.round(b.top)
                + ' h ' + Math.round(a.height) + '->' + Math.round(b.height);
              };
              return [...document.querySelectorAll('body *')]
                .filter(el => {
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.right > w + 1 && !orezany(el);
                })
                .slice(0, 5).map(popis);
            })(),
            /*
             * Neviditelný obsah, ne „neoznačený".
             *
             * Původně se počítaly elementy bez \`data-revealed\`. Jenže při
             * prefers-reduced-motion je CSS nechá viditelné a atribut nikdy
             * nedostanou — hlásilo to desítky chyb, kde žádná nebyla. Zajímá
             * nás jediné: zůstalo něco po načtení průhledné?
             */
            /*
             * Dorazily styly?
             *
             * Když běží starý next start nad novým buildem, servíruje HTML
             * odkazující na CSS, které už na disku není. Stránka se načte,
             * nic nespadne, jen je celá bez stylů — a měření pak hlásí
             * nulový jank a čtyřnásobnou výšku. Bez téhle kontroly to vypadá
             * jako úspěšná optimalizace.
             */
            stylyChybi: [...document.styleSheets].reduce((n, ss) => {
              try { return n + ss.cssRules.length; } catch { return n; }
            }, 0) < 50,
            skryte: [...document.querySelectorAll('[data-reveal]')]
              .filter(el => {
                const o = getComputedStyle(el);
                if (o.opacity !== '0' && o.visibility !== 'hidden') return false;
                const r = el.getBoundingClientRect();
                return r.top < window.innerHeight * 0.9; // jen to, co má být vidět hned
              }).length,
            // Posun rozvržení a dlouhé úlohy — tohle je „seká se to" v číslech.
            cls: Math.round((window.__cls || 0) * 1000) / 1000,
            clsKdo: [...new Set(window.__clsKdo || [])].slice(0, 5),
            dlouhe: (window.__dlouhe || []).filter(d => d.ms >= 50),
            // Hydratace je všechno do dvou sekund od začátku; potom už scrolluje.
            dlouheHydratace: (window.__dlouhe || []).filter(d => d.ms >= 50 && d.kdy < 2000).length,
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

      zprava.push({
        vp: vp.tag, stranka: name, msCelkem: Date.now() - t0, ...m,
        chyby: chyby.get(aktualni) ?? [],
      });
      }
    }
  }

  fs.writeFileSync(path.join(OUT, "metriky.json"), JSON.stringify(zprava, null, 1));

  /** Medián — průměr by jeden ojedinělý výkyv posunul celý. */
  const median = (xs) => {
    const a = xs.filter((x) => typeof x === "number").sort((x, y) => x - y);
    return a.length ? a[Math.floor(a.length / 2)] : null;
  };
  const shrnute = [];
  for (const r of zprava) {
    const klic = r.vp + " " + r.stranka;
    let z = shrnute.find((x) => x.klic === klic);
    if (!z) { z = { klic, vzorky: [] }; shrnute.push(z); }
    z.vzorky.push(r);
  }
  const souhrn = shrnute.map(({ vzorky }) => {
    const p = vzorky[0];
    const dlouhe = vzorky.map((v) => v.dlouhe ?? []);
    return {
      ...p,
      lcp: median(vzorky.map((v) => v.lcp)),
      cls: median(vzorky.map((v) => v.cls)),
      // Medián počtu i nejhoršího z běhů — jedno bez druhého klame.
      dlouhe: dlouhe[Math.floor(dlouhe.length / 2)],
      dlouhychMed: median(dlouhe.map((d) => d.length)),
      nejdelsi: Math.max(0, ...dlouhe.flat().map((d) => d.ms)),
      hydratace: median(vzorky.map((v) => v.dlouheHydratace)),
      behu: vzorky.length,
    };
  });

  // Souhrn do terminálu. Vypisuje se to, co může být špatně — ne všechno.
  const hlavicka = ["viewport", "stránka", "LCP", "CLS", "dlouhé úlohy", "z toho start", "obr kB", "výška"];
  const radky = souhrn.map((r) => [
    r.vp, r.stranka, r.lcp ?? "—", r.cls?.toFixed(3) ?? "—",
    r.dlouhychMed ? `${r.dlouhychMed}× nejdelší ${r.nejdelsi} ms` : "0",
    r.hydratace ?? 0, r.obrazky, r.vyska,
  ]);
  const sirky = hlavicka.map((h, i) =>
    Math.max(String(h).length, ...radky.map((r) => String(r[i]).length)));
  const radek = (r) => r.map((c, i) => String(c).padEnd(sirky[i])).join("  ");
  console.log("\n" + radek(hlavicka) + "\n" + sirky.map((w) => "-".repeat(w)).join("  "));
  for (const r of radky) console.log(radek(r));

  const bezStylu = souhrn.filter((r) => r.stylyChybi);
  if (bezStylu.length) {
    console.log(`\nPOZOR: ${bezStylu.length} stránek se načetlo bez stylů — čísla výš nic neznamenají.`);
    console.log("  Nejspíš běží starý `next start` nad novým buildem. Server restartuj a změř znovu.");
  }

  const spatne = souhrn.filter((r) => r.prekryv?.length || r.skryte || r.chyby?.length || r.cls > 0.05);
  if (spatne.length) {
    console.log("\nk opravě:");
    for (const r of spatne) {
      if (r.cls > 0.05) console.log(`  ${r.vp} ${r.stranka}: posun rozvržení ${r.cls} — ${(r.clsKdo ?? []).join(", ")}`);
      if (r.prekryv?.length) console.log(`  ${r.vp} ${r.stranka}: vodorovný přetok — ${r.prekryv.join(", ")}`);
      if (r.skryte) console.log(`  ${r.vp} ${r.stranka}: ${r.skryte}× neodhalený [data-reveal]`);
      for (const ch of r.chyby ?? []) console.log(`  ${r.vp} ${r.stranka}: ${String(ch).slice(0, 160)}`);
    }
  } else {
    console.log("\nžádný přetok, skrytý obsah ani chyba v konzoli");
  }
  ws.close();
  chrome.kill();
  fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
