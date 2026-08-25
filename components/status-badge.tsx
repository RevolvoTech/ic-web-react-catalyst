import type { ReactNode } from "react";

type StatusTone =
  | "information"
  | "success"
  | "warning"
  | "critical"
  | "unknown"
  | "simulated";

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={tone}>
      <span className="status-badge__shape" aria-hidden="true" />
      {children}
    </span>
  );
}
