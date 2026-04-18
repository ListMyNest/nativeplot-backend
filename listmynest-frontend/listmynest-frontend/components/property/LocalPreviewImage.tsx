"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";

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
    <Image
      src={url}
      alt={alt}
      width={960}
      height={540}
      className={className}
      unoptimized
      loading="lazy"
    />
  );
}

