"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui";

export type Contact = {
  name: string;
  email: string;
  phone: string;
  note: string;
};

const INPUT_CLS =
  "w-full rounded-2xl border border-linen/15 bg-bark px-5 py-3.5 text-[15px] text-linen placeholder:text-sage/40 outline-none transition-colors duration-300 focus:border-ember focus:ring-2 focus:ring-ember";

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-sage">
        {label}
        {required && (
          <span className="text-ember" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/** Krok 4 — kontaktní formulář + souhrn ceny. */
export default function ContactStep({
  contact,
  onChange,
  web,
  onWebChange,
  onSubmit,
  onBack,
  sending,
  error,
  summary,
}: {
  contact: Contact;
  onChange: (patch: Partial<Contact>) => void;
  web: string;
  onWebChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  sending: boolean;
  error: string | null;
  summary: ReactNode;
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:gap-12">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Jméno a příjmení" htmlFor="rez-name" required>
          <input
            id="rez-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Jana Lesná"
            className={INPUT_CLS}
            value={contact.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>

        <Field label="E-mail" htmlFor="rez-email" required>
          <input
            id="rez-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jana@lesna.cz"
            className={INPUT_CLS}
            value={contact.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>

        <Field label="Telefon" htmlFor="rez-phone">
          <input
            id="rez-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+420 …"
            className={INPUT_CLS}
            value={contact.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </Field>

        <Field label="Poznámka" htmlFor="rez-note">
          <textarea
            id="rez-note"
            name="note"
            rows={4}
            placeholder="Výročí, pes, pozdější příjezd… cokoliv, co bychom měli vědět."
            className={`${INPUT_CLS} min-h-28 resize-y`}
            value={contact.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </Field>

        {/* Honeypot — lidé pole nevidí, boti ho vyplní */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="rez-web">Web</label>
          <input
            id="rez-web"
            name="web"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={web}
            onChange={(e) => onWebChange(e.target.value)}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-ember/50 bg-ember/10 px-5 py-4 text-sm leading-relaxed text-ember"
          >
            {error}
          </div>
        )}

        <p className="text-[13px] leading-relaxed text-sage/80">
          Odesláním souhlasíte se{" "}
          <Link
            href="/ochrana-osobnich-udaju"
            className="underline underline-offset-2 transition-colors duration-300 hover:text-ember"
          >
            zpracováním údajů
          </Link>{" "}
          pro vyřízení poptávky.
        </p>

        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Odesílám…" : "Odeslat poptávku"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-sage transition-colors duration-300 hover:text-ember"
          >
            ← Zpět na hosty a doplňky
          </button>
        </div>
      </form>

      <div className="md:sticky md:top-24 md:self-start">{summary}</div>
    </div>
  );
}
