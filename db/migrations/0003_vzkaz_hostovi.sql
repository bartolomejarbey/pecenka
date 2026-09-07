-- Vzkaz hostovi po odeslání protokolu.
--
-- Dosud host odeslal dvanáct fotek a dostal „děkujeme". Vyhodnocení skončilo
-- v administraci a host se o něm dozvěděl nejdřív e-mailem, často až doma —
-- tedy ve chvíli, kdy už nemohl srovnat peřinu ani zavolat, když je něco
-- rozbité. Přitom právě těch pár minut, kdy ještě stojí v domku, je jediná
-- chvíle, kdy se drobnost dá vyřešit bez jediné koruny.
--
-- Vzkaz se ukládá k inspekci, protože je součástí toho, co jsme hostovi
-- řekli. U sporu o škodu musí jít doložit i to — nejen co našel model.

ALTER TABLE inspections
  ADD COLUMN guest_message_cs   text,
  ADD COLUMN guest_message_tone text CHECK (guest_message_tone IN ('dik','prosba','telefon')),
  ADD COLUMN guest_message_at   timestamptz,
  -- Body, ze kterých je vzkaz složený. Drží se odděleně, aby šlo v administraci
  -- ukázat přesně to, co host viděl, a ne jen slepený text.
  ADD COLUMN guest_message_json jsonb;

-- Infolinka pro hosta, který má před odjezdem zavolat.
--
-- Zvlášť od `stay_info.contact_phone`: to je číslo „kdyby bylo něco potřeba"
-- během pobytu. Tohle je číslo, na které se volá kvůli stavu domku, a majitel
-- ho může chtít mít jiné — třeba správce, který je poblíž.
ALTER TABLE company_settings
  ADD COLUMN checkout_hotline text NOT NULL DEFAULT '+420 733 418 260';

-- Kdy referenční snímek vznikl a kdo ho nahrál. Bez toho nejde poznat,
-- jestli je reference starší než škoda, kterou má doložit.
ALTER TABLE baseline_shots
  ADD COLUMN created_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN uploaded_by text,
  ADD COLUMN note        text;

-- Sady referenčních snímků se dosud zakládaly jen skriptem, takže neměly
-- autora ani popis. Administrace je teď umí zakládat sama.
ALTER TABLE baseline_sets
  ADD COLUMN created_by text,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
