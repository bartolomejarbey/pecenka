#!/usr/bin/env python3
"""
Sestaví db/migrations/0001_init.sql z SQL bloků v SYSTEM.md.

SYSTEM.md je psaný jako dokument pro člověka, takže tabulky jsou v pořadí
podle kapitol a odkazují se dopředu. Tenhle skript je seřadí topologicky
podle cizích klíčů a poskládá výsledek v pořadí: rozšíření → typy →
tabulky → indexy.
"""
import re, sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent.parent
md = (KOREN / "SYSTEM.md").read_text(encoding="utf-8")
bloky = re.findall(r"```sql\n(.*?)```", md, re.S)
sql = "\n\n".join(b.rstrip() for b in bloky)


def prikazy(s: str) -> list[str]:
    out, buf, i, uvoz, komentar = [], "", 0, False, False
    while i < len(s):
        c, d = s[i], s[i:i + 2]
        if komentar:
            if c == "\n":
                komentar = False
            buf += c; i += 1; continue
        if not uvoz and d == "--":
            komentar = True; buf += d; i += 2; continue
        if c == "'":
            uvoz = not uvoz
        if not uvoz and c == ";":
            out.append(buf.strip()); buf = ""; i += 1; continue
        buf += c; i += 1
    if buf.strip():
        out.append(buf.strip())
    return [p for p in out if p and not re.fullmatch(r"(--[^\n]*\n?|\s)*", p)]


ps = prikazy(sql)
rozsireni, typy, tabulky, indexy, ostatni = [], [], {}, [], []

for p in ps:
    hlava = re.sub(r"--[^\n]*", "", p).strip()
    if re.match(r"CREATE EXTENSION", hlava, re.I):
        rozsireni.append(p)
    elif re.match(r"CREATE TYPE", hlava, re.I):
        typy.append(p)
    elif m := re.match(r"CREATE TABLE (?:IF NOT EXISTS )?(\w+)", hlava, re.I):
        tabulky[m.group(1)] = p
    elif re.match(r"CREATE (UNIQUE )?INDEX", hlava, re.I):
        indexy.append(p)
    else:
        ostatni.append(p)

# závislosti podle REFERENCES
zavislosti = {}
for jmeno, telo in tabulky.items():
    bez_komentaru = re.sub(r"--[^\n]*", "", telo)
    ref = set(re.findall(r"REFERENCES\s+(\w+)", bez_komentaru, re.I)) - {jmeno}
    zavislosti[jmeno] = {r for r in ref if r in tabulky}

# invoices ↔ document_blobs se odkazují navzájem, takže topologické pořadí
# neexistuje. Takové hrany odložíme do ALTER TABLE na konec migrace.
odlozene: list[tuple[str, str, str]] = []  # (tabulka, sloupec, cíl)


def odloz_hranu(tabulka: str) -> bool:
    """Vytrhne z definice tabulky jeden sloupcový REFERENCES a vrátí ho na konec."""
    telo = tabulky[tabulka]
    for m in re.finditer(r"^\s*(\w+)\s+[^,\n]*?\bREFERENCES\s+(\w+)(\s*\(\s*\w+\s*\))?",
                         telo, re.I | re.M):
        sloupec, cil = m.group(1), m.group(2)
        if cil in tabulky and cil not in hotovo and cil != tabulka:
            zacatek = m.start(0) + m.group(0).lower().index("references")
            konec = m.end(0)
            tabulky[tabulka] = telo[:zacatek].rstrip() + telo[konec:]
            zavislosti[tabulka].discard(cil)
            odlozene.append((tabulka, sloupec, cil))
            return True
    return False


poradi, hotovo = [], set()
while len(poradi) < len(tabulky):
    davka = sorted(j for j in tabulky if j not in hotovo and zavislosti[j] <= hotovo)
    if not davka:
        zbyva = sorted(j for j in tabulky if j not in hotovo)
        # rozetneme cyklus u tabulky s nejmenším počtem nevyřešených závislostí
        zbyva.sort(key=lambda j: len(zavislosti[j] - hotovo))
        if not any(odloz_hranu(j) for j in zbyva):
            sys.exit(f"Cyklus nelze rozetnout: {{j: zavislosti[j] - hotovo for j in zbyva}}")
        continue
    poradi += davka
    hotovo |= set(davka)

# unaccent v PGlite není a nepotřebujeme ho — diakritiku srovnáváme v aplikaci
rozsireni = [r for r in rozsireni if "unaccent" not in r.lower()]

hlavicka = """-- ============================================================================
--  Sedmý les — počáteční schéma (v0 + připravené tabulky pro v1 a v2)
--
--  Generováno z SYSTEM.md skriptem scripts/dev/build-migration.py.
--  NEUPRAVUJ ručně: uprav SYSTEM.md a vygeneruj znovu (npm run db:migration).
--
--  Konvence:
--    · peníze jsou bigint v haléřích
--    · pobytové termíny jsou date, intervaly půlotevřené [)
--    · nic se nemaže — rezervace se stornuje, doklad se opravuje dobropisem
--
--  Diakritiku ve vyhledávání srovnáváme v aplikaci (lib/db/text.ts), takže
--  rozšíření unaccent není potřeba — schéma tím jede i na PGlite v testech.
-- ============================================================================

"""

casti = [hlavicka]
casti.append("-- ---------- rozšíření ----------\n" + ";\n".join(rozsireni) + ";\n")
casti.append("-- ---------- výčtové typy ----------\n" + ";\n\n".join(typy) + ";\n")
casti.append("-- ---------- tabulky (seřazeno podle cizích klíčů) ----------\n"
             + ";\n\n".join(tabulky[j] for j in poradi) + ";\n")
if indexy:
    casti.append("-- ---------- indexy ----------\n" + ";\n".join(indexy) + ";\n")
if ostatni:
    casti.append("-- ---------- ostatní ----------\n" + ";\n\n".join(ostatni) + ";\n")
if odlozene:
    radky = [
        f"ALTER TABLE {t} ADD CONSTRAINT {t}_{c}_fkey FOREIGN KEY ({c}) REFERENCES {cil}(id);"
        for t, c, cil in odlozene
    ]
    casti.append(
        "-- ---------- cizí klíče v cyklu (doplněné až po vytvoření všech tabulek) ----------\n"
        + "\n".join(radky) + "\n"
    )

cil = KOREN / "db" / "migrations" / "0001_init.sql"
cil.parent.mkdir(parents=True, exist_ok=True)
cil.write_text("\n".join(casti), encoding="utf-8")
print(f"{cil.relative_to(KOREN)} — {len(tabulky)} tabulek, {len(typy)} typů, {len(indexy)} indexů")
print("pořadí:", " → ".join(poradi[:8]), "…")
