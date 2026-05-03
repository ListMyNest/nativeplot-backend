"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

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
import { PropertyCardSkeleton } from "../ui/LoadingSkeleton";

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
  const [showLoading, setShowLoading] = useState(false);

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
  const empty = items.length === 0 || query.isError;

  useEffect(() => {
    // Show skeleton whenever we're fetching AND there's no data yet.
    // Keep it visible briefly so users can perceive it on slow networks.
    const fetching = query.fetchStatus === "fetching";
    if (fetching && (!query.data || query.data.length === 0)) {
      setShowLoading(true);
      return;
    }
    if (!fetching) {
      const t = window.setTimeout(() => setShowLoading(false), 250);
      return () => window.clearTimeout(t);
    }
  }, [query.fetchStatus, query.data]);

  if (query.isLoading || showLoading) {
    return <PropertyCardSkeleton count={6} />;
  }

  return (
    <>
      {empty ? (
        <p className="rounded-2xl border-2 border-dashed border-border bg-surface px-4 py-10 text-center text-sm leading-relaxed text-muted shadow-md">
          {query.isError
            ? "We could not reach the server to load listings. Confirm the backend is running and NEXT_PUBLIC_API_BASE_URL is correct."
            : "No properties yet. Check back soon!"}
        </p>
      ) : null}
      {!empty ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((property) => (
            <PropertyCardTracked key={property.id} property={property} />
          ))}
        </div>
      ) : null}
    </>
  );
}
