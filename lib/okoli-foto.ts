/**
 * Fotografie míst v okolí — Wikimedia Commons, s autorem a licencí.
 *
 * VYGENEROVÁNO skriptem (scratchpad/foto-mist.mjs, 2026-09-28): soubory
 * v public/foto/okoli/ jsou zmenšené kopie originálů z Commons. Licence
 * CC BY / CC BY-SA vyžadují uvést autora a licenci u fotky — dělá to popisek
 * na kartě a seznam autorů na konci stránky. Lom sám má vlastní fotku
 * majitele (bez licence), viz lib/okoli.ts.
 */

export type FotoMista = {
  src: string;
  alt: string;
  autor: string;
  licence: string;
  licenceUrl?: string;
  /** Stránka souboru na Commons — odkaz na originál a plné znění licence. */
  zdroj: string;
};

export const FOTO_MIST: Record<string, FotoMista> = {
  "obec": {
    "src": "/foto/okoli/obec.jpg",
    "alt": "Jílové u Držkova od jihu, ze silnice od Jirkova",
    "autor": "MartinVeselka",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:J%C3%ADlov%C3%A9_u_Dr%C5%BEkova_-_celkov%C3%BD_pohled_na_z%C3%A1padn%C3%AD_a_st%C5%99edn%C3%AD_%C4%8D%C3%A1st_vsi_od_jihu,_ze_silnice_od_Jirkova.jpg"
  },
  "zluta-plovarna": {
    "src": "/foto/okoli/zluta-plovarna.jpg",
    "alt": "Řeka Jizera u Malé Skály",
    "autor": "MartinVeselka",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Mal%C3%A1_Sk%C3%A1la_-_%C5%99eka_Jizera_mezi_Vranov%C3%BDm_1._a_2._d%C3%ADl.jpg"
  },
  "greenway-jizera": {
    "src": "/foto/okoli/greenway-jizera.jpg",
    "alt": "Jizera u Křížků pod Malou Skálou",
    "autor": "MartinVeselka",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:K%C5%99%C3%AD%C5%BEky_(u_Mal%C3%A9_Sk%C3%A1ly)_-_%C5%99eka_Jizera_(2).jpg"
  },
  "jablonecka-prehrada": {
    "src": "/foto/okoli/jablonecka-prehrada.jpg",
    "alt": "Hladina jablonecké přehrady Mšeno",
    "autor": "Pavel Taibr",
    "licence": "Public domain",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Prehradamseno.jpg"
  },
  "mumlava": {
    "src": "/foto/okoli/mumlava.jpg",
    "alt": "Mumlavský vodopád",
    "autor": "Karelj",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Mumlavsky_vodopad.jpg"
  },
  "ferrata-vodni-brana": {
    "src": "/foto/okoli/ferrata-vodni-brana.jpg",
    "alt": "Skalní stěny nad Jizerou u Semil",
    "autor": "Ladislav Boháč",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Galerie_na_Riegrov%C4%9B_stezce.jpg"
  },
  "riegrova-stezka": {
    "src": "/foto/okoli/riegrova-stezka.jpg",
    "alt": "Visutá lávka Riegrovy stezky nad Jizerou",
    "autor": "Palickap",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:PR_%C3%9Adol%C3%AD_Jizery_u_Semil_a_B%C3%ADtouchova,_Riegrova_stezka,_visut%C3%A1_l%C3%A1vka_(1).jpg"
  },
  "suche-skaly": {
    "src": "/foto/okoli/suche-skaly.jpg",
    "alt": "Hřeben Suchých skal",
    "autor": "Wikimedia Commons",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Suche_skaly_001.jpg"
  },
  "hruboskalsko": {
    "src": "/foto/okoli/hruboskalsko.jpg",
    "alt": "Pískovcové věže Hruboskalska od vyhlídky U Lvíčka",
    "autor": "ŠJů",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Rozhled_z_vyhl%C3%ADdky_U_Lv%C3%AD%C4%8Dka_(13).jpg"
  },
  "kozakov": {
    "src": "/foto/okoli/kozakov.jpg",
    "alt": "Rozhledna a Riegrova chata na Kozákově",
    "autor": "Hadonos",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Koz%C3%A1kov_-_rozhledna_02.jpg"
  },
  "stepanka": {
    "src": "/foto/okoli/stepanka.jpg",
    "alt": "Rozhledna Štěpánka",
    "autor": "RomanM82",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:P%C5%99%C3%ADchovice_(Ko%C5%99enov)_-_rozhledna_%C5%A0t%C4%9Bp%C3%A1nka,_2023-08,_obr02.jpg"
  },
  "cerna-studnice": {
    "src": "/foto/okoli/cerna-studnice.jpg",
    "alt": "Rozhledna a chata Černá Studnice",
    "autor": "Dominik Matus",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:%C4%8Cern%C3%A1_studnice_16.jpg"
  },
  "tanvaldsky-spicak": {
    "src": "/foto/okoli/tanvaldsky-spicak.jpg",
    "alt": "Rozhledna na Tanvaldském Špičáku",
    "autor": "Hejkal",
    "licence": "CC BY-SA 2.0 de",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/2.0/de/deed.en",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Tannwalder_Spitzberg.jpg"
  },
  "frydstejn": {
    "src": "/foto/okoli/frydstejn.jpg",
    "alt": "Hrad Frýdštejn z výšky",
    "autor": "Zdeněk Fiedler",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Fr%C3%BDd%C5%A1tejn_letecky.jpg"
  },
  "pantheon": {
    "src": "/foto/okoli/pantheon.jpg",
    "alt": "Skalní hrad Vranov – Pantheon nad Malou Skálou",
    "autor": "Martin Mašek",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Hrad_Vranov,_z%C5%99%C3%ADcenina,_Panteon,_Mal%C3%A1_Sk%C3%A1la.JPG"
  },
  "navarov": {
    "src": "/foto/okoli/navarov.jpg",
    "alt": "Zřícenina hradu Návarov",
    "autor": "Václav Hájek",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:N%C3%A1varov_01.JPG"
  },
  "trosky": {
    "src": "/foto/okoli/trosky.jpg",
    "alt": "Hrad Trosky z výšky",
    "autor": "Zdeněk Fiedler",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Hrad_Trosky,_leteck%C3%BD_sn%C3%ADmek.jpg"
  },
  "sychrov": {
    "src": "/foto/okoli/sychrov.jpg",
    "alt": "Zámek Sychrov z výšky",
    "autor": "Zdeněk Fiedler",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Sychrov_letecky.jpg"
  },
  "dlaskuv-statek": {
    "src": "/foto/okoli/dlaskuv-statek.jpg",
    "alt": "Dlaskův statek v Dolánkách",
    "autor": "Milan Keršláger",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Dlaskuv_statek_zpredu.jpg"
  },
  "bozkov": {
    "src": "/foto/okoli/bozkov.jpg",
    "alt": "Krápníky v Bozkovských dolomitových jeskyních",
    "autor": "Prasopestilence",
    "licence": "CC BY 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Bozkovske_jeskyne_01.JPG"
  },
  "zelezny-brod": {
    "src": "/foto/okoli/zelezny-brod.jpg",
    "alt": "Roubená chalupa na Trávníkách v Železném Brodě",
    "autor": "Eva Moravcová",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:M%C4%9Bstsk%C3%BD_d%C5%AFm,_%C4%8Derven%C3%A1_rouben%C3%A1_chalupa,_Tr%C3%A1vn%C3%ADky,_Franti%C5%A1ka_Balatky_129,_%C5%BDelezn%C3%BD_Brod.jpg"
  },
  "muzeum-skla-jablonec": {
    "src": "/foto/okoli/muzeum-skla-jablonec.jpg",
    "alt": "Expozice Muzea skla a bižuterie v Jablonci nad Nisou",
    "autor": "Palickap",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Jablonec_nad_Nisou,_Muzeum_skla_a_bi%C5%BEuterie,_expozice_(36).jpg"
  },
  "pivovar-rohozec": {
    "src": "/foto/okoli/pivovar-rohozec.jpg",
    "alt": "Pivovar Rohozec",
    "autor": "JiriMatejicek",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Pivovar_Rohozec_2.jpg"
  },
  "jizerka": {
    "src": "/foto/okoli/jizerka.jpg",
    "alt": "Bukovec nad Jizerkou v zimě",
    "autor": "Petr Vodička",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Bukovec_Jizerske_hory.jpg"
  },
  "bedrichov": {
    "src": "/foto/okoli/bedrichov.jpg",
    "alt": "Rozcestník Jizerské magistrály",
    "autor": "ŠJů",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Rozcestn%C3%ADk_Sou%C5%A1sk%C3%A1_silnice_-_Jizersk%C3%A1_magistr%C3%A1la,_ly%C5%BEa%C5%99sk%C3%A9_sm%C4%9Brovky.jpg"
  },
  "ski-spicak": {
    "src": "/foto/okoli/ski-spicak.jpg",
    "alt": "Sjezdovka na Tanvaldském Špičáku",
    "autor": "PatrikPaprika",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Tanvaldsk%C3%BD_%C5%A0pi%C4%8D%C3%A1k_-_3.jpg"
  },
  "ski-rejdice": {
    "src": "/foto/okoli/ski-rejdice.jpg",
    "alt": "Rejdice pod Štěpánkou",
    "autor": "ŠJů",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Rejdice,_doln%C3%AD_%C4%8D%C3%A1st,_od_jihu_(02).jpg"
  },
  "ski-harrachov": {
    "src": "/foto/okoli/ski-harrachov.jpg",
    "alt": "Skokanské můstky a sjezdovky v Harrachově",
    "autor": "M k",
    "licence": "CC BY 2.5",
    "licenceUrl": "https://creativecommons.org/licenses/by/2.5",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Harrachov_ski.jpg"
  },
  "ski-rokytnice": {
    "src": "/foto/okoli/ski-rokytnice.jpg",
    "alt": "Rokytnice nad Jizerou s Lysou horou a Kotlem",
    "autor": "Tap B",
    "licence": "CC0",
    "licenceUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Horn%C3%AD_Rokytnice_nad_Jizerou,_panorama_Lys%C3%A9_hory_a_Kotle.jpg"
  },
  "ski-severak": {
    "src": "/foto/okoli/ski-severak.jpg",
    "alt": "Sjezdovka Severák v Hraběticích",
    "autor": "Juandev",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Hrab%C4%9Btice_(Janov_nad_Nisou),_sjezdovka.jpg"
  },
  "ski-zasada": {
    "src": "/foto/okoli/ski-zasada.jpg",
    "alt": "Zásada v zimě",
    "autor": "Prasopestilence",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Zasada_06.jpg"
  },
  "ski-zlata-olesnice": {
    "src": "/foto/okoli/ski-zlata-olesnice.jpg",
    "alt": "Zlatá Olešnice",
    "autor": "Jirka23",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Zlat%C3%A1-Ole%C5%A1nice-pohled2011a.jpg"
  },
  "bezky-drzkov": {
    "src": "/foto/okoli/bezky-drzkov.jpg",
    "alt": "Kostel v Držkově",
    "autor": "Pavel Taibr",
    "licence": "Copyrighted free use",
    "zdroj": "https://commons.wikimedia.org/wiki/File:Drzkovkostel.jpg"
  }
};
