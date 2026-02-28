// components/landing/useHeroTimeline.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;

export type HeroScene = 'A' | 'B' | 'C' | 'D';

export interface HeroTimeline {
  scene: HeroScene;
  progress: number;
  floatingCards: AnimationControls;
  showcase: AnimationControls;
  kanban: AnimationControls;
  aiChat: AnimationControls;
  isRunning: boolean;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Smooth spring-like easing
const SMOOTH = [0.25, 1, 0.5, 1] as const;
const DECEL = [0, 0.55, 0.45, 1] as const;

export function useHeroTimeline(): HeroTimeline {
  const [scene, setScene] = useState<HeroScene>('A');
  const [progress, setProgress] = useState(0);
  const isRunning = useRef(true);
  const cancelled = useRef(false);

  const floatingCards = useAnimation();
  const showcase = useAnimation();
  const kanban = useAnimation();
  const aiChat = useAnimation();

  const runSequence = useCallback(async () => {
    while (isRunning.current) {
      cancelled.current = false;

      // ── Scene A: Feature cards float in (3s) ──
      setScene('A');
      setProgress(0);
      floatingCards.set({ opacity: 0, y: 30, scale: 0.95 });
      showcase.set({ opacity: 0, scale: 0.96, y: 20 });
      kanban.set({ opacity: 0 });
      aiChat.set({ opacity: 0, x: 40 });

      await floatingCards.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.7, ease: SMOOTH },
      });
      if (cancelled.current) break;
      await delay(2200);
      if (cancelled.current) break;

      // ── Scene B: Transition to workspace (3s) ──
      setScene('B');
      setProgress(0);

      await floatingCards.start({
        opacity: 0,
        scale: 0.9,
        y: -15,
        transition: { duration: 0.5, ease: DECEL },
      });
      if (cancelled.current) break;

      // Show showcase AND kanban together for visual harmony
      await Promise.all([
        showcase.start({
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.7, ease: SMOOTH },
        }),
        kanban.start({
          opacity: 1,
          transition: { duration: 0.7, ease: SMOOTH },
        }),
      ]);
      if (cancelled.current) break;
      await delay(2000);
      if (cancelled.current) break;

      // ── Scene C: Kanban cards move (4s) ──
      setScene('C');
      setProgress(0);
      await delay(4000);
      if (cancelled.current) break;

      // ── Scene D: AI chat appears (4s) ──
      setScene('D');
      setProgress(0);

      await aiChat.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.45, ease: SMOOTH },
      });
      if (cancelled.current) break;
      await delay(3500);
      if (cancelled.current) break;

      // ── Direct crossfade: D → A (no empty state) ──
      // Fade out showcase while simultaneously preparing floating cards
      floatingCards.set({ opacity: 0, y: 30, scale: 0.95 });
      await Promise.all([
        showcase.start({ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.4, ease: DECEL } }),
        aiChat.start({ opacity: 0, x: 30, transition: { duration: 0.3, ease: DECEL } }),
        kanban.start({ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }),
      ]);
      if (cancelled.current) break;
    }
  }, [floatingCards, showcase, kanban, aiChat]);

  useEffect(() => {
    isRunning.current = true;
    cancelled.current = false;
    runSequence();

    return () => {
      isRunning.current = false;
      cancelled.current = true;
    };
  }, [runSequence]);

  return {
    scene,
    progress,
    floatingCards,
    showcase,
    kanban,
    aiChat,
    isRunning: isRunning.current,
  };
}
