#!/usr/bin/env python3
"""
Generování variant znaku Sedmého lesa přes OpenAI gpt-image-2.

Znak si nekreslíme sami — zadání jde na model, my vybíráme.
Spuštění:  OPENAI_API_KEY=sk-... python3 scripts/gen-logo.py [koncept ...]
Výstup:    public/logo-koncepty/<koncept>-<n>.png  (průhledné pozadí)
"""

import base64
import io
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

MODEL = "gpt-image-2"
OUT = Path(__file__).resolve().parent.parent / "public" / "logo-koncepty"

SPOLECNE = (
    "Flat vector pictogram logo mark, pure two-dimensional, no perspective, no 3D, "
    "no gradient, no shading, no drop shadow, no text, no letters, no numbers, "
    "no frame border unless described, "
    "the mark is drawn in PURE WHITE (#FFFFFF) on a PURE BLACK (#000000) flat background, "
    "nothing but black and white, no grey background panel, no rounded card, "
    "the black fills the entire square edge to edge, "
    "app-icon clarity: must stay perfectly readable when scaled down to 32 pixels, "
    "generous negative space, geometric and confident, "
    "Scandinavian minimalism, the kind of mark used by a high-end architecture studio."
)

KONCEPTY = {
    "les-vlna": (
        "A minimal pictogram: exactly SEVEN simple coniferous fir trees standing side by side in a single row. "
        "Each tree is a clean geometric triangle-ish silhouette on a short straight trunk. "
        "The seven trees vary slightly in height so the top edge makes a gentle rhythm — "
        "shorter at the edges, tallest in the middle. "
        "Directly beneath the row of trees there is ONE single calm horizontal wavy line "
        "representing the water of a flooded quarry. The wave has two soft crests and spans "
        "the full width of the tree row. Nothing else. " + SPOLECNE
    ),
    "les-vlna-monolinka": (
        "A minimal monoline pictogram drawn with a single uniform stroke weight, rounded line caps, "
        "no filled shapes — only outlines. It shows exactly SEVEN abstract fir trees in a row, "
        "each tree suggested by a simple zig-zag chevron stack of two or three strokes on a short vertical trunk. "
        "Below the trees, one continuous calm wavy line for water. Airy, light, elegant. " + SPOLECNE
    ),
    "les-vlna-kruh": (
        "A minimal circular badge: a thin perfect circle outline. Inside the circle, in the upper half, "
        "exactly SEVEN small simple fir tree silhouettes stand in a row; in the lower half, "
        "one calm wavy horizontal line for water. Huge amount of empty space inside the circle. "
        "Extremely simple — at most a dozen shapes in total. " + SPOLECNE
    ),
    "sedm-tahu": (
        "An abstract minimal pictogram: exactly SEVEN vertical strokes standing side by side like a barcode, "
        "reading as an abstract forest of tree trunks. The strokes have rounded ends and vary in height. "
        "Beneath them, one single calm wavy horizontal line for water, spanning the full width. "
        "Absolutely nothing else. Reductive, almost typographic. " + SPOLECNE
    ),
}


def vyriznout_pozadi(png: bytes, barva: tuple[int, int, int] = (243, 239, 229)) -> bytes:
    """Bílá kresba na černém pozadí → průhledné PNG v barvě `barva`.

    gpt-image-2 neumí generovat s průhledným pozadím, takže si o znak řekneme
    jako o bílé kresbě na černé a jas si tady přepíšeme do alfa kanálu.
    Anti-aliasované hrany tím zůstanou hladké.
    """
    import numpy as np
    from PIL import Image

    im = Image.open(io.BytesIO(png)).convert("RGB")
    a = np.asarray(im).astype(np.float32) / 255.0
    # Jas podle vnímané světlosti — alfa = jak moc je pixel „kresba".
    alfa = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    # Lehké roztažení kontrastu, ať černá je opravdu průhledná a bílá plná.
    alfa = np.clip((alfa - 0.06) / 0.88, 0.0, 1.0)

    out = np.zeros((*alfa.shape, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = barva
    out[..., 3] = (alfa * 255).round().astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(out, "RGBA").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generuj(klic: str, prompt: str, api_key: str, pocet: int = 2) -> None:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "n": pocet,
        "size": "1024x1024",
        "output_format": "png",
        "quality": "high",
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"  ✗ {klic}: HTTP {e.code} — {e.read().decode()[:400]}")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    for i, item in enumerate(data.get("data", []), 1):
        cesta = OUT / f"{klic}-{i}.png"
        cesta.write_bytes(vyriznout_pozadi(base64.b64decode(item["b64_json"])))
        print(f"  ✓ {cesta.relative_to(OUT.parent.parent)}")


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("Chybí OPENAI_API_KEY")

    vybrane = sys.argv[1:] or list(KONCEPTY)
    nezname = [k for k in vybrane if k not in KONCEPTY]
    if nezname:
        sys.exit(f"Neznámé koncepty: {nezname}. K dispozici: {list(KONCEPTY)}")

    print(f"Model {MODEL} · koncepty: {', '.join(vybrane)}")
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(lambda k: generuj(k, KONCEPTY[k], api_key), vybrane))


if __name__ == "__main__":
    main()
