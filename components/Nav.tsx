"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NAV_LINKS } from "@/lib/content";
import { Logo, Button } from "./ui";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled && !open
          ? "border-b border-linen/8 bg-night/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Sedmý les — úvodní stránka" className="relative z-50">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Hlavní navigace">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`text-[14.5px] font-medium transition-colors duration-300 ${
                  active ? "text-ember" : "text-linen/75 hover:text-linen"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Button href="/rezervace" className="!px-6 !py-2.5">
            Rezervovat
          </Button>
        </div>

        {/* Mobilní menu */}
        <button
          className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-[5px] lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Zavřít menu" : "Otevřít menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-all duration-300 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-all duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-all duration-300 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="grain fixed inset-0 z-40 flex flex-col justify-between bg-night px-6 pb-10 pt-28 lg:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobilní navigace">
              {[{ href: "/", label: "Úvod" }, ...NAV_LINKS].map((l, i) => {
                const active =
                  pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"));
                return (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={`font-display block py-3 text-4xl font-light ${
                        active ? "text-ember" : "text-linen"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Button href="/rezervace" className="w-full">
                Rezervovat pobyt
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
