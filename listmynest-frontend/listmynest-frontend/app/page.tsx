import Link from "next/link";

import { BrowseByType } from "../components/home/BrowseByType";
import { EnquiryBanner } from "../components/home/EnquiryBanner";
import { HomePropertyFeed } from "../components/home/HomePropertyFeed";
import { NotifyMeBanner } from "../components/home/NotifyMeBanner";
import { Hero } from "../components/shared/Hero";

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] w-full">
      <main className="mx-auto w-full space-y-5 py-2 sm:space-y-6 sm:py-4">
        <Hero />
        <EnquiryBanner />
        <BrowseByType />
        <section
          className="px-0 sm:px-0"
          aria-labelledby="featured-properties-heading"
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2
              id="featured-properties-heading"
              className="text-lg font-extrabold leading-tight text-lmn-dark"
            >
              Featured Properties
            </h2>
            <Link
              href="/listings"
              className="shrink-0 rounded text-sm font-semibold text-lmn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
            >
              View All
            </Link>
          </div>
          <HomePropertyFeed />
        </section>
        <NotifyMeBanner />
      </main>
    </div>
  );
}
