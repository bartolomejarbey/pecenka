"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

type Status = "idle" | "sending" | "sent" | "error";

const inputCls =
  "w-full rounded-2xl border border-linen/15 bg-bark px-5 py-3.5 text-[15px] text-linen placeholder:text-sage/50 outline-none transition-colors duration-300 focus:border-ember";
const labelCls = "mb-2 block text-sm text-sage";

/** Kontaktní formulář — POST /api/kontakt, honeypot „web". */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
      web: String(fd.get("web") ?? ""),
    };

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.",
      );
    }
  }

  if (status === "sent") {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-ember/30 bg-pine p-10 text-center md:p-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-ember/40 text-ember">
          <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M3.5 10.5 8 15 16.5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="font-display mt-6 text-2xl text-linen md:text-3xl">
          Zpráva odletěla lesem.
        </p>
        <p className="mt-3 text-sage">Ozveme se brzy — většinou do pár hodin.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative" noValidate={false}>
      {/* Honeypot — lidé nevidí, roboti vyplní. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="kontakt-web">Web</label>
        <input id="kontakt-web" name="web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="kontakt-jmeno" className={labelCls}>
            Vaše jméno
          </label>
          <input
            id="kontakt-jmeno"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Jana Lesná"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="kontakt-email" className={labelCls}>
            E-mail
          </label>
          <input
            id="kontakt-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jana@les.cz"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="kontakt-zprava" className={labelCls}>
          Zpráva
        </label>
        <textarea
          id="kontakt-zprava"
          name="message"
          required
          rows={6}
          placeholder="Dobrý den, chtěli bychom se zeptat…"
          className={`${inputCls} resize-y`}
        />
      </div>

      {status === "error" && error && (
        <p role="alert" className="mt-4 text-sm text-ember">
          {error}
        </p>
      )}

      <p className="mt-4 text-sm text-sage/80">
        Odesláním zprávy berete na vědomí{" "}
        <Link
          href="/ochrana-osobnich-udaju"
          className="text-ember underline underline-offset-2"
        >
          zpracování osobních údajů
        </Link>{" "}
        za účelem vyřízení dotazu.
      </p>

      <div className="mt-8">
        <Button type="submit" disabled={status === "sending"} className="w-full sm:w-auto">
          {status === "sending" ? "Odesílám…" : "Odeslat zprávu"}
        </Button>
      </div>
    </form>
  );
}
