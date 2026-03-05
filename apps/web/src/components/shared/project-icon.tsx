'use client';

import {
  FolderKanban, Rocket, Package, PaintBucket, Lightbulb, Zap, Flame, Star,
  BarChart3, Wrench, Crosshair, Smartphone, Globe,
  FlaskConical, FileText, Gamepad2, Building2,
  type LucideIcon,
} from 'lucide-react';

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  package: Package,
  paintBucket: PaintBucket,
  lightbulb: Lightbulb,
  zap: Zap,
  flame: Flame,
  star: Star,
  barChart: BarChart3,
  wrench: Wrench,
  crosshair: Crosshair,
  smartphone: Smartphone,
  globe: Globe,
  flask: FlaskConical,
  fileText: FileText,
  gamepad: Gamepad2,
  building: Building2,
};

interface ProjectIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ProjectIcon({ icon, className, style }: ProjectIconProps) {
  const Icon = PROJECT_ICON_MAP[icon] || FolderKanban;
  return <Icon className={className} style={style} />;
}
