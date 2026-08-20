"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/content";
import { Logo, Button } from "./ui";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<"closed" | "open" | "closing">("closed");
  const pathname = usePathname();
  const open = menu === "open";

  // Místo scroll listeneru hlídáme sentinel na začátku stránky — prohlížeč
  // to řeší sám, bez callbacku na každý posun.
  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText =
      "position:absolute;top:0;left:0;width:1px;height:33px;pointer-events:none";
    document.body.prepend(sentinel);
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting));
    io.observe(sentinel);
    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  useEffect(() => {
    setMenu((m) => (m === "closed" ? m : "closed"));
  }, [pathname]);

  useEffect(() => {
    if (menu !== "closing") return;
    const t = setTimeout(() => setMenu("closed"), 260);
    return () => clearTimeout(t);
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu((m) => (m === "open" ? "closing" : m));
    };
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
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled && !open ? "border-b border-linen/10 bg-night/95" : "bg-transparent"
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
                className={`text-[14.5px] font-medium transition-colors duration-200 ${
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
          onClick={() => setMenu(open ? "closing" : "open")}
          aria-label={open ? "Zavřít menu" : "Otevřít menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-transform duration-300 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-opacity duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 rounded bg-linen transition-transform duration-300 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {menu !== "closed" && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Navigace"
          data-closing={menu === "closing" ? "" : undefined}
          className="menu-sheet fixed inset-0 z-40 flex flex-col justify-between bg-night px-6 pb-10 pt-28 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobilní navigace">
            {[{ href: "/", label: "Úvod" }, ...NAV_LINKS].map((l, i) => {
              const active =
                pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  style={{ "--rise-i": i } as React.CSSProperties}
                  className={`font-display rise-in block py-3 text-4xl font-light ${
                    active ? "text-ember" : "text-linen"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div
            className="rise-in"
            style={{ "--rise-i": NAV_LINKS.length + 1 } as React.CSSProperties}
          >
            <Button href="/rezervace" className="w-full">
              Rezervovat pobyt
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
