'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  Brain, MessageSquare, GitBranch, CheckSquare,
  Calendar, Zap, FileText, ArrowRight, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/landing/HeroSection';

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'Tasks',
    desc: 'Organize work with boards, lists, priorities, and assignments.',
    color: '#7b68ee',
  },
  {
    icon: MessageSquare,
    title: 'AI Brainstorm',
    desc: 'Brainstorm, debate, and analyze ideas with AI assistants.',
    color: '#22c55e',
  },
  {
    icon: GitBranch,
    title: 'Diagrams',
    desc: 'Generate flowcharts, ERDs, and mind maps from prompts.',
    color: '#f59e0b',
  },
  {
    icon: Zap,
    title: 'Sprints',
    desc: 'Plan sprints with AI-generated tasks and milestones.',
    color: '#ef4444',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    desc: 'See tasks, events, and sprints in a unified calendar.',
    color: '#3b82f6',
  },
  {
    icon: FileText,
    title: 'Notes',
    desc: 'Write and enhance notes with AI summarization and expansion.',
    color: '#8b5cf6',
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">BrainForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-[13px] bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Features */}
      <section className="px-6 py-20 bg-muted/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
              Everything your team needs
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              All the tools you use — unified in one workspace, enhanced with AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-border transition-all duration-200"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${f.color}12` }}
                >
                  <f.icon className="h-4.5 w-4.5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold mb-1 text-foreground">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 text-base">
            Free forever. Bring your own API keys. No credit card required.
          </p>
          <Link href="/register">
            <Button className="h-11 px-8 text-sm bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg gap-2 shadow-md shadow-[#7b68ee]/20">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">BrainForge</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BrainForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
