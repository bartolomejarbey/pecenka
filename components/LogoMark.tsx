import type { SVGProps } from "react";

/**
 * Znak Sedmého lesa — sedm smrků nad hladinou zatopeného lomu.
 *
 * Návrh: OpenAI gpt-image-2 (zadání a varianty viz `scripts/gen-logo.py`,
 * koncepty v `public/logo-koncepty/`). Rastr vybraného konceptu je obtažený
 * do vektoru skriptem `scripts/png-na-svg.py`.
 *
 * Kreslí se přes `currentColor`, takže funguje na tmavém i světlém podkladu.
 * Předchůdce byl rytinový emblém v PNG (223 kB), který se v navigaci slil
 * do šmouhy — tenhle je čitelný i ve 28 px a váží ~1 kB.
 */
export default function LogoMark({ className = "h-8 w-auto", ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 866 398"
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M589 348 L629 351 L716 375 L750 380 L792 378 L826 370 L861 358 L864 360 L864 367 L852 374 L816 387 L778 394 L742 394 L727 392 L637 368 L612 364 L579 364 L560 367 L483 390 L456 395 L429 397 L404 396 L372 391 L305 371 L267 364 L229 366 L163 384 L125 392 L84 393 L58 389 L25 379 L4 370 L0 365 L1 361 L7 358 L35 369 L69 377 L111 379 L143 374 L227 351 L270 349 L306 356 L345 369 L382 378 L405 381 L446 381 L486 374 L549 354 L569 350 L588 349 Z M54 116 L103 270 L64 272 L63 331 L48 330 L48 273 L46 271 L11 272 L54 117 Z M170 72 L229 261 L181 263 L181 331 L163 331 L163 263 L118 262 L170 73 Z M297 36 L361 248 L308 250 L307 331 L289 330 L289 251 L287 249 L238 249 L297 37 Z M433 0 L505 247 L505 249 L445 249 L443 251 L443 331 L424 331 L424 251 L422 249 L364 249 L432 1 Z M568 36 L633 249 L578 251 L578 330 L559 330 L559 250 L509 250 L567 37 Z M695 72 L754 261 L706 263 L705 331 L688 331 L688 263 L642 262 L695 73 Z M811 116 L860 271 L826 271 L821 273 L820 331 L805 330 L805 273 L768 272 L811 117 Z" />
    </svg>
  );
}
