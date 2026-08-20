import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { otiskProDb, pripravFotku } from "@/lib/luna/obraz";
import { cestaFotky, nahraj } from "@/lib/luna/uloziste";
import { ktoJePrihlasen } from "@/lib/portal/pristup";

/**
 * Příjem fotky z odjezdového protokolu.
 *
 * `client_uuid` je idempotenční klíč — host fotí v lese, kde padá signál,
 * a opakované odeslání téže fotky nesmí vyrobit duplicitu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BAJTU = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });

  const form = await req.formData();
  const soubor = form.get("fotka");
  const zona = String(form.get("zona") ?? "");
  const klientId = String(form.get("id") ?? "");

  if (!(soubor instanceof File)) return NextResponse.json({ error: "Chybí fotka." }, { status: 400 });
  if (!zona || !klientId) return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  if (soubor.size > MAX_BAJTU) {
    return NextResponse.json({ error: "Fotka je moc velká. Zkuste ji vyfotit znovu." }, { status: 413 });
  }

  const [inspekce] = await radky<{ id: string }>(sql`
    SELECT id::text AS id FROM inspections
     WHERE reservation_id = ${pobyt.rezervaceId}::uuid AND type = 'checkout'
     ORDER BY id LIMIT 1
  `);
  if (!inspekce) return NextResponse.json({ error: "Protokol není založený." }, { status: 400 });

  try {
    const pripravena = await pripravFotku(Buffer.from(await soubor.arrayBuffer()));
    const cesta = cestaFotky(pobyt.kod, zona, klientId);
    await nahraj(cesta, pripravena.data);

    const zadrzeni = new Date(pobyt.odjezd);
    zadrzeni.setDate(zadrzeni.getDate() + 90); // fotky se pak automaticky mažou

    await radky(sql`
      INSERT INTO inspection_photos (inspection_id, zone_key, client_uuid, storage_key, sha256,
                                     width, height, bytes, exif_taken_at, dhash64, delete_after)
      VALUES (${inspekce.id}::uuid, ${zona}, ${klientId}, ${cesta}, ${pripravena.sha256},
              ${pripravena.sirka}, ${pripravena.vyska}, ${pripravena.data.length},
              ${pripravena.porizeno?.toISOString() ?? null}::timestamptz,
              ${otiskProDb(pripravena.dhash).toString()}::bigint, ${zadrzeni.toISOString().slice(0, 10)}::date)
      ON CONFLICT (inspection_id, client_uuid) DO UPDATE
        SET storage_key = EXCLUDED.storage_key, sha256 = EXCLUDED.sha256,
            uploaded_at = now()
    `);

    return NextResponse.json({ ok: true, zona });
  } catch (e) {
    console.error("[protokol] nahrání fotky selhalo:", e);
    return NextResponse.json({ error: "Fotku se nepodařilo uložit. Zkuste to znovu." }, { status: 500 });
  }
}
