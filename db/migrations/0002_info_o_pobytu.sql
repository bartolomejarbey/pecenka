-- Praktické informace k pobytu.
--
-- Host se přihlásí do portálu a dosud tam našel jen foto-protokol. Chybělo
-- všechno, kvůli čemu se tam podívá: kde to je, jak se dostane dovnitř,
-- jaká je wifi, kdy se předává. Do té doby to majitel musel psát každému
-- zvlášť e-mailem.
--
-- Jeden řádek na domek, protože klíče i wifi se u Acháta a Mechu liší.

CREATE TABLE stay_info (
  unit_id        uuid PRIMARY KEY REFERENCES units(id),
  address        text,                 -- přesná adresa, posílá se až s rezervací
  map_url        text,                 -- odkaz do mapy
  arrival_from   time NOT NULL DEFAULT '15:00',
  departure_by   time NOT NULL DEFAULT '10:00',
  access_note    text,                 -- kde je klíč, kód od schránky
  wifi_ssid      text,
  wifi_password  text,
  house_notes    text,                 -- topení, voda, odpad, co kde najdou
  contact_phone  text,                 -- na koho volat, když něco
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Prázdný řádek pro každý fyzický domek, ať má administrace co editovat.
INSERT INTO stay_info (unit_id)
SELECT id FROM units WHERE NOT is_virtual
ON CONFLICT (unit_id) DO NOTHING;
