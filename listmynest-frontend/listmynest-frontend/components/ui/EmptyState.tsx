import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-surface p-8 text-center shadow-md">
      {icon ? (
        <div className="mb-3 rounded-2xl bg-surface2 p-3 text-text shadow-sm">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-extrabold text-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

