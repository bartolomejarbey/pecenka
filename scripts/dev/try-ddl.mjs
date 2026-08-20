// Postupné aplikování DDL do PGlite — vypíše první příkaz, který selže.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import fs from 'node:fs';

const sql = fs.readFileSync(process.argv[2], 'utf8');
const db = await PGlite.create({ extensions: { btree_gist, pg_trgm } });

// rozdělení na příkazy — respektuje $$ bloky a jednoduché uvozovky
function prikazy(s) {
  const out = []; let buf = '', i = 0, uvoz = false, dolar = false, komentar = false;
  while (i < s.length) {
    const c = s[i], d = s.slice(i, i + 2);
    if (komentar) { if (c === '\n') komentar = false; buf += c; i++; continue; }
    if (!uvoz && !dolar && d === '--') { komentar = true; buf += d; i += 2; continue; }
    if (!dolar && c === "'") uvoz = !uvoz;
    if (!uvoz && d === '$$') { dolar = !dolar; buf += d; i += 2; continue; }
    if (!uvoz && !dolar && c === ';') { out.push(buf.trim()); buf = ''; i++; continue; }
    buf += c; i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(p => p && !/^(--|\s)*$/.test(p));
}

const ps = prikazy(sql);
let ok = 0; const chyby = [];
for (const p of ps) {
  try { await db.exec(p + ';'); ok++; }
  catch (e) {
    const prvni = p.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) || p.slice(0, 70);
    chyby.push({ prikaz: prvni.trim().slice(0, 90), chyba: String(e.message).split('\n')[0].slice(0, 130) });
  }
}
console.log(`příkazů: ${ps.length} · prošlo: ${ok} · selhalo: ${chyby.length}`);
for (const c of chyby) console.log(`  ✗ ${c.prikaz}\n      → ${c.chyba}`);
