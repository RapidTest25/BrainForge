// components/landing/KanbanMiniDemo.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;
import type { HeroScene } from './useHeroTimeline';

interface KanbanMiniDemoProps {
  controls: AnimationControls;
  scene: HeroScene;
}

interface KanbanCard {
  id: string;
  title: string;
  avatar: string;
  color: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', dot: '#9ca3af' },
  { id: 'progress', title: 'In Progress', dot: '#3b82f6' },
  { id: 'review', title: 'Review', dot: '#f59e0b' },
  { id: 'done', title: 'Done', dot: '#22c55e' },
];

const INITIAL_CARDS: Record<string, KanbanCard[]> = {
  todo: [
    { id: 'c1', title: 'Design system setup', avatar: 'T', color: '#7b68ee' },
    { id: 'c2', title: 'API documentation', avatar: 'M', color: '#3b82f6' },
    { id: 'c3', title: 'User testing plan', avatar: 'A', color: '#22c55e' },
  ],
  progress: [
    { id: 'c4', title: 'Dashboard redesign', avatar: 'T', color: '#7b68ee' },
    { id: 'c5', title: 'Auth integration', avatar: 'J', color: '#f59e0b' },
  ],
  review: [
    { id: 'c6', title: 'Landing page', avatar: 'M', color: '#3b82f6' },
  ],
  done: [
    { id: 'c7', title: 'Project setup', avatar: 'T', color: '#7b68ee' },
    { id: 'c8', title: 'Database schema', avatar: 'A', color: '#22c55e' },
  ],
};

const MOVES = [
  { cardId: 'c1', from: 'todo', to: 'progress', delayMs: 600 },
  { cardId: 'c6', from: 'review', to: 'done', delayMs: 2200 },
];

export function KanbanMiniDemo({ controls, scene }: KanbanMiniDemoProps) {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [movingCard, setMovingCard] = useState<string | null>(null);

  useEffect(() => {
    if (scene === 'A') {
      setCards(INITIAL_CARDS);
      setMovingCard(null);
    }
  }, [scene]);

  useEffect(() => {
    if (scene !== 'C') return;
    const timeouts: NodeJS.Timeout[] = [];

    MOVES.forEach(({ cardId, from, to, delayMs }) => {
      const t = setTimeout(() => {
        setMovingCard(cardId);
        setTimeout(() => {
          setCards((prev) => {
            const card = prev[from].find((c) => c.id === cardId);
            if (!card) return prev;
            return {
              ...prev,
              [from]: prev[from].filter((c) => c.id !== cardId),
              [to]: [card, ...prev[to]],
            };
          });
          setMovingCard(null);
        }, 400);
      }, delayMs);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [scene]);

  return (
    <motion.div animate={controls} className="flex-1 p-2 sm:p-2.5 flex gap-1.5 sm:gap-2 overflow-hidden">
      {COLUMNS.map((col, colIdx) => (
        <div key={col.id} className={`flex-1 min-w-0 ${colIdx === 2 ? 'hidden sm:block' : ''}`}>
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 px-0.5 sm:px-1">
            <div
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: col.dot }}
            />
            <span className="text-[8px] sm:text-[10px] font-medium text-foreground/70 truncate">{col.title}</span>
            <span className="text-[7px] sm:text-[9px] text-muted-foreground bg-muted px-1 rounded ml-auto shrink-0">
              {cards[col.id].length}
            </span>
          </div>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {cards[col.id].map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{
                    opacity: movingCard === card.id ? 0.5 : 1,
                    scale: movingCard === card.id ? 1.04 : 1,
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.88, y: -4 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 1, 0.5, 1] as const,
                    layout: { duration: 0.3, ease: [0.25, 1, 0.5, 1] as const },
                  }}
                  className={`bg-card rounded-md border p-1.5 sm:p-2 cursor-default transition-colors ${
                    movingCard === card.id ? 'border-primary/30 shadow-sm' : 'border-border'
                  }`}
                >
                  <p className="text-[8px] sm:text-[10px] text-foreground/80 font-medium leading-tight truncate">
                    {card.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <div
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <span
                        className="text-[6px] sm:text-[7px] font-bold"
                        style={{ color: card.color }}
                      >
                        {card.avatar}
                      </span>
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-muted-foreground">2d</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
