'use client';

import Image from 'next/image';

interface BrainForgeLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  variant?: 'light' | 'dark';
}

export function BrainForgeLogo({ className, size = 32, style }: BrainForgeLogoProps) {
  // Use optimized 128x128 for small renders, full 1024x1024 for large
  const src = size <= 64 ? '/logo-small.png' : '/logo.png';

  return (
    <Image
      src={src}
      alt="BrainForge"
      width={size}
      height={size}
      className={`shrink-0 ${className ?? ''}`}
      style={style}
      priority
      unoptimized
    />
  );
}
