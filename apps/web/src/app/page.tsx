'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  Brain, CheckSquare, MessageSquare, GitBranch, Calendar,
  Zap, Bot, ArrowRight, Sparkles, Key, Shield, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/landing/HeroSection';

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'Task Management',
    description: 'Kanban boards, list views, sprints, and milestones. Track everything in one place.',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/10',
  },
  {
    icon: MessageSquare,
    title: 'AI Brainstorming',
    description: 'Real-time collaborative brainstorming powered by multiple AI providers.',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-500',
    borderColor: 'border-violet-500/10',
  },
  {
    icon: GitBranch,
    title: 'Smart Diagrams',
    description: 'Auto-generate ERD, flowcharts, architecture, sequence, and mind maps with AI.',
    gradient: 'from-emerald-500/10 to-green-500/10',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/10',
  },
  {
    icon: Calendar,
    title: 'Calendar & Sprints',
    description: 'Plan sprints, set deadlines, and visualize your team timeline effortlessly.',
    gradient: 'from-orange-500/10 to-amber-500/10',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-500/10',
  },
  {
    icon: Bot,
    title: 'AI Chat Assistant',
    description: 'Built-in AI assistant for coding help, writing, and project context Q&A.',
    gradient: 'from-pink-500/10 to-rose-500/10',
    iconColor: 'text-pink-500',
    borderColor: 'border-pink-500/10',
  },
  {
    icon: Zap,
    title: 'BYOK — Bring Your Own Key',
    description: 'Use your own API keys for OpenAI, Anthropic, Google, and more. No vendor lock-in.',
    gradient: 'from-yellow-500/10 to-amber-500/10',
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/10',
  },
];

const HIGHLIGHTS = [
  { icon: Key, label: 'BYOK', desc: 'Use your own API keys' },
  { icon: Shield, label: 'Self-hosted', desc: 'Full data ownership' },
  { icon: Globe, label: 'Open Source', desc: 'MIT licensed, forever free' },
  { icon: Sparkles, label: 'AI Powered', desc: 'Multiple AI providers' },
];

const SMOOTH = [0.25, 1, 0.5, 1] as const;

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (isAuthenticated) router.push('/dashboard'); }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-card text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">BrainForge</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              Star
            </a>
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-[13px] bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Highlights bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: SMOOTH }}
              >
                <div className="h-9 w-9 rounded-lg bg-[#7b68ee]/10 flex items-center justify-center shrink-0">
                  <h.icon className="h-4.5 w-4.5 text-[#7b68ee]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.label}</p>
                  <p className="text-xs text-muted-foreground">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: SMOOTH }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Replace scattered tools with one unified workspace. Every feature works together seamlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`group relative p-6 rounded-2xl border ${feature.borderColor} bg-linear-to-br ${feature.gradient} hover:shadow-lg transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: SMOOTH }}
              >
                <div className={`h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 px-6 bg-muted/20 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: SMOOTH }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Get started in minutes
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              No complex setup. No credit card. Just sign up and start building.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up free with email or Google. Your workspace is ready instantly.' },
              { step: '02', title: 'Add Your API Keys', desc: 'Bring your own OpenAI, Anthropic, or Google keys. Pay providers directly.' },
              { step: '03', title: 'Build with AI', desc: 'Create tasks, generate diagrams, brainstorm ideas — all with AI assistance.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative text-center md:text-left"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: SMOOTH }}
              >
                <div className="inline-flex h-12 w-12 rounded-full bg-[#7b68ee]/10 items-center justify-center mb-4">
                  <span className="text-lg font-bold text-[#7b68ee]">{item.step}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-6 -right-4 w-8 text-muted-foreground/30">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: SMOOTH }}
        >
          <div className="inline-flex h-14 w-14 rounded-2xl bg-linear-to-br from-[#7b68ee]/15 to-[#a78bfa]/10 items-center justify-center mb-5">
            <Sparkles className="h-6 w-6 text-[#7b68ee]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to replace your scattered tools?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-8">
            Join teams who switched to BrainForge for a simpler, AI-powered workflow. Free and open source.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button className="h-11 px-8 text-sm bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg gap-2 shadow-md shadow-[#7b68ee]/20 transition-all hover:shadow-lg hover:shadow-[#7b68ee]/25">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/RapidTest25/BrainForge" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-11 px-7 text-sm rounded-lg gap-2 border-border text-foreground/80 hover:bg-accent">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                View on GitHub
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
                <Brain className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">BrainForge</span>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">MIT</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a
                href="https://github.com/RapidTest25/BrainForge"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                GitHub
              </a>
              <a
                href="https://github.com/RapidTest25/BrainForge/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                License
              </a>
              <a
                href="https://github.com/RapidTest25/BrainForge/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Contributing
              </a>
              <a
                href="https://github.com/RapidTest25/BrainForge/blob/main/SECURITY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Security
              </a>
            </div>
          </div>
          <div className="text-center mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} BrainForge Contributors. Released under the MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
