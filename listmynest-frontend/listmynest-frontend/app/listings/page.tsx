import Link from "next/link";

import { BrowseByType } from "../../components/home/BrowseByType";
import { HomePropertyFeed } from "../../components/home/HomePropertyFeed";
import { PropertyFilters } from "../../components/property/PropertyFilters";

export default function ListingsPage() {
  return (
    <div className="relative min-h-[100dvh] w-full pb-8">
      <main className="mx-auto w-full space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="lmn-h2 text-text">Buy</h1>
          <Link href="/" className="text-sm font-semibold text-lmn-primary">
            Home
          </Link>
        </div>
        <div className="sticky top-[3.75rem] z-20 bg-bg/80 pb-2 backdrop-blur">
          <PropertyFilters title="Buy filters" compact />
        </div>
        <BrowseByType />
        <HomePropertyFeed />
      </main>
    </div>
  );
}
