"use client";

import type { LucideIcon } from "lucide-react";

export type IconProps = {
  icon: LucideIcon;
  size?: 16 | 20 | 24;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
};

export function Icon({
  icon: I,
  size = 20,
  className,
  ...rest
}: IconProps) {
  return (
    <I
      width={size}
      height={size}
      className={className}
      strokeWidth={2}
      {...rest}
    />
  );
}

