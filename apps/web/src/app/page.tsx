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
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#1a1a2e]">BrainForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-100 transition-colors"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] text-gray-600">Log in</Button>
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
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7b68ee]/8 text-[#7b68ee] text-xs font-medium mb-6 border border-[#7b68ee]/15">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7b68ee]" />
            Free &middot; Open Source &middot; BYOK
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.1] mb-5 text-[#1a1a2e]">
            One app to replace
            <br />them all.
          </h1>

          <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
            Tasks, brainstorming, diagrams, sprints, calendar, and notes —
            all powered by AI, in one workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button className="h-11 px-7 text-sm bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg gap-2 shadow-md shadow-[#7b68ee]/20">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/RapidTest25/BrainForge" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-11 px-7 text-sm rounded-lg gap-2 border-gray-200 text-gray-700 hover:bg-gray-50">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                Star on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-gray-200/60">
            {/* Tab bar */}
            <div className="flex items-center gap-0 px-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-1.5 px-3 py-2 mr-4">
                <div className="flex gap-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
              </div>
              {['List', 'Board', 'Calendar'].map((tab, i) => (
                <button key={tab} className={`px-3 py-2.5 text-xs font-medium border-b-2 ${i === 1 ? 'border-[#7b68ee] text-[#7b68ee]' : 'border-transparent text-gray-400'}`}>
                  {tab}
                </button>
              ))}
            </div>
            {/* Board preview */}
            <div className="flex h-[320px] bg-gray-50/40">
              {/* Sidebar mini */}
              <div className="w-44 border-r border-gray-100 bg-white p-2.5 space-y-0.5 hidden md:block">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
                    <Brain className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-semibold text-[11px] text-[#1a1a2e]">BrainForge</span>
                </div>
                {[
                  { label: 'Home', active: false },
                  { label: 'Tasks', active: true },
                  { label: 'Brainstorm', active: false },
                  { label: 'Diagrams', active: false },
                  { label: 'Calendar', active: false },
                  { label: 'Sprints', active: false },
                ].map((item) => (
                  <div key={item.label} className={`px-2 py-1 rounded text-[11px] ${item.active ? 'bg-[#7b68ee]/8 text-[#7b68ee] font-medium' : 'text-gray-400'}`}>
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Board columns */}
              <div className="flex-1 p-3 flex gap-3 overflow-hidden">
                {[
                  { title: 'To Do', count: 3, color: '#9ca3af', items: ['Design system setup', 'API documentation', 'User testing plan'] },
                  { title: 'In Progress', count: 2, color: '#3b82f6', items: ['Dashboard redesign', 'Auth integration'] },
                  { title: 'In Review', count: 1, color: '#f59e0b', items: ['Landing page'] },
                  { title: 'Done', count: 4, color: '#22c55e', items: ['Project setup', 'Database schema', 'CI/CD pipeline', 'Onboarding flow'] },
                ].map((col) => (
                  <div key={col.title} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-[11px] font-medium text-gray-700">{col.title}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">{col.count}</span>
                    </div>
                    <div className="space-y-1.5">
                      {col.items.map((item) => (
                        <div key={item} className="bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm">
                          <p className="text-[11px] text-gray-700 font-medium">{item}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="h-4 w-4 rounded-full bg-[#7b68ee]/15 flex items-center justify-center">
                              <span className="text-[8px] text-[#7b68ee] font-bold">T</span>
                            </div>
                            <span className="text-[9px] text-gray-400">2d ago</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-[#1a1a2e]">
              Everything your team needs
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              All the tools you use — unified in one workspace, enhanced with AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${f.color}12` }}
                >
                  <f.icon className="h-4.5 w-4.5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold mb-1 text-[#1a1a2e]">{f.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-[#1a1a2e]">
            Ready to get started?
          </h2>
          <p className="text-gray-500 mb-8 text-base">
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
      <footer className="border-t border-gray-100 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#1a1a2e]">BrainForge</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} BrainForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
