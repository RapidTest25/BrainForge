// components/landing/FloatingFeatureCards.tsx
'use client';

import { motion, useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;
import { CheckSquare, MessageSquare, GitBranch, Calendar } from 'lucide-react';

interface FloatingFeatureCardsProps {
  controls: AnimationControls;
}

const CARDS = [
  {
    icon: CheckSquare,
    title: 'Tasks',
    desc: 'Boards, lists & sprints',
    color: '#7b68ee',
  },
  {
    icon: MessageSquare,
    title: 'Brainstorm',
    desc: 'AI-powered ideation',
    color: '#22c55e',
  },
  {
    icon: GitBranch,
    title: 'Diagrams',
    desc: 'Flowcharts & ERDs',
    color: '#f59e0b',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    desc: 'Unified schedule view',
    color: '#3b82f6',
  },
];

export function FloatingFeatureCards({ controls }: FloatingFeatureCardsProps) {
  return (
    <motion.div
      animate={controls}
      className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm sm:max-w-md mx-auto px-2 sm:px-4"
    >
      {CARDS.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{
            opacity: 1,
            y: [0, -4, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.5, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] as const },
            y: {
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            },
            scale: { duration: 0.5, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] as const },
          }}
          whileHover={{ scale: 1.03, y: -2 }}
          className="group"
        >
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: `${card.color}12` }}
            >
              <card.icon
                className="h-4 w-4"
                style={{ color: card.color }}
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">
              {card.title}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {card.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
