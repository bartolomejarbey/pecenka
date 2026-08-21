#!/usr/bin/env node
/**
 * Průchod celým tokem: rezervace → potvrzení → portál hosta.
 *
 * Testuje se cesta, po které tečou peníze, přes skutečný běžící web:
 * veřejné API zakládá rezervaci, administrace ji potvrzuje přes serverovou
 * akci a host se pak přihlásí do portálu kódem, který mu systém vyrobil.
 * Jednotkové testy tohle nechytí — každý kus zvlášť funguje, chyba bývá
 * na spojích. (Právě tak se přišlo na to, že přístup do portálu nikdo
 * nezakládal a host se do něj nedostal.)
 *
 *   node scripts/dev/tok-e2e.mjs --url http://127.0.0.1:3401 --heslo <heslo>
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { vygenerujKod } from "@/lib/portal/pristup";

const arg = (n: string, d: string) => {
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

const spat = (ms: number) => new Promise((r) => setTimeout(r, ms));
let chyb = 0;
const zkus = (podminka: boolean, popis: string, detail = "") => {
  if (!podminka) chyb++;
  console.log(`${podminka ? "✓" : "✗"} ${popis}${detail ? "  " + detail : ""}`);
};

/** Termín daleko v budoucnu, ať se nesrazí s ukázkovými daty. */
function terminy(posun: number) {
  const d = (o: number) => {
    const x = new Date();
    x.setDate(x.getDate() + o);
    return x.toISOString().slice(0, 10);
  };
  return { prijezd: d(300 + posun), odjezd: d(303 + posun) };
}

