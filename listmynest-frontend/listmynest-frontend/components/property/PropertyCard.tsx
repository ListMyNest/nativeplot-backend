import Link from "next/link";

import { PropertyRemoteImage } from "./PropertyRemoteImage";
import { formatPriceRangeLakh } from "../../lib/utils/formatPrice";
import type { Property } from "../../types";

function typeChipLabel(type: Property["type"]): string {
  const t = String(type).toUpperCase();
  if (t === "PLOT" || t === "PLOTS") return "Plot";
  if (t === "RESIDENTIAL") return "Residential";
  if (t === "COMMERCIAL") return "Commercial";
  if (t === "AGRICULTURAL") return "Agricultural";
  return String(type);
}

function configLabel(raw: string): string {
  const u = raw.toUpperCase();
  if (u === "_1BHK") return "1 BHK";
  if (u === "_2BHK") return "2 BHK";
  if (u === "_3BHK") return "3 BHK";
  if (u === "OPEN") return "Open";
  return raw || "—";
}

export type PropertyCardProps = {
  property: Property;
};

/**
 * Buyer-facing card — never shows seller or agent phone.
 */
export function PropertyCard({ property }: PropertyCardProps) {
  const {
    id,
    title,
    type,
    city,
    locality,
    price_min,
    price_max,
    area_sqft,
    configuration,
    verified,
    primary_photo,
    view_count,
  } = property;

  const priceLine = formatPriceRangeLakh(price_min, price_max);
  const areaLabel = area_sqft ? `${area_sqft} sqft` : "— sqft";
  const typeLabel = typeChipLabel(type);
  const bhk = configuration ? configLabel(String(configuration)) : "—";

  return (
    <Link
      href={`/property/${encodeURIComponent(id)}`}
      className="block h-full overflow-hidden rounded-2xl border border-lmn-border bg-lmn-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video overflow-hidden bg-lmn-border">
        {primary_photo ? (
          <PropertyRemoteImage
            src={primary_photo}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-100 to-gray-200 text-4xl text-lmn-muted">
            <span aria-hidden>🏠</span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          {verified ? (
            <span className="inline-flex rounded-full bg-lmn-verified px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Ready
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-lmn-dark">
              New
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="text-base font-extrabold leading-tight text-lmn-primary">
          {priceLine}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-lmn-dark">
          {title}
        </h3>
        <p className="mt-1 flex items-start gap-1 text-xs leading-snug text-lmn-muted">
          <span className="shrink-0" aria-hidden>
            📍
          </span>
          <span>
            {city}, {locality}
          </span>
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-medium text-lmn-dark ring-1 ring-lmn-border">
            {areaLabel}
          </span>
          <span className="inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-medium text-lmn-dark ring-1 ring-lmn-border">
            {bhk}
          </span>
          <span className="inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-medium text-lmn-dark ring-1 ring-lmn-border">
            {typeLabel}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-medium text-lmn-muted">
          <span aria-hidden>👁</span> {view_count} views
        </p>
      </div>
    </Link>
  );
}
