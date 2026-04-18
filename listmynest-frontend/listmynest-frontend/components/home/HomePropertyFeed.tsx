"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getApiErrorMessage,
  getFeaturedProperties,
  getProperties,
  recordPropertyView,
  searchProperties,
} from "../../lib/api";
import { getSessionHash } from "../../lib/session";
import { useFilterStore } from "../../store/filterStore";
import type { PropertyListItem } from "../../types";
import { showToast } from "../../lib/toast";
import { PropertyCard } from "../property/PropertyCard";

function PropertyCardTracked({ property }: { property: PropertyListItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || recorded.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || recorded.current) continue;
          recorded.current = true;
          const hash = getSessionHash();
          if (hash) {
            void recordPropertyView(property.id, hash, property.city);
          }
          try {
            const k = "lmn_session_listing_views";
            const n = Number(sessionStorage.getItem(k) ?? "0") + 1;
            sessionStorage.setItem(k, String(n));
          } catch {
            /* ignore */
          }
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [property.id, property.city]);

  return (
    <div ref={ref} className="h-full min-w-0">
      <PropertyCard property={property} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <div
          key={k}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="aspect-video animate-pulse bg-gray-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-48 max-w-[70%] animate-pulse rounded bg-gray-200" />
            <div className="mt-2 flex gap-2">
              <div className="h-6 w-14 animate-pulse rounded-full bg-gray-200" />
              <div className="h-6 w-14 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function HomePropertyFeed() {
  const city = useFilterStore((s) => s.city);
  const propertyType = useFilterStore((s) => s.propertyType);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const debouncedSearch = useDebounced(searchQuery.trim(), 320);

  const query = useQuery({
    queryKey: ["homePropertyFeed", city, propertyType, debouncedSearch],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PropertyListItem[]> => {
      if (debouncedSearch) {
        const res = await searchProperties(debouncedSearch, city);
        return res.data;
      }
      if (propertyType) {
        const res = await getProperties({
          city,
          type: propertyType,
          size: 40,
        });
        return res.data;
      }
      const res = await getFeaturedProperties(city);
      return res.data;
    },
  });

  useEffect(() => {
    if (query.isError && query.error) {
      showToast(
        getApiErrorMessage(
          query.error,
          "Could not load properties. Is the API running?"
        ),
        "error"
      );
    }
  }, [query.isError, query.error]);

  const items = query.data ?? [];
  const loading = query.isLoading;
  const empty = useMemo(
    () => !loading && (items.length === 0 || query.isError),
    [items.length, loading, query.isError]
  );

  return (
    <>
      {loading ? <SkeletonGrid /> : null}
      {!loading && empty ? (
        <p className="rounded-2xl border border-dashed border-lmn-border bg-lmn-card px-4 py-10 text-center text-sm leading-relaxed text-lmn-muted">
          {query.isError
            ? "We could not reach the server to load listings. Confirm the backend is running and NEXT_PUBLIC_API_BASE_URL is correct."
            : "No properties yet. Check back soon!"}
        </p>
      ) : null}
      {!loading && !empty ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((property) => (
            <PropertyCardTracked key={property.id} property={property} />
          ))}
        </div>
      ) : null}
    </>
  );
}
