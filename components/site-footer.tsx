import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="site-footer__lead">
          <BrandMark />
          <p>
            Expedition planning and field awareness built around source, time,
            freshness, and human judgment.
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <p className="eyebrow">Explore</p>
          <Link href="/platform">Platform</Link>
          <Link href="/qgps">QGPS Integration</Link>
          <Link href="/demo">Interactive Demo</Link>
        </nav>

        <div className="site-footer__note">
          <p className="eyebrow">Operating principle</p>
          <p>Catalyst supports decisions. It does not declare a route safe or unsafe.</p>
          <Link className="text-link" href="/qgps">
            Review data provenance <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="shell site-footer__base">
        <span>© {new Date().getFullYear()} Catalyst</span>
        <span>Milestone 1 · Pilot interface</span>
      </div>
    </footer>
  );
}
