import "server-only";

import { SYSTEMOVY_PROMPT, VERZE_PROMPTU } from "./prompt";

/**
 * Vrstva s modelem.
 *
 * Vyhodnocení jede na **gpt-5.6-luna** od OpenAI — odtud „Luna 5.6".
 * Rozhraní je vyměnitelné, takže se dá přepnout na jiný model jednou
 * proměnnou, aniž by se sáhlo na prompt nebo na pipeline.
 *
 * Bez jakéhokoli klíče běží jen obrazová analýza a všechny nálezy jdou rovnou
 * k lidskému posouzení — z hlediska GDPR nejbezpečnější varianta, která nikdy
 * nikoho nepoškodí.
 */

export type Zavaznost = "none" | "dirt" | "wear" | "damage_minor" | "damage_major" | "missing";

export type Nalez = {
  zone_key: string;
  severity: Zavaznost;
  confidence: number;
  evidence_bbox: { x: number; y: number; w: number; h: number } | null;
  what_changed: string;
  /** Povinné — nejvěrohodnější důvod, proč to poškození být nemusí. */
  alternative_explanation: string;
  is_lighting_or_angle_artifact: boolean;
  is_guest_mess_not_damage: boolean;
  contains_person: boolean;
  estimated_cost_czk: { min: number; max: number };
  needs_reshoot: boolean;
};

export type Uzitek = {
  vstupniTokeny: number;
  kesovaneTokeny: number;
  vystupniTokeny: number;
  cenaHalere: number;
  trvaniMs: number;
  model: string;
};

export type OdpovedModelu = { nalez: Nalez; uzitek: Uzitek };

/** Obrázek k odeslání. */
export type Obrazek = { data: Buffer; popis: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "zone_key", "severity", "confidence", "what_changed", "alternative_explanation",
    "is_lighting_or_angle_artifact", "is_guest_mess_not_damage", "contains_person",
    "estimated_cost_czk", "needs_reshoot", "evidence_bbox",
  ],
  properties: {
    zone_key: { type: "string" },
    severity: { type: "string", enum: ["none", "dirt", "wear", "damage_minor", "damage_major", "missing"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence_bbox: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["x", "y", "w", "h"],
      properties: {
        x: { type: "number" }, y: { type: "number" },
        w: { type: "number" }, h: { type: "number" },
      },
    },
    what_changed: { type: "string" },
    alternative_explanation: { type: "string" },
    is_lighting_or_angle_artifact: { type: "boolean" },
    is_guest_mess_not_damage: { type: "boolean" },
    contains_person: { type: "boolean" },
    estimated_cost_czk: {
      type: "object", additionalProperties: false,
      required: ["min", "max"],
      properties: { min: { type: "number" }, max: { type: "number" } },
    },
    needs_reshoot: { type: "boolean" },
  },
} as const;

/**
 * Který poskytovatel je k dispozici.
 *
 * Luna běží na ChatGPT — tak to zadal majitel. Claude zůstává jako záloha,
 * kdyby se někdy hodilo přepnout; rozhraní i prompt jsou pro oba stejné.
 */
export function dostupnyModel(): "openai" | "anthropic" | "zadny" {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "zadny";
}

export const VERZE = VERZE_PROMPTU;

/* ===== Ceník (haléře za milion tokenů) — jen pro evidenci nákladů ===== */
const CENIK: Record<string, { vstup: number; kes: number; vystup: number }> = {
  "gpt-5.6-luna": { vstup: 2_7500, kes: 2_750, vystup: 22_0000 },
  "gpt-5.5": { vstup: 2_7500, kes: 2_750, vystup: 22_0000 },
  "gpt-5": { vstup: 2_7500, kes: 2_750, vystup: 22_0000 },
  "gpt-5-mini": { vstup: 5_500, kes: 550, vystup: 4_4000 },
  "claude-opus-5": { vstup: 3_2500, kes: 3_250, vystup: 16_2500 },
};

function spocitejCenu(model: string, u: Omit<Uzitek, "cenaHalere" | "trvaniMs" | "model">): number {
  const c = CENIK[model] ?? CENIK["gpt-5.6-luna"];
  return Math.round(
    (u.vstupniTokeny * c.vstup + u.kesovaneTokeny * c.kes + u.vystupniTokeny * c.vystup) / 1_000_000,
  );
}

/* ===== Anthropic ===== */

