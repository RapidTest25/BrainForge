import Image from 'next/image';

interface BrainForgeLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function BrainForgeLogo({ className, size = 24, style }: BrainForgeLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="BrainForge"
      width={size}
      height={size}
      className={`rounded-lg shrink-0 ${className ?? ''}`}
      style={style}
      priority
    />
  );
}
