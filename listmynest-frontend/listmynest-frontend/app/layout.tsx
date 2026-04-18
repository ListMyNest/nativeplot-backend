import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ReactQueryProvider } from "../components/providers/ReactQueryProvider";
import { SessionBootstrap } from "../components/SessionBootstrap";
import { BottomNav } from "../components/shared/BottomNav";
import { TopNav } from "../components/shared/TopNav";
import { ToastHost } from "../components/Toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ListMyNest — Real Estate in Bidar",
  description:
    "Find verified properties in Bidar, Humnabad, Basavakalyan and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-screen bg-gray-50 font-sans text-lmn-dark antialiased`}
      >
        <ReactQueryProvider>
          <SessionBootstrap>
            <div className="flex min-h-screen flex-col">
              <TopNav />
              <main className="min-h-screen flex-1 pb-24 md:pb-8">
                <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-10">
                  {children}
                </div>
              </main>
              <div className="md:hidden">
                <BottomNav />
              </div>
            </div>
            <ToastHost />
          </SessionBootstrap>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
