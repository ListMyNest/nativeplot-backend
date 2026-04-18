"use client";

import { useState, type FormEvent } from "react";

import { useFilterStore } from "../../store/filterStore";

const HERO_CITIES = [
  "Bidar",
  "Humnabad",
  "Basavakalyan",
  "Bhalki",
  "Aurad",
] as const;

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

export function Hero() {
  const city = useFilterStore((s) => s.city);
  const setCity = useFilterStore((s) => s.setCity);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const [query, setQuery] = useState(searchQuery);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(query.trim());
  };

  return (
    <section className="w-full bg-white px-0 pb-6 pt-4 sm:pt-6 md:pb-8 md:pt-8">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0 text-center lg:text-left">
          <p className="text-xs font-medium text-lmn-muted md:text-sm">
            Karnataka, India
          </p>
          <h1 className="mt-1 text-balance text-[1.65rem] font-bold leading-tight tracking-tight text-lmn-dark sm:text-3xl md:text-4xl lg:text-[2.35rem] lg:leading-tight">
            Find Your Dream Property
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-lmn-muted sm:text-base md:mt-3 md:text-lg">
            Verified listings. Direct contact. Zero hassle.
          </p>

          <form
            className="mt-5 flex flex-col gap-4 md:mt-6"
            onSubmit={onSearch}
            role="search"
          >
            <div className="flex overflow-hidden rounded-2xl border border-lmn-border bg-white shadow-sm">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-4">
                <span className="shrink-0 text-lmn-muted">
                  <SearchIcon className="size-5" />
                </span>
                <span className="sr-only">Search properties</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search area, locality, property ID"
                  className="min-h-[48px] min-w-0 flex-1 border-0 bg-transparent py-3 pr-2 text-base text-lmn-dark outline-none placeholder:text-lmn-muted focus:ring-0 md:text-lg"
                  autoComplete="off"
                />
              </label>
              <button
                type="submit"
                className="min-h-[48px] shrink-0 bg-lmn-primary px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2 md:px-6 md:text-base"
              >
                Search
              </button>
            </div>

            <div
              className="-mx-1 flex flex-wrap justify-center gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] lg:justify-start [&::-webkit-scrollbar]:hidden"
              aria-label="Filter by city"
            >
              {HERO_CITIES.map((name) => {
                const selected = city === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCity(name)}
                    className={
                      selected
                        ? "shrink-0 rounded-full bg-lmn-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2 md:py-3"
                        : "shrink-0 rounded-full border border-lmn-border bg-white px-4 py-2.5 text-sm font-medium text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2 md:py-3"
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
          className="relative mx-auto flex min-h-[200px] w-full max-w-md items-center justify-center rounded-3xl bg-gradient-to-br from-lmn-primary/15 via-lmn-card to-lmn-verified/10 p-8 shadow-inner ring-1 ring-lmn-border lg:max-w-none lg:min-h-[280px]"
          aria-hidden
        >
          <div className="text-center">
            <span className="text-7xl md:text-8xl">🏡</span>
            <p className="mt-4 text-sm font-semibold text-lmn-dark md:text-base">
              Your nest in Bidar district
            </p>
            <p className="mt-1 text-xs text-lmn-muted md:text-sm">
              Plots · Homes · Shops
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
