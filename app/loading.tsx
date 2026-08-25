export default function Loading() {
  return (
    <div className="page-loading shell" role="status" aria-live="polite">
      <span className="page-loading__signal" aria-hidden="true" />
      <span>Loading Catalyst…</span>
    </div>
  );
}
