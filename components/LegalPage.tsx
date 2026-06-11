import { marked } from "marked";
import PageHero from "./PageHero";

/**
 * Šablona právních stránek — hlavička kapitoly + markdown obsah
 * vysázený přes .prose-les. Renderuje se na serveru při buildu.
 */
export default function LegalPage({
  title,
  kicker,
  effectiveFrom,
  markdown,
}: {
  title: string;
  kicker: string;
  effectiveFrom: string;
  markdown: string;
}) {
  const html = marked.parse(markdown, { async: false }) as string;

  return (
    <main>
      <PageHero
        kicker={kicker}
        title={title}
        lead={`Účinné od ${effectiveFrom}. Vzorový dokument — před ostrým spuštěním jej nechte zkontrolovat právníkem.`}
      />
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div
            className="prose-les [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:my-8 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-[15px] [&_th]:border-b [&_th]:border-linen/15 [&_th]:py-3 [&_th]:pr-4 [&_th]:align-top [&_th]:font-semibold [&_th]:text-linen [&_td]:border-b [&_td]:border-linen/8 [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top [&_td]:text-sage"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>
    </main>
  );
}
