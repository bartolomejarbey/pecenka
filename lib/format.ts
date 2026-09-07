/**
 * Drobné formátování sdílené mezi administrací a portálem hosta.
 *
 * Vlastní modul, ne komponenta: telefon potřebuje admin i portál a tahat
 * kvůli jedné funkci komponentu z administrace do hostovského portálu je
 * vazba, kterou by nikdo nečekal.
 */

/**
 * Telefon po trojicích.
 *
 * Do databáze chodí v E.164 (`+420604555666`), protože tak se s ním pracuje.
 * Člověk ho ale čte po trojicích a nesouvislý shluk devíti číslic se očima
 * nedá zkontrolovat — a majitel ho z obrazovky občas opisuje.
 */
export function formatTelefon(cislo: string): string {
  const c = cislo.replace(/\s/g, "");
  const m = c.match(/^(\+\d{1,3})?(\d{9})$/);
  if (!m) return cislo;
  const [, predvolba = "", devet] = m;
  const trojice = `${devet.slice(0, 3)} ${devet.slice(3, 6)} ${devet.slice(6)}`;
  return predvolba ? `${predvolba} ${trojice}` : trojice;
}

/** Číslo do odkazu `tel:` — bez mezer, jinak některé telefony vytočí nesmysl. */
export const telOdkaz = (cislo: string) => `tel:${cislo.replace(/[^\d+]/g, "")}`;

/**
 * Oslovení pátým pádem, aspoň pro běžná česká jména.
 *
 * „Dobrý večer, Eva" zní jako automat; „Dobrý večer, Evo" jako člověk.
 * Pravidla pokrývají velkou většinu jmen, která se v rezervacích objevují.
 * U toho, co nesedí, zůstane první pád — je to pořád lepší než zkomolenina.
 * Bere jen první slovo: „Jan Novák" → „Jane".
 */
export function vokativ(jmeno: string): string {
  const j = jmeno.trim().split(/\s+/)[0] ?? "";
  if (j.length < 2) return jmeno.trim();

  // Cizí a nesklonná jména: Andy, Lucie, Marie, Noemi, Nikol…
  if (/(ie|y|i|o|u|e)$/i.test(j)) return j;
  // Eva → Evo, Jana → Jano, Nikola → Nikolo
  if (/a$/.test(j)) return j.slice(0, -1) + "o";
  // Marek → Marku, Radek → Radku; Zdeněk → Zdeňku (pohyblivé e mění ň)
  if (/něk$/.test(j)) return j.slice(0, -3) + "ňku";
  if (/ek$/.test(j)) return j.slice(0, -2) + "ku";
  // Pavel → Pavle, Karel → Karle: pohyblivé e vypadává jen u těchhle
  // domácích jmen; Daniel → Daniele, Kamil → Kamile zůstávají celé.
  if (/^(Pavel|Karel|Havel)$/i.test(j)) return j.slice(0, -2) + "le";
  // Vojtěch → Vojtěchu, Bedřich → Bedřichu
  if (/ch$/.test(j)) return j + "u";
  // Tomáš → Tomáši, Aleš → Aleši, Ondřej → Ondřeji, Matěj → Matěji
  if (/[šžčřcj]$/i.test(j)) return j + "i";
  // Jan → Jane, Petr → Petre, Pavel → Pavle, Jakub → Jakube, David → Davide
  if (/[nrlbpdtvmzs]$/i.test(j)) return j + "e";
  // Kryštof → Kryštofe? Ne — Kryštofe je správně; Josef → Josefe
  if (/f$/i.test(j)) return j + "e";
  // Dominik → Dominiku, Patrik → Patriku
  if (/k$/i.test(j)) return j + "u";
  return j;
}
