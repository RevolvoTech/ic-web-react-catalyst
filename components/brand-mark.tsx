import Link from "next/link";

interface BrandMarkProps {
  inverse?: boolean;
}

export function BrandMark({ inverse = false }: BrandMarkProps) {
  return (
    <Link className="brand" href="/" aria-label="Catalyst home" data-inverse={inverse || undefined}>
      <svg className="brand__symbol" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 4h24v7H11v10h17v7H4V4Z" fill="currentColor" />
        <path d="m21 11 7 5-7 5V11Z" className="brand__signal" />
      </svg>
      <span className="brand__word">Catalyst</span>
    </Link>
  );
}

// testing GitHub Desktop
