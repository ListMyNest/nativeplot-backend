"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useFilterStore } from "../../store/filterStore";
import { Button } from "../ui/Button";

const CITIES = ["Bidar", "Humnabad", "Basavakalyan", "Bhalki", "Aurad"] as const;

export function PropertyFilters({
  title = "Filters",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  const city = useFilterStore((s) => s.city);
  const setCity = useFilterStore((s) => s.setCity);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const [q, setQ] = useState(searchQuery);

  const cityValue = city?.trim() ? city : "";

  const canClear = useMemo(() => {
    return Boolean(cityValue) || Boolean(searchQuery?.trim());
  }, [cityValue, searchQuery]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(q.trim());
  };

  return (
    <section
      className={[
        "rounded-3xl border-2 border-border bg-surface p-4 shadow-md",
        compact ? "p-3 sm:p-4" : "",
      ].join(" ")}
      aria-label={title}
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        role="search"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">Search</p>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Area, locality, property ID"
            className="mt-2 min-h-[48px] w-full rounded-2xl border border-border bg-surface px-4 text-text shadow-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
          />
        </div>

        <div className="sm:w-56">
          <p className="text-xs font-semibold text-muted">City</p>
          <select
            value={cityValue}
            onChange={(e) => setCity(e.target.value)}
            className="mt-2 min-h-[48px] w-full rounded-2xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
          >
            <option value="">All</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 sm:pb-[2px]">
          <Button type="submit" variant="primary" className="min-h-[48px]">
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px]"
            disabled={!canClear}
            onClick={() => {
              resetFilters();
              setQ("");
            }}
          >
            Clear
          </Button>
        </div>
      </form>
    </section>
  );
}

