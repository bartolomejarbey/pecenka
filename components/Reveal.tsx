import type { ReactNode } from "react";

const TAGS = ["div", "span", "li", "h2", "h3", "p"] as const;
type Tag = (typeof TAGS)[number];

/**
 * Postupné naběhnutí obsahu při scrollu — čistě CSS.
 *
 * Server komponenta: vykreslí obyčejný element s `data-reveal`. O přepnutí do
 * viditelného stavu se stará jediný IntersectionObserver v `RevealObserver`,
 * který běží pro celý web (dřív to bylo ~250 motion komponent s vlastním
 * observerem — na Safari to znatelně sekalo).
 *
 * Bez JS (nebo při prefers-reduced-motion) je obsah rovnou vidět.
 */
export default function Reveal({
  children,
  i = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  i?: number;
  className?: string;
  as?: Tag;
  /** @deprecated ponecháno kvůli zpětné kompatibilitě volání */
  amount?: number;
}) {
  const Tag = as;
  return (
    <Tag
      className={className}
      data-reveal=""
      style={i ? ({ "--reveal-i": i } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