function cdp(ws: WebSocket) {
  let id = 0;
  const cekajici = new Map<number, { res: (v: any) => void; rej: (e: Error) => void }>();
  ws.addEventListener("message", (e: MessageEvent) => {
    const m = JSON.parse(e.data);
    if (m.id && cekajici.has(m.id)) {
      const { res, rej } = cekajici.get(m.id)!;
      cekajici.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  });
  return (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> =>
    new Promise((res, rej) => {
      const cislo = ++id;
      const z: Record<string, unknown> = { id: cislo, method, params };
      if (sessionId) z.sessionId = sessionId;
      cekajici.set(cislo, { res, rej });
      ws.send(JSON.stringify(z));
      setTimeout(
        () => cekajici.has(cislo) && (cekajici.delete(cislo), rej(new Error(`timeout ${method}`))),
        45000,
      );
    });
}

async function main() {
  if (!HESLO) {
    console.error("Chybí heslo: --heslo <heslo> nebo ADMIN_HESLO=…");
    process.exit(1);
  }

  /* ===== 1. Rezervace přes veřejné API ===== */
  // Volné okno se hledá posouváním termínu. Test po sobě sice uklízí, ale
  // když spadne uprostřed, zůstane termín obsazený — a příští běh by pak
  // selhal na tom, co si sám způsobil.
  const razitko = Date.now().toString().slice(-6);
  const zaklad = {
    domek: "achat",
    hoste: 2,
    doplnky: {},
    jmeno: `Zkouška ${razitko}`,
    email: `zkouska.${razitko}@example.com`,
    telefon: "+420111222333",
  };

  let telo: Record<string, unknown> | null = null;
  let r: any = null;
  let o: Response | null = null;
  // Začíná se u posunu odvozeného z času, ne od nuly. Web pouští z jedné IP
  // pět pokusů za deset minut a hledání volného okna od začátku by ten limit
  // vyčerpalo dřív, než by se test dostal k tomu, co má zkoušet.
  const zacatek = Number(razitko) % 40;
  for (let i = 0; i < 8; i++) {
    const posun = zacatek + i * 4;
    const t = terminy(posun);
    telo = { ...zaklad, prijezd: t.prijezd, odjezd: t.odjezd };
    o = await fetch(BASE + "/api/rezervace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(telo),
    });
    r = await o.json();
    if (o.status === 429) {
      console.log("✗ web pustí z jedné IP pět rezervací za deset minut a limit je vyčerpaný.");
      console.log("  Počkejte deset minut, nebo restartujte server — limit se drží v paměti procesu.");
      process.exit(1);
    }
    if (r.ok || r.duvod !== "obsazeno") break;
  }
  zkus(Boolean(o?.ok && r?.ok), "rezervace se založila",
    r?.kod ? `${r.kod} · VS ${r.vs} · ${telo!.prijezd}` : JSON.stringify(r));
  if (!r?.ok) process.exit(1);
  zkus(r.stav === "hold", "termín se drží", `stav ${r.stav}`);
  zkus(Number(r.zaloha) > 0 && Number(r.zaloha) <= Number(r.celkem), "záloha je spočítaná",
    `${(r.zaloha / 100).toFixed(0)} z ${(r.celkem / 100).toFixed(0)} Kč`);

  /* ===== 2. Dvojí prodej téhož termínu ===== */
  const o2 = await fetch(BASE + "/api/rezervace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...telo, jmeno: "Druhý zájemce", email: `druhy.${razitko}@example.com` }),
  });
  const r2 = await o2.json();
  if (o2.status === 429) {
    // Omezení pokusů zabralo dřív než ochrana proti dvojímu prodeji.
    // Neznamená to, že ochrana neplatí — jen se k ní teď nedostaneme.
    console.log("· dvojí prodej se nezkoušel — vyčerpané omezení pokusů z jedné IP");
  } else {
    zkus(o2.status === 409 && !r2.ok, "tentýž termín se podruhé prodat nedá", `HTTP ${o2.status}`);
  }

  /* ===== prohlížeč ===== */
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "tok-"));
  const port = 9400 + (process.pid % 200);
  const chrome = spawn(
    SHELL,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "--no-sandbox",
     "--disable-gpu", "--hide-scrollbars", "--window-size=1440,900"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let wsUrl: string | null = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await spat(250);
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {}
  }
  if (!wsUrl) { chrome.kill(); console.error("Chrome nenaběhl"); process.exit(1); }
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => ws.addEventListener("open", res, { once: true }));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m: string, p?: Record<string, unknown>) => send(m, p ?? {}, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");

  const jdi = async (cesta: string) => {
    await s("Page.navigate", { url: BASE + cesta });
    for (let i = 0; i < 150; i++) {
      await spat(100);
      const v = await s("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
      if (v.result.value === "complete") break;
    }
    await spat(400);
  };
  const evalx = async (vyraz: string): Promise<any> =>
    (await s("Runtime.evaluate", { expression: vyraz, returnByValue: true, awaitPromise: true })).result.value;
  const vypln = (sel: string, hodnota: string) => `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const set = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
    set.call(el, ${JSON.stringify(hodnota)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`;

  /* ===== 3. Administrace: přihlášení a potvrzení ===== */
  await jdi("/admin/prihlaseni");
  await evalx(vypln("input[type=email], input[name=email]", EMAIL));
  await evalx(vypln("input[type=password]", HESLO));
  await evalx(`(async () => { document.querySelector('form').requestSubmit(); await new Promise(r=>setTimeout(r,2500)); })()`);
  await spat(1500);
  zkus(!(await evalx("location.pathname")).includes("prihlaseni"), "majitel se přihlásil");

  await jdi(`/admin/rezervace/${r.kod}`);
  const videt = await evalx(`document.body.innerText.includes(${JSON.stringify(r.kod)})`);
  zkus(videt, "rezervace je v administraci vidět");

  const potvrzeno = await evalx(`(async () => {
    const tl = [...document.querySelectorAll('button')]
      .find(b => /potvrdit|dorazil|zaplac/i.test(b.textContent || ''));
    if (!tl) return 'tlačítko nenalezeno: ' + [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).join(' | ');
    tl.click();
    // Čte se hláska akce, ne text celé stránky. Slovo „hotovo" se na detailu
    // rezervace vyskytuje i jinde a průchod se pak rozeběhl dřív, než akce
    // doopravdy skončila — portál ještě neexistoval a přihlášení selhalo.
    for (let i = 0; i < 200; i++) {
      await new Promise(r => setTimeout(r, 150));
      const p = document.querySelector('[role=status]');
      const t = p && p.textContent ? p.textContent.trim() : '';
      if (t) return /potvrzena|zapsána/i.test(t) ? 'ok' : t;
    }
    return 'bez odezvy';
  })()`);
  zkus(potvrzeno === "ok", "rezervace se potvrdila", potvrzeno === "ok" ? "" : String(potvrzeno));

  /* ===== 4. Portál hosta ===== */
  // Kód se odvozuje z variabilního symbolu toutéž funkcí, jakou použil server.
  // Zkušební koncový bod, který by kód vyzradil, by byl díra — kdo zná cizí
  // variabilní symbol z výpisu, dostal by se cizímu hostovi do protokolu.
  const kodPristupu = vygenerujKod(r.vs);

  {
    await jdi("/pobyt/prihlaseni");
    await evalx(vypln("input[name=vs]", r.vs));
    await evalx(vypln("input[name=kod]", kodPristupu));
    const vysl = await evalx(`(async () => {
      document.querySelector('form').requestSubmit();
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 150));
        if (!location.pathname.includes('prihlaseni')) return location.pathname;
      }
      const ch = document.querySelector('[role=status], [role=alert]');
      return ch ? ch.textContent.trim() : 'bez odezvy';
    })()`);
    zkus(String(vysl).startsWith("/pobyt"), "host se přihlásil do portálu", String(vysl));
    if (String(vysl).startsWith("/pobyt")) {
      const obsah = await evalx("document.body.innerText.slice(0, 400)");
      zkus(/achát|achat/i.test(obsah), "portál ukazuje správný domek");
    }
  }

  /* ===== 5. Foto-protokol ===== */
  // Fotky bere z veřejných snímků webu — jsou to skutečné fotky interiéru,
  // takže projdou i přípravou obrázku (zmenšení, EXIF, otisk).
  await jdi("/pobyt/protokol");
  const zony = await evalx(`(async () => {
    await new Promise(res => setTimeout(res, 800));
    const el = document.querySelector('[data-zony]');
    return el ? el.dataset.zony.split(',').filter(Boolean) : [];
  })()`);

  const nahrano = await evalx(`(async () => {
    const zdroje = ['/foto/interier-obyvak.jpg', '/foto/interier-kuchyne.jpg',
                    '/foto/interier-koupelna.jpg', '/foto/interier-patro.jpg'];
    const zony = ${JSON.stringify(zony ?? [])};
    if (!zony.length) return 'zóny se nenašly';
    let i = 0, chyb = [];
    for (const z of zony) {
      const b = await (await fetch(zdroje[i % zdroje.length])).blob();
      i++;
      const fd = new FormData();
      fd.append('fotka', new File([b], 'z.jpg', { type: 'image/jpeg' }));
      fd.append('zona', z);
      fd.append('id', 'e2e-' + z + '-' + Date.now());
      const o = await fetch('/api/pobyt/foto', { method: 'POST', body: fd });
      if (!o.ok) chyb.push(z + ': ' + (await o.text()).slice(0, 80));
    }
    return chyb.length ? chyb.join(' | ') : 'ok ' + zony.length;
  })()`);
  zkus(String(nahrano).startsWith("ok"), "fotky se nahrály", String(nahrano));

  const odeslano = await evalx(`(async () => {
    const o = await fetch('/api/pobyt/odeslat', { method: 'POST' });
    const t = await o.json();
    return o.ok ? 'ok' : (t.error || ('HTTP ' + o.status));
  })()`);
  zkus(odeslano === "ok", "protokol se odeslal", odeslano === "ok" ? "" : String(odeslano));

  /* ===== 6. Protokol je v administraci ===== */
  if (odeslano === "ok") {
    await jdi("/admin/inspekce");
    const vidi = await evalx(`document.body.innerText.includes(${JSON.stringify(r.kod)})`);
    zkus(vidi, "protokol se objevil v administraci");
  }

  /* ===== 7. Doklady ===== */
  await jdi(`/admin/rezervace/${r.kod}`);
  const vystaveno = await evalx(`(async () => {
    const tl = [...document.querySelectorAll('button')]
      .find(b => /zálohov/i.test(b.textContent || ''));
    if (!tl) return 'tlačítko nenalezeno';
    tl.click();
    for (let i = 0; i < 200; i++) {
      await new Promise(res => setTimeout(res, 150));
      const p = [...document.querySelectorAll('[role=status]')]
        .map(x => (x.textContent || '').trim()).find(Boolean);
      if (p) return p;
    }
    return 'bez odezvy';
  })()`);
  zkus(/^Vystaveno/.test(String(vystaveno)), "zálohová faktura se vystavila", String(vystaveno));
  // Bez nastavené pošty se doklad odeslat nedá a systém to nepředstírá.
  // Není to chyba vystavení, jen se to musí říct nahlas.
  if (/Odesláno hostovi/.test(String(vystaveno))) {
    zkus(true, "doklad se odeslal hostovi");
  } else {
    console.log("· doklad se neodesílal — na tomhle prostředí není nastavené SMTP");
  }

  const dokladOk = await evalx(`(async () => {
    // Seznam dokladů vykresluje server; po vystavení ho komponenta obnoví,
    // ale trvá to. Chvíli se počká, než se odkaz objeví.
    let a = null;
    for (let i = 0; i < 40 && !a; i++) {
      await new Promise(res => setTimeout(res, 250));
      a = [...document.querySelectorAll('a')].find(x => /otevřít/i.test(x.textContent || ''));
    }
    if (!a) return 'odkaz na doklad nenalezen';
    const o = await fetch(a.getAttribute('href'));
    if (!o.ok) return 'HTTP ' + o.status;
    const t = await o.text();
    return /K &#x[0-9a-f]+;hrad|K úhradě|K vrácení/.test(t) ? 'ok' : 'doklad bez částky';
  })()`);
  zkus(dokladOk === "ok", "doklad se dá otevřít", dokladOk === "ok" ? "" : String(dokladOk));

  /* ===== 8. Úklid — zkušební rezervace se stornuje ===== */
  await jdi(`/admin/rezervace/${r.kod}`);
  const uklizeno = await evalx(`(async () => {
    const cekej = (ms) => new Promise(res => setTimeout(res, ms));
    const tl = (vzor) => [...document.querySelectorAll('button')]
      .find(b => vzor.test((b.textContent || '').trim()));

    // Storno je schované pod „Další" a pak vyžaduje důvod.
    const dalsi = tl(/^Další/i);
    if (dalsi) { dalsi.click(); await cekej(400); }

    // „Stornovat" jen odkryje pole s důvodem; teprve „Opravdu stornovat"
    // akci spustí. Hledá se proto přesně, ne podle podřetězce.
    const otevri = tl(/^Stornovat$/);
    if (!otevri) return 'tlačítko Stornovat nenalezeno';
    otevri.click();
    await cekej(400);

    const pole = document.querySelector('#duvod');
    if (!pole) return 'pole pro důvod se neobjevilo';
    const set = Object.getOwnPropertyDescriptor(pole.constructor.prototype, 'value').set;
    set.call(pole, 'Zkušební rezervace z automatického průchodu.');
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await cekej(300);

    const potvrd = tl(/^Opravdu stornovat$/);
    if (!potvrd) return 'tlačítko Opravdu stornovat nenalezeno';
    if (potvrd.disabled) return 'potvrzení zůstalo zakázané';
    potvrd.click();

    // Čte se hláška akce. Text „Storno" je na samotném tlačítku, takže
    // hledání v celé stránce hlásilo úspěch, i když se nic nestalo —
    // a v databázi pak zůstaly desítky rezervací blokujících termíny.
    for (let i = 0; i < 200; i++) {
      await cekej(150);
      const p = document.querySelector('[role=status]');
      const t = p && p.textContent ? p.textContent.trim() : '';
      if (t) return /stornov/i.test(t) ? 'ok' : t;
    }
    return 'bez odezvy';
  })()`);
  zkus(uklizeno === "ok", "zkušební rezervace se uklidila", uklizeno === "ok" ? "" : String(uklizeno));

  // Ověření po znovunačtení stránky, ne z hlášky. Znovu zkusit rezervaci by
  // spálilo kvótu omezení pokusů a zabralo termín podruhé.
  /*
   * Poslední slovo má databáze, ne stránka.
   *
   * Slovo „Storno" je i na tlačítku, takže hledání v textu stránky hlásilo
   * úspěch, i když se nic nestalo — a v databázi zůstaly desítky rezervací
   * blokujících termíny až do roku 2027. Tady se ptáme přímo na stav
   * a na to, jestli je termín zase volný.
   */
  const [po] = await radky<{ stav: string; jednotky: string }>(sql`
    SELECT r.status::text AS stav,
           (SELECT string_agg(DISTINCT ru.status::text, ',')
              FROM reservation_units ru WHERE ru.reservation_id = r.id) AS jednotky
      FROM reservations r WHERE r.code = ${r.kod}
  `);
  zkus(po?.stav === "cancelled", "rezervace je v databázi stornovaná", po?.stav ?? "nenalezena");
  zkus(po?.jednotky === "cancelled", "termín je zase volný", po?.jednotky ?? "—");

  ws.close();
  chrome.kill();
  fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log(chyb ? `\n${chyb} kroků neprošlo` : "\ncelý tok prošel");
  process.exit(chyb ? 1 : 0);
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
