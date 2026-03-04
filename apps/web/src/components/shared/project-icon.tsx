'use client';

import { FolderKanban, type LucideIcon } from 'lucide-react';
import { PROJECT_ICON_MAP } from '@/app/(app)/projects/page';

interface ProjectIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ProjectIcon({ icon, className, style }: ProjectIconProps) {
  const Icon = PROJECT_ICON_MAP[icon] || FolderKanban;
  return <Icon className={className} style={style} />;
}
