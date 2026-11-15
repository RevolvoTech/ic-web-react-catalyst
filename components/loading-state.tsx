export function LoadingState({ label, inline = false }: { label: string; inline?: boolean }) {
  return <span className={`loading-state${inline ? " loading-state--inline" : ""}`} role="status">
    <span className="loading-state__spinner" aria-hidden="true" />
    <span>{label}</span>
  </span>;
}
