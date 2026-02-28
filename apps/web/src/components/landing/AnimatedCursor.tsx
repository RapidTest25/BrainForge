// components/landing/AnimatedCursor.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { HeroScene } from './useHeroTimeline';

interface AnimatedCursorProps {
  scene: HeroScene;
}

/**
 * Fake mouse cursor that moves around the ProductShowcase
 * to simulate user interaction during scenes B-D.
 *
 * Positions are in percentages relative to the showcase container.
 */
const CURSOR_KEYFRAMES: Record<string, { x: string; y: string; click?: boolean }[]> = {
  B: [
    { x: '50%', y: '50%' },       // center
    { x: '8%', y: '42%' },        // sidebar "Tasks"
    { x: '8%', y: '42%', click: true },
    { x: '22%', y: '38%' },       // move toward first kanban card
  ],
  C: [
    { x: '22%', y: '38%' },       // start where B ended
    { x: '22%', y: '42%' },       // first kanban card
    { x: '22%', y: '42%', click: true },
    { x: '42%', y: '38%' },       // drag to "In Progress"
    { x: '42%', y: '38%', click: true },
    { x: '65%', y: '35%' },       // hover review column
    { x: '78%', y: '50%' },       // move toward AI chat area
  ],
  D: [
    { x: '78%', y: '50%' },       // start where C ended
    { x: '80%', y: '82%' },       // AI chat input
    { x: '80%', y: '82%', click: true },
    { x: '80%', y: '55%' },       // scroll up on chat
    { x: '78%', y: '40%' },       // hover AI response
  ],
};

const SMOOTH = [0.4, 0, 0.2, 1] as const;

export function AnimatedCursor({ scene }: AnimatedCursorProps) {
  const visible = scene === 'B' || scene === 'C' || scene === 'D';
  const keyframes = CURSOR_KEYFRAMES[scene] || [];

  return (
    <AnimatePresence>
      {visible && keyframes.length > 0 && (
        <motion.div
          key={scene}
          className="absolute z-50 pointer-events-none"
          initial={{
            left: keyframes[0].x,
            top: keyframes[0].y,
            opacity: 0,
            scale: 0.6,
          }}
          animate={{
            left: keyframes.map((k) => k.x),
            top: keyframes.map((k) => k.y),
            opacity: 1,
            scale: keyframes.map((k) => (k.click ? 0.85 : 1)),
          }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
          transition={{
            left: {
              duration: scene === 'C' ? 3.6 : scene === 'D' ? 3.0 : 2.5,
              ease: SMOOTH,
              times: keyframes.map((_, i) => i / (keyframes.length - 1)),
            },
            top: {
              duration: scene === 'C' ? 3.6 : scene === 'D' ? 3.0 : 2.5,
              ease: SMOOTH,
              times: keyframes.map((_, i) => i / (keyframes.length - 1)),
            },
            scale: {
              duration: scene === 'C' ? 3.6 : scene === 'D' ? 3.0 : 2.5,
              ease: SMOOTH,
              times: keyframes.map((_, i) => i / (keyframes.length - 1)),
            },
            opacity: { duration: 0.3 },
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="18"
            height="22"
            viewBox="0 0 18 22"
            fill="none"
            className="drop-shadow-md"
          >
            <path
              d="M1.5 1L1.5 16.5L5.5 12.5L9.5 20L12.5 18.5L8.5 11L14 11L1.5 1Z"
              fill="white"
              stroke="black"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          {/* Click ripple */}
          <motion.div
            className="absolute -top-1 -left-1 h-5 w-5 rounded-full border-2 border-primary/50"
            animate={{
              scale: keyframes.map((k) => (k.click ? 1.8 : 0)),
              opacity: keyframes.map((k) => (k.click ? 0.5 : 0)),
            }}
            transition={{
              duration: scene === 'C' ? 3.6 : scene === 'D' ? 3.0 : 2.5,
              ease: 'easeOut',
              times: keyframes.map((_, i) => i / (keyframes.length - 1)),
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
