// components/landing/ProductShowcase.tsx
'use client';

import { motion, useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;
import { Brain, Home, CheckSquare, MessageSquare, GitBranch, Calendar, Zap } from 'lucide-react';
import { KanbanMiniDemo } from './KanbanMiniDemo';
import { AIMiniChatDemo } from './AIMiniChatDemo';
import type { HeroScene } from './useHeroTimeline';

interface ProductShowcaseProps {
  showcaseControls: AnimationControls;
  kanbanControls: AnimationControls;
  aiChatControls: AnimationControls;
  scene: HeroScene;
}

const SIDEBAR_ITEMS = [
  { icon: Home, label: 'Home', active: false },
  { icon: CheckSquare, label: 'Tasks', active: true },
  { icon: MessageSquare, label: 'Brainstorm', active: false },
  { icon: GitBranch, label: 'Diagrams', active: false },
  { icon: Calendar, label: 'Calendar', active: false },
  { icon: Zap, label: 'Sprints', active: false },
];

export function ProductShowcase({
  showcaseControls,
  kanbanControls,
  aiChatControls,
  scene,
}: ProductShowcaseProps) {
  return (
    <motion.div
      animate={showcaseControls}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
        {/* Window chrome */}
        <div className="flex items-center gap-0 px-3 sm:px-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-1.5 pr-3 sm:pr-4 py-2 sm:py-2.5">
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-400/80" />
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-yellow-400/80" />
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-400/80" />
          </div>
          {['List', 'Board', 'Calendar'].map((tab, i) => (
            <button
              key={tab}
              className={`px-2 sm:px-3 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-medium border-b-2 transition-colors ${
                i === 1
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* App body */}
        <div className="flex h-55 sm:h-70 md:h-80">
          {/* Sidebar - hidden on mobile, icons only on tablet, full on desktop */}
          <div className="hidden md:block w-36 lg:w-40 border-r border-border bg-card p-2 space-y-0.5">
            <div className="flex items-center gap-2 mb-3 px-2 pt-0.5">
              <div className="h-5 w-5 rounded bg-linear-to-br from-primary to-[#a78bfa] flex items-center justify-center">
                <Brain className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-[10px] text-foreground/80">
                BrainForge
              </span>
            </div>
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-colors ${
                  item.active
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </div>
            ))}
          </div>

          {/* Kanban area */}
          <KanbanMiniDemo controls={kanbanControls} scene={scene} />

          {/* AI Chat panel */}
          <AIMiniChatDemo controls={aiChatControls} scene={scene} />
        </div>
      </div>
    </motion.div>
  );
}
