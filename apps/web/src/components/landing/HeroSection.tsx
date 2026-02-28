// components/landing/HeroSection.tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AnimatedBackground } from './AnimatedBackground';
import { FloatingFeatureCards } from './FloatingFeatureCards';
import { ProductShowcase } from './ProductShowcase';
import { useHeroTimeline } from './useHeroTimeline';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

export default function HeroSection() {
  const { scene, floatingCards, showcase, kanban, aiChat } = useHeroTimeline();

  return (
    <section className="relative pt-18 sm:pt-22 pb-6 sm:pb-8 px-4 sm:px-6 overflow-hidden">
      <AnimatedBackground />

      <div className="relative max-w-5xl mx-auto">
        {/* Text block */}
        <div className="text-center mb-5 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: SMOOTH }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium mb-3 sm:mb-4 border border-primary/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Free &middot; Open Source &middot; BYOK
            </div>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.1] mb-2 sm:mb-3 text-foreground"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: SMOOTH }}
          >
            One app to replace
            <br />
            <span className="bg-linear-to-r from-primary to-[#a78bfa] bg-clip-text text-transparent">
              them all.
            </span>
          </motion.h1>

          <motion.p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4 sm:mb-5 leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: 'easeOut' }}
          >
            Tasks, brainstorming, diagrams, sprints, calendar, and notes —
            all powered by AI, in one workspace.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: 'easeOut' }}
          >
            <Link href="/register">
              <Button className="h-11 px-8 text-sm bg-primary hover:bg-[#6c5ce7] text-white rounded-lg gap-2 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="h-11 px-7 text-sm rounded-lg gap-2 border-border text-foreground/80 hover:bg-accent"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Star on GitHub
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Animated showcase area - responsive, single layout */}
        <div className="relative min-h-60 sm:min-h-65 md:min-h-75">
          {/* Scene A: Floating feature cards */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              opacity: scene === 'A' ? 1 : 0,
              pointerEvents: scene === 'A' ? 'auto' as const : 'none' as const,
              zIndex: scene === 'A' ? 10 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <FloatingFeatureCards controls={floatingCards} />
          </motion.div>

          {/* Scene B-E: Product showcase (responsive — works on all screen sizes) */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center px-0 sm:px-2"
            animate={{
              opacity: scene === 'A' ? 0 : 1,
              pointerEvents: scene === 'A' ? 'none' as const : 'auto' as const,
              zIndex: scene === 'A' ? 0 : 10,
            }}
            transition={{ duration: 0.3 }}
          >
            <ProductShowcase
              showcaseControls={showcase}
              kanbanControls={kanban}
              aiChatControls={aiChat}
              scene={scene}
            />
          </motion.div>
        </div>

        {/* Scene indicator — only show 4 main scenes (E is just a quick transition) */}
        <div className="flex items-center justify-center gap-1.5 mt-2 sm:mt-3">
          {(['A', 'B', 'C', 'D'] as const).map((s) => (
            <motion.div
              key={s}
              className="h-1 sm:h-1.5 rounded-full bg-primary"
              animate={{
                width: scene === s ? 18 : 6,
                opacity: scene === s ? 1 : 0.2,
              }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
