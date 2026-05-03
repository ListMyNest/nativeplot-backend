import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function Card({
  title,
  description,
  actions,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <section
      className={[
        "rounded-2xl border-2 border-border bg-surface p-5 shadow-md",
        "transition-[transform,box-shadow] duration-base hover:-translate-y-0.5 hover:shadow-md",
        className,
      ].join(" ")}
      {...rest}
    >
      {title || description || actions ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="truncate text-base font-extrabold text-text">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

