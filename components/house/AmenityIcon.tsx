/**
 * Drobná ikona k jedné položce vybavení. Vybírá se podle klíčových slov
 * v českém názvu vybavení. Čistý stroke SVG ve stylu Signature glyfů
 * (24×24, strokeWidth 1.6, stroke currentColor).
 */

type IconProps = { className?: string };

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Velké okno / prosklená stěna. */
function Window({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M12 3.5v17M4 12h16" />
    </Svg>
  );
}

/** Žaluziová clona — vodorovné lamely. */
function Louvre({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M7.5 8h9M7.5 12h9M7.5 16h9" />
    </Svg>
  );
}

/** Spací patro — schůdky / mezonet. */
function Stairs({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20h4v-4h4v-4h4V8h4" />
      <path d="M4 20V8" />
    </Svg>
  );
}

/** Kuchyňská linka — hrnec na varné desce. */
function Cooktop({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 11h14l-1 6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2l-1-6Z" />
      <path d="M3 11h18" />
      <path d="M9 7c0-1 1-1 1-2M14 7c0-1 1-1 1-2" />
    </Svg>
  );
}

/** Koupelna se sprchou. */
function Shower({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 13V6a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3" />
      <path d="M11 6h8" />
      <path d="M8 17v.5M11 17v.5M14 17v.5M8 20v.5M11 20v.5M14 20v.5" />
    </Svg>
  );
}

/** Klimatizace + tepelné čerpadlo — sluníčko a vločka. */
function ClimateControl({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="7" cy="8" r="2.2" />
      <path d="M7 4v1.2M7 10.8V12M3 8h1.2M9.8 8H11" />
      <path d="M17 13v8M14 15l3 2 3-2M14 19l3-2 3 2" />
    </Svg>
  );
}

/** Zateplení / celoroční provoz — štít s listem. */
function Shield({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M12 8v6M12 14c0-2 1.5-3 3-3M12 12c0-1.5-1.2-2.5-2.5-2.5" />
    </Svg>
  );
}

/** Podlaha / překližka — vrstvy. */
function Layers({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </Svg>
  );
}

/** Wi-Fi — oblouky signálu. */
function Wifi({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9.5a12 12 0 0 1 16 0" />
      <path d="M7 13a8 8 0 0 1 10 0" />
      <path d="M9.5 16.5a4 4 0 0 1 5 0" />
      <circle cx="12" cy="19.5" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Káva / espresso — hrnek s párou. */
function Cup({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 9h12v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M8 3v2M11 3v2M14 3v2" />
    </Svg>
  );
}

/** Povlečení / deky — postel. */
function Bed({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <path d="M3 14h18" />
      <path d="M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M3 18v2M21 18v2" />
    </Svg>
  );
}

/** Záložní tečka/kosočtverec. */
function Dot({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 7l5 5-5 5-5-5 5-5Z" />
    </Svg>
  );
}

/**
 * Vrátí ikonu podle klíčových slov v názvu vybavení. Pořadí kontrol je
 * důležité — specifičtější slova (žaluziová clona) musí předbíhat obecnější
 * (prosklená stěna). Vstup normalizujeme bez diakritiky a malými písmeny.
 */
export default function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  // Žaluziová clona / stínicí stěna — dřív než obecné „okno/prosklená".
  if (n.includes("zaluzio") || n.includes("clona") || n.includes("stinic")) {
    return <Louvre className={className} />;
  }
  if (n.includes("okno") || n.includes("prosklena") || n.includes("trojsklo") || n.includes("sklo")) {
    return <Window className={className} />;
  }
  if (n.includes("patro") || n.includes("schud") || n.includes("spaci")) {
    return <Stairs className={className} />;
  }
  if (n.includes("kuchyn")) {
    return <Cooktop className={className} />;
  }
  if (n.includes("koupelna") || n.includes("sprch") || n.includes("wc")) {
    return <Shower className={className} />;
  }
  if (n.includes("klimatizace") || n.includes("cerpadlo") || n.includes("chlazeni") || n.includes("teplo")) {
    return <ClimateControl className={className} />;
  }
  if (n.includes("zatepleni") || n.includes("celorocni") || n.includes("provoz")) {
    return <Shield className={className} />;
  }
  if (n.includes("podlaha") || n.includes("preklizk") || n.includes("vinyl") || n.includes("led")) {
    return <Layers className={className} />;
  }
  if (n.includes("wi-fi") || n.includes("wifi")) {
    return <Wifi className={className} />;
  }
  if (n.includes("kava") || n.includes("espresso") || n.includes("kavovar")) {
    return <Cup className={className} />;
  }
  if (n.includes("povleceni") || n.includes("deky") || n.includes("rucnik") || n.includes("luzk")) {
    return <Bed className={className} />;
  }
  return <Dot className={className} />;
}
