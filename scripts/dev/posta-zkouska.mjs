#!/usr/bin/env node
/**
 * Zachytávací SMTP server.
 *
 * E-maily jsou v systému poslední velký kus, který se dá ověřit jen tak, že
 * se skutečně odešlou. Tenhle server je přijme, uloží do adresáře a vypíše,
 * co dorazilo — bez posílání komukoliv ven.
 *
 *   node scripts/dev/posta-zkouska.mjs --port 2525 --out /tmp/posta
 *
 * Pak stačí server webu spustit s SMTP_HOST=127.0.0.1 SMTP_PORT=2525.
 */

import net from "node:net";
import fs from "node:fs";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const PORT = Number(arg("--port", "2525"));
const OUT = arg("--out", "./posta");
fs.mkdirSync(OUT, { recursive: true });

let poradi = 0;

net
  .createServer((soket) => {
    let rezim = "prikazy";
    let telo = "";
    let odesilatel = "";
    const prijemci = [];

    const rekni = (t) => soket.write(t + "\r\n");
    rekni("220 zkouska.local SMTP");

    soket.on("data", (data) => {
      for (const radek of data.toString("utf8").split(/\r?\n/)) {
        if (rezim === "data") {
          if (radek === ".") {
            rezim = "prikazy";
            uloz(odesilatel, prijemci.slice(), telo);
            telo = "";
            prijemci.length = 0;
            rekni("250 OK");
          } else {
            // Tečka na začátku řádku je v SMTP zdvojená.
            telo += (radek.startsWith("..") ? radek.slice(1) : radek) + "\n";
          }
          continue;
        }

        const p = radek.trim();
        if (!p) continue;
        const prikaz = p.split(/\s+/)[0].toUpperCase();

        if (prikaz === "EHLO" || prikaz === "HELO") {
          rekni("250-zkouska.local");
          rekni("250 AUTH PLAIN LOGIN");
        } else if (prikaz === "AUTH") {
          rekni("235 Authentication successful");
        } else if (prikaz === "MAIL") {
          odesilatel = /<([^>]*)>/.exec(p)?.[1] ?? "";
          rekni("250 OK");
        } else if (prikaz === "RCPT") {
          prijemci.push(/<([^>]*)>/.exec(p)?.[1] ?? "");
          rekni("250 OK");
        } else if (prikaz === "DATA") {
          rezim = "data";
          rekni("354 End data with <CR><LF>.<CR><LF>");
        } else if (prikaz === "QUIT") {
          rekni("221 Bye");
          soket.end();
        } else if (prikaz === "RSET") {
          telo = "";
          prijemci.length = 0;
          rekni("250 OK");
        } else {
          rekni("250 OK");
        }
      }
    });
    soket.on("error", () => {});
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`zachytávací SMTP na 127.0.0.1:${PORT}, ukládám do ${OUT}`);
  });

/**
 * Předmět je v MIME zakódovaný — pro výpis ho rozbalíme.
 *
 * Quoted-printable kóduje **bajty**, ne znaky. Skládat je přes
 * `String.fromCharCode` dá latin1 a z „Sedmý" se stane „SedmÃ½" — proto se
 * nejdřív poskládá buffer a teprve ten se přečte jako UTF-8.
 */
function dekodujPredmet(hlavicka) {
  return hlavicka
    .replace(/=\?utf-8\?B\?([^?]+)\?=/gi, (_, b) => Buffer.from(b, "base64").toString("utf8"))
    .replace(/=\?utf-8\?Q\?([^?]+)\?=/gi, (_, q) => {
      const bajty = [];
      const text = q.replace(/_/g, " ");
      for (let i = 0; i < text.length; i++) {
        if (text[i] === "=" && /[0-9A-F]{2}/i.test(text.slice(i + 1, i + 3))) {
          bajty.push(parseInt(text.slice(i + 1, i + 3), 16));
          i += 2;
        } else {
          bajty.push(text.charCodeAt(i));
        }
      }
      return Buffer.from(bajty).toString("utf8");
    });
}

function uloz(od, komu, telo) {
  const n = String(++poradi).padStart(3, "0");
  const soubor = path.join(OUT, `${n}.eml`);
  // Adresář se zakládá při každém zápisu: při zkoušení se maže mezi běhy
  // a server by na tom jinak spadl uprostřed práce.
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(soubor, telo);
  const predmet = dekodujPredmet(
    /^Subject:\s*(.+(?:\n[ \t].+)*)/m.exec(telo)?.[1]?.replace(/\n[ \t]+/g, "") ?? "(bez předmětu)",
  );
  const priloh = (telo.match(/Content-Disposition:\s*attachment/gi) ?? []).length;
  console.log(`[${n}] → ${komu.join(", ")}  ${predmet}${priloh ? `  (${priloh} příloh)` : ""}`);
}
