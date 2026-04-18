"use client";

import { useFilterStore } from "../../store/filterStore";

const CATEGORIES: {
  emoji: string;
  label: string;
  value: string | null;
}[] = [
  { emoji: "🏠", label: "All", value: null },
  { emoji: "🏘", label: "Residential", value: "RESIDENTIAL" },
  { emoji: "🏗", label: "Plots", value: "PLOT" },
  { emoji: "🏢", label: "Commercial", value: "COMMERCIAL" },
  { emoji: "🌾", label: "Agricultural", value: "AGRICULTURAL" },
];

export function BrowseByType() {
  const propertyType = useFilterStore((s) => s.propertyType);
  const setPropertyType = useFilterStore((s) => s.setPropertyType);

  return (
    <section className="px-4 sm:px-6" aria-labelledby="browse-type-heading">
      <h2
        id="browse-type-heading"
        className="mb-3 text-base font-extrabold text-lmn-dark"
      >
        Browse By Type
      </h2>
      <div
        className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label="Property categories"
      >
        {CATEGORIES.map(({ emoji, label, value }) => {
          const active =
            value === null
              ? propertyType === null
              : propertyType === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPropertyType(value)}
              className={
                active
                  ? "shrink-0 rounded-full bg-lmn-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
                  : "shrink-0 rounded-full border border-lmn-border bg-white px-4 py-2.5 text-sm font-medium text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
              }
            >
              <span className="mr-1.5" aria-hidden>
                {emoji}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
