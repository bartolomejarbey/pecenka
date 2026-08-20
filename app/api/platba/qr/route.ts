import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { overPodpis } from "@/lib/payments/podpis";
import { qrPng, qrSvg } from "@/lib/payments/qr";

/**
 * Obrázek QR platby.
 *
 * Adresuje se **id platby a podpisem**, ne variabilním symbolem. VS je jen
 * deset číslic a jde odhadnout — bez podpisu by šlo enumerací zjistit částky
 * a termíny cizích rezervací.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platbaId = url.searchParams.get("p") ?? "";
  const podpis = url.searchParams.get("s") ?? "";
  const format = url.searchParams.get("f") === "png" ? "png" : "svg";

  if (!platbaId || !overPodpis(platbaId, podpis)) {
    return new Response("Nepovoleno.", { status: 401 });
  }

  const [platba] = await radky<{ spayd: string | null }>(
    sql`SELECT spayd FROM payments WHERE id = ${platbaId}::uuid`,
  );
  if (!platba?.spayd) return new Response("Platba nenalezena.", { status: 404 });

  // Soukromé, ale neměnné — QR se pro danou platbu nikdy nezmění.
  const hlavicky = { "Cache-Control": "private, max-age=86400, immutable" };

  if (format === "png") {
    const png = await qrPng(platba.spayd);
    return new Response(new Uint8Array(png), {
      headers: { ...hlavicky, "Content-Type": "image/png" },
    });
  }
  return new Response(await qrSvg(platba.spayd), {
    headers: { ...hlavicky, "Content-Type": "image/svg+xml" },
  });
}
