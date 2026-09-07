-- Odolnost odjezdového protokolu.
--
-- Změny v téhle migraci vznikly z jediné otázky: co se stane, když něco
-- selže podruhé. Vyhodnocení se totiž spouští na třech místech — po odeslání,
-- z cronu a ručně z administrace — a žádné z nich nepočítalo s tím, že už
-- jednou proběhlo.

-- ===== 1. Opakované vyhodnocení nesmí vyrábět duplicity =====
--
-- `vyhodnotInspekci` jen vkládala. Druhý běh (cron po zaseknutí, ruční
-- spuštění po doplnění reference) tak založil druhý případ škody na tutéž
-- zónu. V administraci se zóna vykreslila dvakrát a šlo o ní rozhodnout
-- dvakrát — tedy hostovi vystavit dvě faktury za jedno prasklé sklo.
--
-- Staré duplicity uklidíme, než index nasadíme; drží se ta nejstarší,
-- protože na ni může být navázané rozhodnutí.
DELETE FROM damage_cases d
 WHERE EXISTS (SELECT 1 FROM damage_cases j
                WHERE j.inspection_id = d.inspection_id
                  AND j.zone_key = d.zone_key
                  AND j.id < d.id)
   AND NOT EXISTS (SELECT 1 FROM damage_decisions dd WHERE dd.damage_case_id = d.id);

CREATE UNIQUE INDEX IF NOT EXISTS damage_cases_jedna_na_zonu
  ON damage_cases (inspection_id, zone_key);

DELETE FROM photo_pairs p
 WHERE EXISTS (SELECT 1 FROM photo_pairs j
                WHERE j.inspection_id = p.inspection_id
                  AND j.zone_key = p.zone_key
                  AND j.id < p.id);

CREATE UNIQUE INDEX IF NOT EXISTS photo_pairs_jedna_na_zonu
  ON photo_pairs (inspection_id, zone_key);

-- Dvě reference téže zóny a téhož světla znamenají, že se při porovnání
-- mlčky vybere jedna z nich. Radši ať to nejde nahrát.
CREATE UNIQUE INDEX IF NOT EXISTS baseline_shots_jeden_zaber
  ON baseline_shots (baseline_set_id, zone_key, light_variant);

-- ===== 2. Padající protokol se nesmí zkoušet donekonečna =====
--
-- Cron bral protokoly ve stavu `analyzing` starší než deset minut a
-- `submitted_at` se nikdy neměnilo. Protokol, který spolehlivě padá (chybí
-- blob, model vrací 400), se tak pouštěl každých patnáct minut navždy —
-- pokaždé až osm volání modelu. Účet roste, nikdo o tom neví.
ALTER TABLE inspections
  ADD COLUMN attempts        int NOT NULL DEFAULT 0,
  ADD COLUMN last_attempt_at timestamptz,
  ADD COLUMN last_error      text;

-- ===== 3. Potlačený nález se musí potlačit i v datech =====
--
-- Když snímky na sebe nesedí, pipeline vrátila závažnost „none", ale do
-- `luna_findings` uložila tu původní. Fronta i detail v administraci čtou
-- z findings — majitel tedy viděl „výrazné poškození" u zóny, kterou systém
-- záměrně neuznal. Tohle je přesně ten druh nesouladu, kterým se prohrává spor.
ALTER TABLE luna_findings
  ADD COLUMN suppressed_reason text;

-- ===== 4. Host má dostat šanci fotku opravit =====
--
-- Model si umí říct o nový snímek (`needs_reshoot`) a obrazová analýza pozná,
-- že host fotil odjinud. Dosud to nevedlo k ničemu, co by host mohl udělat:
-- po odeslání ho portál poslal pryč. Teď se protokol umí vrátit do stavu
-- „chybí nám jedna fotka" a otevřít právě ty zóny, o které jde.
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check CHECK (status IN
  ('draft','submitted','analyzing','auto_clear','needs_review','needs_photo','closed'));

ALTER TABLE inspections
  ADD COLUMN reopened_zones text[] NOT NULL DEFAULT '{}';

-- ===== 5. Fotky se mají po lhůtě opravdu smazat =====
--
-- `delete_after` se zapisovalo od začátku a nikdo ho nikdy nečetl, přestože
-- portál hostovi slibuje mazání po 90 dnech. Sloupec říká, kdy se to stalo,
-- takže úklid jde doložit — a řádek zůstane, aby šlo doložit i to, že fotka
-- existovala.
ALTER TABLE inspection_photos
  ADD COLUMN deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS inspection_photos_k_smazani
  ON inspection_photos (delete_after) WHERE deleted_at IS NULL AND NOT legal_hold;
