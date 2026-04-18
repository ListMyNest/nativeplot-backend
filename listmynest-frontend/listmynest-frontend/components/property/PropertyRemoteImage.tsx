"use client";

import Image from "next/image";
import { useState } from "react";

type PropertyRemoteImageProps = {
  src: string;
  alt: string;
  /** When true, fills parent (parent must be `position: relative` + height) */
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Gray skeleton until decode */
  showSkeleton?: boolean;
};

/** Signed Supabase URLs and some CDNs break the default optimizer — disable for those. */
function shouldUseUnoptimized(src: string): boolean {
  return (
    src.includes("supabase.co") ||
    src.includes("token=") ||
    src.includes("/object/sign/")
  );
}

export function PropertyRemoteImage({
  src,
  alt,
  fill,
  width,
  height,
  className = "",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  showSkeleton = true,
}: PropertyRemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const unopt = shouldUseUnoptimized(src);

  return (
    <div
      className={
        fill
          ? `relative size-full overflow-hidden bg-gray-200 ${className}`
          : `relative overflow-hidden bg-gray-200 ${className}`
      }
    >
      {showSkeleton && !loaded ? (
        <div
          className={
            fill
              ? "absolute inset-0 z-[1] animate-pulse bg-gray-200"
              : "absolute inset-0 z-[1] animate-pulse bg-gray-200"
          }
          aria-hidden
        />
      ) : null}
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          unoptimized={unopt}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width ?? 800}
          height={height ?? 600}
          sizes={sizes}
          className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          unoptimized={unopt}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