async function pridejAnthropic(
  zprava: string,
  obrazky: Obrazek[],
  zonaKlic: string,
): Promise<OdpovedModelu> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const klient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.LUNA_MODEL ?? "claude-opus-5";
  const zacatek = Date.now();

  const obsah = [
    ...obrazky.map((o) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: o.data.toString("base64") },
    })),
    { type: "text" as const, text: zprava },
  ];

  const odpoved = await klient.messages.create({
    model,
    max_tokens: 1500,
    system: [{ type: "text", text: SYSTEMOVY_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: obsah }],
    tools: [
      {
        name: "zapis_nalez",
        description: "Zapíše nález pro jednu zónu.",
        input_schema: SCHEMA as never,
      },
    ],
    tool_choice: { type: "tool", name: "zapis_nalez" },
  });

  const nastroj = odpoved.content.find((c) => c.type === "tool_use");
  if (!nastroj || nastroj.type !== "tool_use") throw new Error("Model nevrátil strukturovaný nález.");

  const u = {
    vstupniTokeny: odpoved.usage.input_tokens,
    kesovaneTokeny: odpoved.usage.cache_read_input_tokens ?? 0,
    vystupniTokeny: odpoved.usage.output_tokens,
  };
  return {
    nalez: normalizuj(nastroj.input as Partial<Nalez>, zonaKlic),
    uzitek: { ...u, cenaHalere: spocitejCenu(model, u), trvaniMs: Date.now() - zacatek, model },
  };
}

/* ===== OpenAI ===== */

async function pridejOpenAi(
  zprava: string,
  obrazky: Obrazek[],
  zonaKlic: string,
): Promise<OdpovedModelu> {
  const model = process.env.LUNA_MODEL ?? "gpt-5.6-luna";
  const zacatek = Date.now();

  const odpoved = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEMOVY_PROMPT },
        {
          role: "user",
          content: [
            ...obrazky.map((o) => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${o.data.toString("base64")}` },
            })),
            { type: "text", text: zprava },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "nalez", strict: true, schema: SCHEMA },
      },
    }),
  });

  if (!odpoved.ok) {
    throw new Error(`Model odmítl požadavek: ${odpoved.status} ${(await odpoved.text()).slice(0, 200)}`);
  }
  const data = (await odpoved.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number;
              prompt_tokens_details?: { cached_tokens?: number } };
  };

  const u = {
    vstupniTokeny: data.usage?.prompt_tokens ?? 0,
    kesovaneTokeny: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    vystupniTokeny: data.usage?.completion_tokens ?? 0,
  };
  return {
    nalez: normalizuj(JSON.parse(data.choices[0].message.content) as Partial<Nalez>, zonaKlic),
    uzitek: { ...u, cenaHalere: spocitejCenu(model, u), trvaniMs: Date.now() - zacatek, model },
  };
}

/** Doplní chybějící pole a ořízne nesmysly. Model se občas utrhne. */
function normalizuj(n: Partial<Nalez>, zonaKlic: string): Nalez {
  const zavaznosti: Zavaznost[] = ["none", "dirt", "wear", "damage_minor", "damage_major", "missing"];
  return {
    zone_key: n.zone_key || zonaKlic,
    severity: zavaznosti.includes(n.severity as Zavaznost) ? (n.severity as Zavaznost) : "none",
    confidence: Math.max(0, Math.min(1, Number(n.confidence) || 0)),
    evidence_bbox: n.evidence_bbox ?? null,
    what_changed: (n.what_changed ?? "").slice(0, 600),
    // Prázdný protiargument nesmí projít — je to pojistka proti tomu,
    // aby majitel uvěřil sám sobě.
    alternative_explanation:
      (n.alternative_explanation ?? "").trim() ||
      "Model neuvedl alternativní vysvětlení — ber nález s rezervou.",
    is_lighting_or_angle_artifact: Boolean(n.is_lighting_or_angle_artifact),
    is_guest_mess_not_damage: Boolean(n.is_guest_mess_not_damage),
    contains_person: Boolean(n.contains_person),
    estimated_cost_czk: {
      min: Math.max(0, Number(n.estimated_cost_czk?.min) || 0),
      max: Math.max(0, Number(n.estimated_cost_czk?.max) || 0),
    },
    needs_reshoot: Boolean(n.needs_reshoot),
  };
}

/** Zeptá se modelu. Vrátí `null`, když není nastavený žádný klíč. */
export async function zeptejSe(
  zprava: string,
  obrazky: Obrazek[],
  zonaKlic: string,
): Promise<OdpovedModelu | null> {
  switch (dostupnyModel()) {
    case "openai":
      return pridejOpenAi(zprava, obrazky, zonaKlic);
    case "anthropic":
      return pridejAnthropic(zprava, obrazky, zonaKlic);
    default:
      return null;
  }
}
