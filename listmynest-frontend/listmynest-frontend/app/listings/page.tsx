import Link from "next/link";

import { BrowseByType } from "../../components/home/BrowseByType";
import { HomePropertyFeed } from "../../components/home/HomePropertyFeed";

export default function ListingsPage() {
  return (
    <div className="relative min-h-[100dvh] w-full pb-8">
      <main className="mx-auto w-full space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-lmn-dark">Browse</h1>
          <Link
            href="/"
            className="text-sm font-semibold text-lmn-primary"
          >
            Home
          </Link>
        </div>
        <BrowseByType />
        <HomePropertyFeed />
      </main>
    </div>
  );
}
