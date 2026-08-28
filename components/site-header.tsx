"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/platform", label: "Platform" },
  { href: "/qgis", label: "QGIS Integration" },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    drawer.addEventListener("keydown", onKeyDown);
    return () => {
      drawer.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <BrandMark />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          className="button button--primary site-header__cta"
          href="/demo"
          aria-current={pathname.startsWith("/demo") ? "page" : undefined}
        >
          Open demo
        </Link>

        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            className="mobile-drawer"
            id="mobile-menu"
            ref={drawerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <m.div
              className="mobile-drawer__backdrop"
              aria-hidden="true"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <m.nav
              className="mobile-drawer__panel"
              aria-label="Mobile navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow">Navigate Catalyst</p>
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  className="mobile-drawer__link"
                  href={item.href}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                className="button button--primary mobile-drawer__cta"
                href="/demo"
                aria-current={pathname.startsWith("/demo") ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                Open QGIS demo
              </Link>
            </m.nav>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
