"use client";

import { useEffect, useState } from "react";

/* eslint-disable @next/next/no-img-element */
/**
 * Local file preview. Uses {@link URL.createObjectURL} inside {@link useEffect}
 * (not {@link useMemo}) so Strict Mode cleanup/revoke does not leave a stale revoked URL on &lt;img&gt;.
 */
export function LocalPreviewImage({
  file,
  alt,
  className,
}: {
  file: File;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);

  if (!src) {
    return (
      <div
        className={`bg-surface2 animate-pulse ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
