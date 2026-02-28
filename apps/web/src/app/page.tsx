'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  Brain, MessageSquare, GitBranch, CheckSquare,
  Calendar, Zap, FileText, ArrowRight, Shield, Globe,
  BookOpen, Heart, Users, Code, Server, Database,
  Terminal, GitPullRequest, Scale, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/landing/HeroSection';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'Tasks',
    desc: 'Organize work with kanban boards, list views, priorities, and team assignments.',
    color: '#7b68ee',
  },
  {
    icon: MessageSquare,
    title: 'AI Brainstorm',
    desc: 'Brainstorm, debate, and analyze ideas with multi-provider AI assistants.',
    color: '#22c55e',
  },
  {
    icon: GitBranch,
    title: 'Diagrams',
    desc: 'Generate flowcharts, ERDs, mind maps, architecture & sequence diagrams.',
    color: '#f59e0b',
  },
  {
    icon: Zap,
    title: 'Sprints',
    desc: 'Plan sprints with AI-generated tasks, milestones, and team allocation.',
    color: '#ef4444',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    desc: 'See tasks, events, and sprint milestones in a unified calendar view.',
    color: '#3b82f6',
  },
  {
    icon: FileText,
    title: 'Notes',
    desc: 'Write and enhance notes with AI summarization, expansion, and version history.',
    color: '#8b5cf6',
  },
];

const TECH_STACK = [
  { icon: Globe, label: 'Next.js 15', desc: 'App Router, React 19' },
  { icon: Server, label: 'Fastify 5', desc: 'High-perf API' },
  { icon: Database, label: 'PostgreSQL', desc: 'Prisma 6 ORM' },
  { icon: Brain, label: 'Multi AI', desc: 'OpenAI, Gemini, Claude' },
  { icon: Code, label: 'TypeScript', desc: 'End-to-end typed' },
  { icon: Terminal, label: 'Turborepo', desc: 'pnpm monorepo' },
];

const OSS_HIGHLIGHTS = [
  {
    icon: Shield,
    title: 'BYOK — Your Keys, Your Data',
    desc: 'Bring your own API keys. No vendor lock-in. All AI calls go directly from your server to providers.',
  },
  {
    icon: Server,
    title: 'Self-Hostable',
    desc: 'Deploy on your own infrastructure. Docker support included. Full control over your data and privacy.',
  },
  {
    icon: Scale,
    title: 'MIT Licensed',
    desc: 'Use, modify, and distribute freely. No restrictions on commercial use. Read the full license on GitHub.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    desc: 'Open issues, submit PRs, and shape the roadmap. Every contribution matters.',
  },
];

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

      {/* Open Source Highlights */}
      <section className="px-6 py-8 sm:py-10 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-3 border border-emerald-500/15">
              <Heart className="h-3 w-3" />
              Open Source
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
              Free &amp; open source, forever
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              No hidden costs. No vendor lock-in. Full transparency. MIT licensed.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {OSS_HIGHLIGHTS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: SMOOTH }}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center mb-2.5">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1 text-foreground">{item.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-8 sm:py-10 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
              Everything your team needs
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              All the tools you use — unified in one workspace, enhanced with AI.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: SMOOTH }}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-border transition-all duration-200"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center mb-2.5"
                  style={{ backgroundColor: `${f.color}12` }}
                >
                  <f.icon className="h-4 w-4" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold mb-1 text-foreground">{f.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-6 py-8 sm:py-10 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
              Built with modern tech
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Fully typed monorepo with best-in-class tools at every layer.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TECH_STACK.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: SMOOTH }}
                className="bg-card rounded-lg border border-border p-3 text-center hover:border-primary/20 transition-colors"
              >
                <t.icon className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start / CTA */}
      <section className="px-6 py-8 sm:py-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
              Get started in minutes
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Clone, configure, and deploy. No credit card required.
            </p>
          </motion.div>

          {/* Terminal-style quick start */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: SMOOTH }}
            className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden mb-6"
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              <span className="ml-2 text-[11px] text-zinc-500 font-mono">terminal</span>
            </div>
            <div className="p-4 font-mono text-[12px] sm:text-[13px] leading-relaxed">
              <p className="text-zinc-500"># Clone the repository</p>
              <p className="text-emerald-400">$ git clone https://github.com/RapidTest25/BrainForge.git</p>
              <p className="text-zinc-500 mt-2"># Install dependencies</p>
              <p className="text-emerald-400">$ cd BrainForge &amp;&amp; pnpm install</p>
              <p className="text-zinc-500 mt-2"># Configure environment</p>
              <p className="text-emerald-400">$ cp apps/api/.env.example apps/api/.env</p>
              <p className="text-zinc-500 mt-2"># Setup database &amp; start</p>
              <p className="text-emerald-400">$ pnpm db:push &amp;&amp; pnpm dev</p>
            </div>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button className="h-10 px-7 text-sm bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg gap-2 shadow-md shadow-[#7b68ee]/20">
                Try Live Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="h-10 px-7 text-sm rounded-lg gap-2 border-border">
                <BookOpen className="h-4 w-4" />
                Read Docs
              </Button>
            </a>
            <a
              href="https://github.com/RapidTest25/BrainForge/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="h-10 px-7 text-sm rounded-lg gap-2 border-border">
                <GitPullRequest className="h-4 w-4" />
                Contribute
              </Button>
            </a>
          </div>
        </div>
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
