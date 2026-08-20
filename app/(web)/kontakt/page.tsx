import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { PRICING, SITE } from "@/lib/content";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Kontakt",
  description:
    "Napište nebo zavolejte do Sedmého lesa. Na e-maily reagujeme do pár hodin. Souřadnice posíláme s potvrzenou rezervací.",
  path: "/kontakt",
});

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-linen/8 py-5 first:pt-0 last:border-0 last:pb-0">
      <p className="text-sm text-sage">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function KontaktPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Kontakt", path: "/kontakt" },
        ])}
      />
      <PageHero
        kicker="Kontakt"
        title="Napište nám,"
        accent="rádi odpovíme."
        lead="Na e-maily reagujeme do pár hodin, na telefon nejlépe večer."
      />

      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-10 md:grid-cols-[1fr_0.8fr] md:gap-14">
            {/* Formulář */}
            <Reveal amount={0.15}>
              <ContactForm />
            </Reveal>

            {/* Kontaktní karta */}
            <Reveal i={1} amount={0.15}>
              <div className="rounded-[28px] border border-linen/8 bg-pine p-8">
                <ContactRow label="E-mail">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="font-display text-xl text-linen transition-colors duration-300 hover:text-ember"
                  >
                    {SITE.email}
                  </a>
                </ContactRow>

                <ContactRow label="Telefon">
                  <a
                    href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                    className="font-display text-xl text-linen transition-colors duration-300 hover:text-ember"
                  >
                    {SITE.phone}
                  </a>
                </ContactRow>

                <ContactRow label="Instagram">
                  <a
                    href={SITE.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-xl text-linen transition-colors duration-300 hover:text-ember"
                  >
                    @sedmyles.cz
                  </a>
                </ContactRow>

                <ContactRow label="Kde nás najdete">
                  <p className="text-[15.5px] leading-relaxed text-linen">
                    {SITE.region} — na samotě u zatopeného lomu.
                  </p>
                  <p className="mt-1 text-sm text-sage">Souřadnice posíláme s rezervací.</p>
                </ContactRow>

                <ContactRow label="Příjezd a odjezd">
                  <p className="text-[15.5px] text-linen">
                    Check-in <span className="font-display">{PRICING.checkIn}</span>
                  </p>
                  <p className="mt-1 text-[15.5px] text-linen">
                    Check-out <span className="font-display">{PRICING.checkOut}</span>
                  </p>
                </ContactRow>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
