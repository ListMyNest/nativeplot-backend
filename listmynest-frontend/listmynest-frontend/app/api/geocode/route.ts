import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Nominatim (usage policy: identify the app, low volume).
 * Used when a listing has no lat/lng so the detail page can still show a map pin.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ListMyNest/1.0 (https://listmynest.example; property-detail geocode)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "geocoder_failed", status: res.status },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const first = Array.isArray(data) ? data[0] : undefined;
    if (!first?.lat || !first?.lon) {
      return NextResponse.json({ lat: null, lng: null });
    }
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ lat: null, lng: null });
    }
    return NextResponse.json({ lat, lng });
  } catch {
    return NextResponse.json({ error: "geocoder_error" }, { status: 502 });
  }
}
