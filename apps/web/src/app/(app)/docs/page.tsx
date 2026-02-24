'use client';

import { useState } from 'react';
import {
  BookOpen, CheckSquare, MessageSquare, GitBranch, Zap, Calendar, FileText,
  Settings, Users, Key, Target, Bell, ChevronRight, Search, ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: 'Getting Started',
    color: '#7b68ee',
    content: [
      {
        title: 'Welcome to BrainForge',
        body: 'BrainForge is an all-in-one AI-powered project management workspace. It combines tasks, brainstorming, diagrams, sprints, calendar, and notes into a single platform. You can use your own API keys (BYOK) for AI features.',
      },
      {
        title: 'Creating an Account',
        body: 'Click "Get Started Free" on the landing page. Fill in your name, email, and password. After registration, a personal team is automatically created for you.',
      },
      {
        title: 'Setting Up AI Keys',
        body: 'Navigate to Settings → AI Keys to configure your AI providers. BrainForge supports OpenAI, Google Gemini, Anthropic, and more. Enter your API key for the provider you want to use. Keys are encrypted and stored securely.',
      },
      {
        title: 'Team Setup',
        body: 'Go to Settings → Team to manage your team. You can invite members via email or generate a shareable invite link. Team members can be assigned roles: Owner, Admin, or Member.',
      },
    ],
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    title: 'Tasks',
    color: '#7b68ee',
    content: [
      {
        title: 'Overview',
        body: 'Tasks are the core unit of work in BrainForge. You can view tasks in Board view (Kanban-style columns) or List view (table format). Tasks have statuses: To Do, In Progress, In Review, and Done.',
      },
      {
        title: 'Creating Tasks',
        body: 'Click the "+ New Task" button or use the "+ Add task" button in any board column. Set a title, description, priority (Urgent, High, Medium, Low), and optionally assign to a sprint.',
      },
      {
        title: 'Managing Tasks',
        body: 'Use the 3-dot menu (⋯) on each task card to: Move to a different status column, Change priority, Mark as Done, or Delete the task. In list view, you can also change status directly.',
      },
    ],
  },
  {
    id: 'brainstorm',
    icon: MessageSquare,
    title: 'AI Brainstorm',
    color: '#22c55e',
    content: [
      {
        title: 'Overview',
        body: 'AI Brainstorm sessions let you have interactive conversations with AI assistants. Choose from four modes: Brainstorm (free-form idea generation), Debate (explore pros and cons), Analysis (deep-dive into topics), and Freeform (general AI chat).',
      },
      {
        title: 'Creating a Session',
        body: 'Click "New Session" and choose a mode. Give your session a title and optional context. Once created, you can send messages and the AI will respond based on the selected mode and your configured AI provider.',
      },
      {
        title: 'Tips',
        body: 'Provide context when creating a session to get better responses. You can create multiple sessions for different topics. Sessions are saved and can be revisited anytime.',
      },
    ],
  },
  {
    id: 'diagrams',
    icon: GitBranch,
    title: 'Diagrams',
    color: '#f59e0b',
    content: [
      {
        title: 'Overview',
        body: 'Create visual diagrams to map out your project architecture, workflows, and data models. Supported types: ERD, Flowchart, Architecture, Sequence, Mind Map, User Flow, Freeform, and Component diagrams.',
      },
      {
        title: 'Manual Creation',
        body: 'Click "Create" to make a new diagram. Choose a type and give it a title. The diagram editor displays nodes and edges that you can customize.',
      },
      {
        title: 'AI Generation',
        body: 'Click "AI Generate" to create a diagram from a text description. Describe what you want (e.g., "E-commerce database schema") and the AI will generate nodes and edges automatically.',
      },
    ],
  },
  {
    id: 'sprints',
    icon: Zap,
    title: 'Sprints',
    color: '#ef4444',
    content: [
      {
        title: 'Overview',
        body: 'Sprints help you plan and track work in time-boxed iterations. Each sprint has a title, goal, deadline, and team size. Tasks can be assigned to sprints for focused execution.',
      },
      {
        title: 'Creating Sprints',
        body: 'Use "Create Sprint" for manual creation or "AI Generate" to have AI plan a sprint with tasks and milestones based on your project description.',
      },
      {
        title: 'Sprint Lifecycle',
        body: 'Sprints go through stages: Draft → Active → Completed → Archived. Start a sprint to begin tracking, and complete it when the iteration is done.',
      },
    ],
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Calendar',
    color: '#3b82f6',
    content: [
      {
        title: 'Overview',
        body: 'The Calendar provides a unified view of all your tasks, events, and sprint milestones. See deadlines, scheduled sessions, and custom events in one place.',
      },
      {
        title: 'Creating Events',
        body: 'Click on any date to create a new event. Set the title, type, date/time, and optional description. Events can be linked to tasks or sprints.',
      },
    ],
  },
  {
    id: 'notes',
    icon: FileText,
    title: 'Notes',
    color: '#8b5cf6',
    content: [
      {
        title: 'Overview',
        body: 'Notes provide a rich text editor for capturing ideas, meeting notes, and documentation. Notes support AI enhancement features like summarization and expansion.',
      },
      {
        title: 'AI Features',
        body: 'Use AI to summarize long notes, expand on brief ideas, or improve the writing quality. Select text and use the AI actions menu to apply transformations.',
      },
    ],
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Goals',
    color: '#10b981',
    content: [
      {
        title: 'Overview',
        body: 'Goals help you set and track high-level objectives. Define measurable goals, track progress, and link them to tasks and sprints for accountability.',
      },
    ],
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Management',
    color: '#6366f1',
    content: [
      {
        title: 'Inviting Members',
        body: 'Go to Settings → Team and click "Invite". You can invite via email or generate a shareable invite link. Links expire in 7 days and can be used by anyone to join.',
      },
      {
        title: 'Roles & Permissions',
        body: 'Owner: Full control, including deleting the team. Admin: Can manage members and settings. Member: Can create and manage their own work items.',
      },
    ],
  },
  {
    id: 'ai-keys',
    icon: Key,
    title: 'AI Configuration',
    color: '#f59e0b',
    content: [
      {
        title: 'Supported Providers',
        body: 'BrainForge supports multiple AI providers: OpenAI (GPT-4, GPT-3.5), Google Gemini, Anthropic (Claude), and more. You bring your own API keys (BYOK).',
      },
      {
        title: 'Configuring Keys',
        body: 'Navigate to Settings → AI Keys. Click "Add Key" and enter your provider and API key. Keys are encrypted before storage. You can set a default provider for all AI features.',
      },
    ],
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.content.some(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase()))
      )
    : SECTIONS;

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="max-w-6xl mx-auto flex gap-6 min-h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 hidden lg:block">
        <div className="sticky top-20 space-y-1">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[13px] bg-white border-gray-200"
              />
            </div>
          </div>
          {filtered.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSearch(''); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                  activeSection === section.id
                    ? 'bg-[#7b68ee]/8 text-[#7b68ee]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {section.title}
              </button>
            );
          })}
          <div className="pt-4 border-t border-gray-100 mt-4">
            <a
              href="https://github.com/RapidTest25/BrainForge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub Repository
            </a>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile section selector */}
        <div className="lg:hidden mb-4">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white"
          >
            {SECTIONS.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            {(() => {
              const Icon = currentSection.icon;
              return (
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentSection.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: currentSection.color }} />
                </div>
              );
            })()}
            <div>
              <h1 className="text-xl font-semibold text-[#1a1a2e]">{currentSection.title}</h1>
              <p className="text-sm text-gray-400">Documentation</p>
            </div>
          </div>

          {currentSection.content.map((item, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="text-base font-semibold text-[#1a1a2e] mb-3 flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-[#7b68ee]" />
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
