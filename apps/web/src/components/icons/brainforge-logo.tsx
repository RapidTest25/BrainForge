'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface BrainForgeLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  /** Force a specific variant regardless of theme */
  variant?: 'light' | 'dark';
}

export function BrainForgeLogo({ className, size = 24, style, variant }: BrainForgeLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Before mount, show nothing to avoid hydration mismatch
  // After mount, pick logo based on theme:
  //   dark mode  → logo.png (purple bg, white emblem)
  //   light mode → logo_black.png (black emblem, transparent bg)
  const isDark = variant === 'dark' || (!variant && mounted && resolvedTheme === 'dark');
  const src = isDark ? '/logo.png' : '/logo_black.png';

  return (
    <Image
      src={src}
      alt="BrainForge"
      width={size}
      height={size}
      className={`rounded-lg shrink-0 ${className ?? ''}`}
      style={{ ...style, opacity: mounted ? 1 : 0, transition: 'opacity 150ms' }}
      priority
    />
  );
}
