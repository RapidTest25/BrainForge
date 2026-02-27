// components/landing/AnimatedBackground.tsx
'use client';

import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Primary orb - subtle purple glow */}
      <motion.div
        className="absolute -top-40 -right-40 w-125 h-125 sm:w-150 sm:h-150 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(123,104,238,0.08) 0%, rgba(123,104,238,0.02) 50%, transparent 70%)',
        }}
        animate={{
          x: [0, 20, -10, 0],
          y: [0, -15, 10, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary orb */}
      <motion.div
        className="absolute -bottom-40 -left-40 w-100 h-100 sm:w-125 sm:h-125 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(167,139,250,0.06) 0%, rgba(167,139,250,0.02) 50%, transparent 70%)',
        }}
        animate={{
          x: [0, -15, 20, 0],
          y: [0, 15, -10, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
