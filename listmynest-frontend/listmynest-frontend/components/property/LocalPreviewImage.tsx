"use client";

import { useEffect, useMemo } from "react";

/* eslint-disable @next/next/no-img-element */
export function LocalPreviewImage({
  file,
  alt,
  className,
}: {
  file: File;
  alt: string;
  className?: string;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
    />
  );
}

