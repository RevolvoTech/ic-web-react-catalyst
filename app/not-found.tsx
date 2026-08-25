import Link from "next/link";

export default function NotFound() {
  return (
    <section className="error-page shell">
      <p className="eyebrow">404 · Route unavailable</p>
      <h1>This path is outside the plan.</h1>
      <p>The requested page is not part of this Catalyst build.</p>
      <Link className="button button--primary" href="/">
        Return home
      </Link>
    </section>
  );
}
