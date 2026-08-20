/**
 * Realistické poškození pro zkoušku Luny.
 *
 * Klíčové je, že se mění JEN poškozené místo — zbytek fotky zůstává pixel po
 * pixelu stejný, přesně jako když host vyfotí týž pokoj po pobytu. Skvrna má
 * nepravidelný okraj z fraktálního šumu a nasazuje se násobením, takže je
 * skrz ni vidět struktura látky. Plochý ovál Luna správně odhalí jako
 * digitální překryv — a má pravdu.
 */
import sharp from "sharp";

/** Vsákla skvrna — tmavší uprostřed, roztřepený okraj, struktura prosvítá. */
export async function vsaklaSkvrna(
  zdroj: Buffer,
  stred: { x: number; y: number },
  polomer: number,
  sila = 0.55,
): Promise<Buffer> {
  const m = await sharp(zdroj).metadata();
  const W = m.width!, H = m.height!;
  const R = Math.round(polomer * W);
  const D = R * 2;

  // Fraktální šum dá okraji nepravidelnost; radiální přechod ho drží pohromadě.
  const maska = await sharp({
    create: { width: D, height: D, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${D}" height="${D}">
             <defs>
               <filter id="s">
                 <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="7"/>
                 <feColorMatrix type="saturate" values="0"/>
                 <feComponentTransfer><feFuncA type="linear" slope="1.6"/></feComponentTransfer>
               </filter>
               <radialGradient id="g">
                 <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
                 <stop offset="55%" stop-color="#fff" stop-opacity="0.85"/>
                 <stop offset="100%" stop-color="#000" stop-opacity="0"/>
               </radialGradient>
             </defs>
             <rect width="${D}" height="${D}" filter="url(#s)" opacity="0.55"/>
             <circle cx="${R}" cy="${R}" r="${R * 0.92}" fill="url(#g)" style="mix-blend-mode:multiply"/>
           </svg>`,
        ),
      },
    ])
    .greyscale()
    .blur(Math.max(1, R * 0.06))
    .png()
    .toBuffer();

  // Hnědá vrstva ve tvaru masky, nasazená násobením přes původní pixely.
  const skvrna = await sharp({
    create: { width: D, height: D, channels: 3, background: { r: 96, g: 62, b: 34 } },
  })
    .composite([{ input: maska, blend: "dest-in" }])
    .png()
    .toBuffer();

  const zeslabena = await sharp(skvrna)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from(`<svg width="${D}" height="${D}"><rect width="${D}" height="${D}" fill="#fff" opacity="${1 - sila}"/></svg>`),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  return sharp(zdroj)
    .composite([
      {
        input: zeslabena,
        left: Math.round(stred.x * W - R),
        top: Math.round(stred.y * H - R),
        blend: "multiply",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Rýha — světlý zářez do tmavší podlahy, nepravidelný a s ostrým jádrem. */
export async function ryha(
  zdroj: Buffer,
  od: { x: number; y: number },
  doKam: { x: number; y: number },
): Promise<Buffer> {
  const m = await sharp(zdroj).metadata();
  const W = m.width!, H = m.height!;
  const x1 = od.x * W, y1 = od.y * H, x2 = doKam.x * W, y2 = doKam.y * H;
  const sx = (x1 + x2) / 2 + (y2 - y1) * 0.08;
  const sy = (y1 + y2) / 2 - (x2 - x1) * 0.05;

  const vrstva = Buffer.from(
    `<svg width="${W}" height="${H}">
       <path d="M ${x1} ${y1} Q ${sx} ${sy} ${x2} ${y2}"
             stroke="#d8cdb8" stroke-width="${W * 0.004}" fill="none"
             stroke-linecap="round" opacity="0.85"/>
       <path d="M ${x1} ${y1} Q ${sx} ${sy} ${x2} ${y2}"
             stroke="#6b6355" stroke-width="${W * 0.009}" fill="none"
             stroke-linecap="round" opacity="0.35"/>
     </svg>`,
  );
  return sharp(zdroj).composite([{ input: vrstva }]).jpeg({ quality: 90 }).toBuffer();
}
