"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { getPropertyDetail, searchProperties } from "../../lib/api";
import { useFilterStore } from "../../store/filterStore";
import type { PropertyListItem } from "../../types";

const HERO_CITIES = [
  "Bidar",
  "Humnabad",
  "Basavakalyan",
  "Bhalki",
  "Aurad",
] as const;

/** Start fetching suggestions after this many characters (placeholder says 2–3). */
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 280;
const SUGGEST_PAGE_SIZE = 10;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M16 16 21 21"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function subtitleForProperty(p: PropertyListItem): string {
  const loc = p.locality?.trim();
  const c = p.city?.trim();
  if (loc && c) return `${loc} · ${c}`;
  return c || loc || p.type || "";
}

export function Hero() {
  const router = useRouter();
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const city = useFilterStore((s) => s.city);
  const setCity = useFilterStore((s) => s.setCity);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const [query, setQuery] = useState(searchQuery);
  const debouncedQuery = useDebounced(query.trim(), SUGGEST_DEBOUNCE_MS);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const suggestQuery = useQuery({
    queryKey: ["heroSearchSuggest", debouncedQuery, city],
    enabled: debouncedQuery.length >= SUGGEST_MIN_CHARS,
    staleTime: 45_000,
    queryFn: async (): Promise<PropertyListItem[]> => {
      const cityArg = city?.trim() || undefined;
      const res = await searchProperties(debouncedQuery, cityArg, {
        page: 0,
        size: SUGGEST_PAGE_SIZE,
        suppressErrorToast: true,
      });
      let items = [...res.data];
      if (UUID_RE.test(debouncedQuery)) {
        try {
          const d = await getPropertyDetail(debouncedQuery, {
            suppressErrorToast: true,
          });
          if (!items.some((x) => x.id === d.id)) {
            const row: PropertyListItem = {
              id: d.id,
              title: d.title,
              type: d.type,
              city: d.city,
              locality: d.locality,
              price_min: d.price_min,
              price_max: d.price_max,
              area_sqft: d.area_sqft,
              configuration: d.configuration,
              verified: d.verified,
              status: d.status,
              primary_photo: d.primary_photo,
              photo_count: d.photo_count,
              view_count: d.view_count,
              created_at: d.created_at,
            };
            items = [row, ...items];
          }
        } catch {
          /* not found or network */
        }
      }
      return items.slice(0, 8);
    },
  });

  const suggestions = suggestQuery.data ?? [];
  const showPanel =
    focused &&
    debouncedQuery.length >= SUGGEST_MIN_CHARS &&
    (suggestQuery.isFetching ||
      suggestQuery.isSuccess ||
      suggestQuery.isError);

  useEffect(() => {
    setHighlight(-1);
  }, [debouncedQuery, suggestQuery.data]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goToProperty = useCallback(
    (id: string) => {
      setFocused(false);
      router.push(`/property/${encodeURIComponent(id)}`);
    },
    [router]
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (highlight >= 0 && suggestions[highlight]) {
      goToProperty(suggestions[highlight].id);
      return;
    }
    setSearchQuery(query.trim());
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || suggestions.length === 0) {
      if (e.key === "Escape") setFocused(false);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setFocused(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
      return;
    }
    if (e.key === "Enter" && highlight >= 0 && suggestions[highlight]) {
      e.preventDefault();
      goToProperty(suggestions[highlight].id);
    }
  };

  return (
    <section className="w-full bg-bg px-0 pb-6 pt-4 sm:pt-6 md:pb-8 md:pt-8">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0 text-center lg:text-left">
          <h1 className="lmn-h1 mt-1 text-balance text-text">
            Find Your Dream Property
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted sm:text-base md:mt-3 md:text-lg">
            Zero hassle. Property at your fingertips.
          </p>

          <form
            className="mt-5 flex flex-col gap-4 md:mt-6"
            onSubmit={onSearch}
            role="search"
          >
            <div ref={wrapRef} className="relative">
              <div className="flex overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-md">
                <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-4">
                  <span className="shrink-0 text-muted">
                    <SearchIcon className="size-5" />
                  </span>
                  <span className="sr-only">Search properties</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Search area, locality, property ID"
                    className="min-h-[48px] min-w-0 flex-1 border-0 bg-transparent py-3 pr-2 text-base text-text outline-none placeholder:text-muted focus:ring-0 md:text-lg"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-expanded={showPanel}
                    aria-activedescendant={
                      highlight >= 0
                        ? `${listboxId}-opt-${highlight}`
                        : undefined
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-[48px] shrink-0 bg-lmn-primary px-5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:px-6 md:text-base"
                >
                  Search
                </button>
              </div>

              {showPanel ? (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-lg"
                  id={listboxId}
                  role="listbox"
                  aria-label="Search suggestions"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {suggestQuery.isFetching ? (
                    <p className="px-4 py-3 text-sm text-muted">Searching…</p>
                  ) : suggestQuery.isError ? (
                    <p className="px-4 py-3 text-sm text-muted">
                      Suggestions unavailable. Press Search to try anyway.
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted">
                      No listings match. Try another spelling or press Search.
                    </p>
                  ) : (
                    <ul className="max-h-[min(320px,50vh)] overflow-y-auto py-1">
                      {suggestions.map((p, i) => {
                        const active = i === highlight;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              id={`${listboxId}-opt-${i}`}
                              role="option"
                              aria-selected={active}
                              className={
                                active
                                  ? "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm bg-bg/80"
                                  : "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-bg/60"
                              }
                              onMouseEnter={() => setHighlight(i)}
                              onClick={() => goToProperty(p.id)}
                            >
                              <span className="font-medium text-text line-clamp-2">
                                {p.title}
                              </span>
                              <span className="text-xs text-muted">
                                {subtitleForProperty(p)}
                                {p.id.length >= 8 ? (
                                  <span className="ml-1 font-mono text-[11px] opacity-80">
                                    · {p.id.slice(0, 8)}…
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div
              className="-mx-1 flex flex-wrap justify-center gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] lg:justify-start [&::-webkit-scrollbar]:hidden"
              aria-label="Filter by city"
            >
              {(["All", ...HERO_CITIES] as const).map((name) => {
                const selected = name === "All" ? !city : city === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCity(name === "All" ? "" : name)}
                    className={
                      selected
                        ? "shrink-0 rounded-full bg-lmn-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:py-3"
                        : "shrink-0 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:py-3"
                    }
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </form>
        </div>

        <div
          className="relative mx-auto flex min-h-[200px] w-full max-w-md items-center justify-center rounded-3xl border-2 border-border bg-surface p-8 shadow-md lg:max-w-none lg:min-h-[280px]"
          aria-hidden
        >
          <div className="text-center">
            <span className="text-7xl md:text-8xl">🏡</span>
            <p className="mt-4 text-sm font-semibold text-text md:text-base">
              Verified properties, fast.
            </p>
            <p className="mt-1 text-xs text-muted md:text-sm">
              Plot · Agricultural · Rent
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
