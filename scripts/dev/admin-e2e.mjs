#!/usr/bin/env node
/**
 * Průchod administrací přes skutečný prohlížeč.
 *
 * Serverové akce se z Node skriptu volat nedají — vyžadují přihlášení
 * a session žije v cookie. Tenhle skript se proto přihlásí jako člověk,
 * vyplní formulář a přečte, co mu systém odpověděl.
 *
 *   node scripts/dev/admin-e2e.mjs --url http://127.0.0.1:3399 --heslo <heslo>
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const BASE = arg("--url", "http://127.0.0.1:3000");
const EMAIL = arg("--email", "ahoj@sedmyles.cz");
const HESLO = arg("--heslo", process.env.ADMIN_HESLO ?? "");
const SHELL = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell",
);

const spat = (ms) => new Promise((r) => setTimeout(r, ms));

function cdp(ws) {
  let id = 0;
  const cekajici = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && cekajici.has(m.id)) {
      const { res, rej } = cekajici.get(m.id);
      cekajici.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const z = { id: ++id, method, params };
      if (sessionId) z.sessionId = sessionId;
      cekajici.set(z.id, { res, rej });
      ws.send(JSON.stringify(z));
      setTimeout(
        () => cekajici.has(z.id) && (cekajici.delete(z.id), rej(new Error(`timeout ${method}`))),
        45000,
      );
    });
}

const ZKOUSKY = [
  ["platné údaje", {}, true],
  ["IČO s překlepem", { ico: "27074359" }, false],
  ["účet s překlepem", { ucet: "19-2000145398/0800" }, false],
  ["neznámá banka", { ucet: "2601234565/9999" }, false],
  ["plátce DPH bez DIČ", { platceDph: true }, false],
  ["poplatek bez vyhlášky", { poplatekKc: "50" }, false],
  ["poplatek s vyhláškou", { poplatekKc: "50", vyhlaska: "OZV č. 1/2025" }, true],
  ["prázdné PSČ", { psc: "" }, false],
  ["záloha nad 100 %", { zalohaProcent: "150" }, false],
  ["IBAN místo čísla účtu", { ucet: "CZ65 0800 0000 1920 0014 5399" }, true],
];

const ZAKLAD = {
  nazev: "Bartoloměj Rota",
  ico: "27074358",
  dic: "",
  ulice: "Jílové 42",
  mesto: "Jílové u Držkova",
  psc: "46822",
  ucet: "19-2000145399/0800",
  platceDph: false,
  poplatekKc: "0",
  vyhlaska: "",
  zalohaProcent: "50",
  kauceKc: "3000",
  splatnostDni: "14",
};

async function main() {
  if (!HESLO) {
    console.error("Chybí heslo: --heslo <heslo> nebo ADMIN_HESLO=…");
    process.exit(1);
  }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-"));
  const port = 9300 + Math.floor(process.pid % 300);
  const chrome = spawn(
    SHELL,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "--no-sandbox",
     "--disable-gpu", "--hide-scrollbars", "--window-size=1440,900"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await spat(250);
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {}
  }
  if (!wsUrl) { chrome.kill(); console.error("Chrome nenaběhl"); process.exit(1); }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");

  const jdi = async (cesta) => {
    await s("Page.navigate", { url: BASE + cesta });
    for (let i = 0; i < 120; i++) {
      await spat(100);
      const r = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
      if (r.result.value === "complete") break;
    }
    await spat(350);
  };
  const evalx = async (vyraz) =>
    (await s("Runtime.evaluate", { expression: vyraz, returnByValue: true, awaitPromise: true })).result.value;

  /* ===== přihlášení ===== */
  await jdi("/admin/prihlaseni");
  await evalx(`(async () => {
    const nast = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    nast(document.querySelector('input[type=email], input[name=email]'), ${JSON.stringify(EMAIL)});
    nast(document.querySelector('input[type=password]'), ${JSON.stringify(HESLO)});
    document.querySelector('form').requestSubmit();
    await new Promise(r => setTimeout(r, 2500));
  })()`);
  await spat(1500);
  const kde = await evalx("location.pathname");
  if (kde.includes("prihlaseni")) {
    console.error("Přihlášení selhalo — pořád jsem na", kde);
    chrome.kill(); process.exit(1);
  }
  console.log("přihlášen jako", EMAIL, "→", kde);

  /* ===== formulář údajů firmy ===== */
  let chyb = 0;
  for (const [popis, zmena, cekaneOk] of ZKOUSKY) {
    await jdi("/admin/nastaveni");
    const data = { ...ZAKLAD, ...zmena };
    const odpoved = await evalx(`(async () => {
      const nast = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
        s.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const d = ${JSON.stringify(data)};
      for (const [k, v] of Object.entries(d)) {
        const el = document.querySelector('[name="' + k + '"]');
        if (!el) continue;
        if (el.type === 'checkbox') {
          if (el.checked !== v) el.click();
        } else nast(el, String(v));
      }
      const dph = [...document.querySelectorAll('input[type=checkbox]')][0];
      if (dph && dph.checked !== d.platceDph) dph.click();
      document.querySelector('form button[type=submit]').click();
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 150));
        const p = document.querySelector('[role=status]');
        if (p) return p.textContent.trim();
      }
      return null;
    })()`);
    const ok = odpoved != null && /^Uloženo/.test(odpoved);
    const sedi = ok === cekaneOk;
    if (!sedi) chyb++;
    console.log(`${sedi ? "✓" : "✗"} ${popis.padEnd(24)} ${odpoved ?? "(bez odpovědi)"}`);
  }

  /* ===== Ruční rezervace ===== */
  // Termín daleko v budoucnu, ať se nesrazí s ukázkovými daty ani s průchodem.
  const den = (o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return d.toISOString().slice(0, 10);
  };
  const posun = 500 + (Date.now() % 60);
  const rucni = {
    prijezd: den(posun),
    odjezd: den(posun + 3),
    jmeno: "Telefonní host",
    email: `telefon.${Date.now().toString().slice(-6)}@example.com`,
    telefon: "+420111222333",
    poznamka: "Domluveno telefonem.",
  };

  const zaloz = async () => {
    await jdi("/admin/rezervace/nova");
    return evalx(`(async () => {
      const nast = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
        s.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const d = ${JSON.stringify(rucni)};
      const pole = [...document.querySelectorAll('input, textarea')];
      const podle = (t) => pole.filter(el => el.type === t);
      const [prijezd, odjezd] = podle('date');
      nast(prijezd, d.prijezd);
      nast(odjezd, d.odjezd);
      const texty = pole.filter(el => el.type === 'text' || el.tagName === 'TEXTAREA' || el.type === 'email');
      nast(texty[0], d.jmeno);
      nast(texty[1], d.email);
      nast(texty[2], d.telefon);
      if (texty[3]) nast(texty[3], d.poznamka);
      document.querySelector('form button[type=submit]').click();
      for (let i = 0; i < 200; i++) {
        await new Promise(r => setTimeout(r, 150));
        if (!location.pathname.endsWith('/nova')) return 'presmerovano ' + location.pathname;
        const p = document.querySelector('[role=status]');
        if (p && p.textContent.trim()) return p.textContent.trim();
      }
      return 'bez odezvy';
    })()`);
  };

  const prvni = await zaloz();
  console.log(`${/presmerovano|Založeno/.test(String(prvni)) ? "✓" : "✗"} ruční rezervace se založila  ${prvni}`);
  if (!/presmerovano|Založeno/.test(String(prvni))) chyb++;

  // Tentýž termín podruhé — databázová ochrana musí platit i tudy.
  const druha = await zaloz();
  const odmitnuto = /zabran|obsaz/i.test(String(druha));
  console.log(`${odmitnuto ? "✓" : "✗"} tentýž termín se ručně podruhé zadat nedá  ${druha}`);
  if (!odmitnuto) chyb++;

  /* ===== Kalendář: zavření termínu a cena ===== */
  const kdyz = (o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return d.toISOString().slice(0, 10);
  };
  const zac = 700 + (Date.now() % 40);
  const blok = { od: kdyz(zac), do: kdyz(zac + 3) };

  const vyplnAOdesli = async (karta, hodnoty, tlacitko) => {
    await jdi("/admin/kalendar");
    return evalx(`(async () => {
      const nast = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
        s.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const zalozka = [...document.querySelectorAll('button')]
        .find(b => (b.textContent || '').trim() === ${JSON.stringify(karta)});
      if (!zalozka) return 'záložka nenalezena';
      zalozka.click();
      await new Promise(r => setTimeout(r, 350));

      const form = document.querySelector('section form');
      if (!form) return 'formulář nenalezen';
      const d = ${JSON.stringify(hodnoty)};
      const data = [...form.querySelectorAll('input[type=date]')];
      if (d.od) nast(data[0], d.od);
      if (d.do) nast(data[1], d.do);
      if (d.cena !== undefined) {
        const cisla = [...form.querySelectorAll('input[type=number]')];
        nast(cisla[0], String(d.cena));
      }
      if (d.poznamka !== undefined) {
        const texty = [...form.querySelectorAll('input[type=text], input:not([type])')];
        if (texty.length) nast(texty[texty.length - 1], d.poznamka);
      }
      form.querySelector('button[type=submit]').click();
      for (let i = 0; i < 200; i++) {
        await new Promise(r => setTimeout(r, 150));
        const p = document.querySelector('section [role=status]');
        if (p && p.textContent.trim()) return p.textContent.trim();
      }
      return 'bez odezvy';
    })()`);
  };

  const zavreno = await vyplnAOdesli("Zavřít termín", { ...blok, poznamka: "Výměna bojleru" }, "Zavřít termín");
  console.log(`${/^Zavřeno/.test(String(zavreno)) ? "✓" : "✗"} termín se zavřel  ${zavreno}`);
  if (!/^Zavřeno/.test(String(zavreno))) chyb++;

  // Web ten termín nesmí prodat.
  const prodej = await evalx(`(async () => {
    const o = await fetch('/api/rezervace', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        domek: 'achat', prijezd: ${JSON.stringify(blok.od)}, odjezd: ${JSON.stringify(blok.do)},
        hoste: 2, doplnky: {},
        jmeno: 'Zkouška bloku', email: 'blok.' + Date.now() + '@example.com',
      }),
    });
    const t = await o.json();
    return o.status + ' ' + (t.error || 'ok');
  })()`);
  const chraneno = /^(409|400)/.test(String(prodej)) && /zavřen|obsaz/i.test(String(prodej));
  console.log(`${chraneno ? "✓" : "✗"} web zavřený termín neprodá  ${prodej}`);
  if (!chraneno) chyb++;

  // Otevřít zpátky.
  await jdi("/admin/kalendar");
  const otevreno = await evalx(`(async () => {
    const tl = [...document.querySelectorAll('button')].filter(b => (b.textContent || '').trim() === 'Otevřít');
    if (!tl.length) return 'nic k otevření';
    tl[tl.length - 1].click();
    for (let i = 0; i < 200; i++) {
      await new Promise(r => setTimeout(r, 150));
      const p = document.querySelector('section [role=status]');
      if (p && p.textContent.trim()) return p.textContent.trim();
    }
    return 'bez odezvy';
  })()`);
  console.log(`${/^Otevřeno/.test(String(otevreno)) ? "✓" : "✗"} termín se otevřel zpátky  ${otevreno}`);
  if (!/^Otevřeno/.test(String(otevreno))) chyb++;

  // Cena na týden.
  const cena = await vyplnAOdesli("Změnit cenu", { od: kdyz(zac), do: kdyz(zac + 6), cena: 4290 }, "Přepsat ceny");
  console.log(`${/^Přepsáno/.test(String(cena)) ? "✓" : "✗"} cena se přepsala  ${cena}`);
  if (!/^Přepsáno/.test(String(cena))) chyb++;

  ws.close();
  chrome.kill();
  fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log(chyb ? `\n${chyb} zkoušek neprošlo` : "\nvšechny zkoušky prošly");
  process.exit(chyb ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
