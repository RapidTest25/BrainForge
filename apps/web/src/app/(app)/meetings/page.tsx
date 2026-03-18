'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  Plus,
  Loader2,
  Search,
  ChevronRight,
  ArrowLeft,
  Trash2,
  MoreVertical,
  Mic,
  MicOff,
  Clock,
  Calendar as CalendarIcon,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Link2,
  Play,
  Square,
  FileText,
  ListChecks,
  ChevronDown,
  Eye,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

const ACCENT = '#10b981'; // emerald-500
const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];
const EXTENSION_PING_TIMEOUT_MS = 1200;
const EXTENSION_CONNECT_TIMEOUT_MS = 2200;
const LATEST_EXTENSION_VERSION = '1.0.6';

type ExtensionInstallState = 'checking' | 'installed' | 'missing';
type ExtensionConnectionState = 'syncing' | 'ready' | 'needs-connection';

const MEETINGS_REFETCH_INTERVAL_MS = 8000;
const LIVE_SYNC_WINDOW_MS = 2 * 60 * 1000;

function compareSemver(a?: string | null, b?: string | null) {
  const aParts = (a || '0.0.0').split('.').map((part) => Number(part) || 0);
  const bParts = (b || '0.0.0').split('.').map((part) => Number(part) || 0);
  const max = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < max; i += 1) {
    const left = aParts[i] || 0;
    const right = bParts[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
}

function normalizeMeetLink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^meet\.google\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function extractNextGoals(summary?: string | null, actionItems?: any): string[] {
  const goals = new Set<string>();

  if (Array.isArray(actionItems)) {
    actionItems
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 4)
      .forEach((item) => goals.add(item));
  }

  if (summary) {
    const lines = summary.split('\n').map((line) => line.trim());
    let nextSectionStart = -1;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].toLowerCase();
      if (
        line.includes('next step') ||
        line.includes('next action') ||
        line.includes('tujuan selanjutnya') ||
        line.includes('langkah selanjutnya')
      ) {
        nextSectionStart = i;
        break;
      }
    }

    if (nextSectionStart >= 0) {
      for (let i = nextSectionStart + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line) {
          if (goals.size > 0) break;
          continue;
        }

        if (/^#{1,6}\s/.test(line)) break;

        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet?.[1]) {
          goals.add(bullet[1].trim());
        } else if (goals.size < 4 && !line.startsWith('>')) {
          goals.add(line.replace(/^\d+\.\s+/, '').trim());
        }

        if (goals.size >= 4) break;
      }
    }
  }

  return Array.from(goals).slice(0, 4);
}

function isRecentlyUpdated(timestamp?: string | null): boolean {
  if (!timestamp) return false;
  const updatedAt = new Date(timestamp).getTime();
  if (Number.isNaN(updatedAt)) return false;
  return Date.now() - updatedAt <= LIVE_SYNC_WINDOW_MS;
}

function compactText(input?: string | null): string {
  return (input || '').replace(/\s+/g, ' ').trim();
}

function stripMarkdownForPreview(input?: string | null): string {
  return compactText(input)
    .replace(/^#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[-*]\s+/g, '');
}

function isExtensionMeeting(meeting: any): boolean {
  const description = String(meeting?.description || '').toLowerCase();
  const title = String(meeting?.title || '').toLowerCase();
  const meetLink = String(meeting?.meetLink || '').toLowerCase();

  return (
    description.includes('brainforge extension') ||
    description.includes('google meet') ||
    title.startsWith('meet recording -') ||
    meetLink.includes('meet.google.com')
  );
}

function getSmartMeetingTitle(meeting: any): string {
  const title = compactText(meeting?.title);
  if (!title) return 'Untitled meeting';

  if (!/^meet\s+recording\s*-\s*/i.test(title) || !meeting?.summary) {
    return title;
  }

  const firstLine = meeting.summary
    .split('\n')
    .map((line: string) => stripMarkdownForPreview(line))
    .find((line: string) => line.length >= 12 && !/^summary:?$/i.test(line) && !/^ringkasan:?$/i.test(line));

  if (!firstLine) return title;
  return firstLine.length > 84 ? `${firstLine.slice(0, 81).trimEnd()}...` : firstLine;
}

function getMeetingPreview(meeting: any): string {
  const summaryLine = stripMarkdownForPreview(meeting?.summary)
    .split(/\.(\s+|$)/)
    .map((part) => part.trim())
    .find((part) => part.length > 24);
  if (summaryLine) {
    return summaryLine.length > 170 ? `${summaryLine.slice(0, 167).trimEnd()}...` : summaryLine;
  }

  const desc = compactText(meeting?.description);
  if (desc) {
    return desc.length > 170 ? `${desc.slice(0, 167).trimEnd()}...` : desc;
  }

  const transcriptSnippet = compactText(meeting?.transcript);
  if (transcriptSnippet) {
    return transcriptSnippet.length > 170
      ? `${transcriptSnippet.slice(0, 167).trimEnd()}...`
      : transcriptSnippet;
  }

  return 'No detailed notes yet. Start recording from extension or add meeting notes.';
}

function getTranscriptWordCount(transcript?: string | null): number {
  const clean = compactText(transcript);
  if (!clean) return 0;
  return clean.split(' ').filter(Boolean).length;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Scheduled', color: '#3b82f6', bg: 'bg-blue-500/10' },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-500/10' },
  COMPLETED: { label: 'Completed', color: '#10b981', bg: 'bg-emerald-500/10' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: 'bg-gray-500/10' },
};

// ── Markdown renderer ──
function renderMarkdown(text: string): string {
  if (!text) return '';
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    const langLabel = lang
      ? '<div class="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider"><span>' +
        lang +
        '</span></div>'
      : '';
    codeBlocks.push(
      '<div class="rounded-lg border border-border my-4 overflow-hidden bg-muted/30">' +
        langLabel +
        '<pre class="p-4 overflow-x-auto"><code class="text-[13px] font-mono text-foreground leading-relaxed">' +
        code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() +
        '</code></pre></div>',
    );
    return '%%CB_' + idx + '%%';
  });
  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(
      '<code class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[13px] font-mono">' +
        code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</code>',
    );
    return '%%IC_' + idx + '%%';
  });
  let html = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /^#### (.+)$/gm,
      '<h4 class="text-[15px] font-semibold text-foreground mt-5 mb-2">$1</h4>',
    )
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-base font-semibold text-foreground mt-6 mb-2.5">$1</h3>',
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-lg font-bold text-foreground mt-7 mb-3 pb-2 border-b border-border/60">$1</h2>',
    )
    .replace(
      /^# (.+)$/gm,
      '<h1 class="text-xl font-bold text-foreground mt-8 mb-4 pb-2.5 border-b-2 border-emerald-500/30">$1</h1>',
    )
    .replace(/^---$/gm, '<hr class="border-border/60 my-8" />')
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-emerald-500 pl-4 py-2 my-3 bg-emerald-500/5 rounded-r-lg text-muted-foreground italic text-[14px]">$1</blockquote>',
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-foreground/80">$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-5 list-decimal my-1 text-[14px] leading-relaxed">$1</li>',
    )
    .replace(
      /((?:<li class="ml-5 list-disc[^>]*>.*<\/li>\n?)+)/g,
      '<ul class="my-3 space-y-0.5">$1</ul>',
    )
    .replace(
      /((?:<li class="ml-5 list-decimal[^>]*>.*<\/li>\n?)+)/g,
      '<ol class="my-3 space-y-0.5">$1</ol>',
    )
    .replace(
      /^(?!<[a-z/!]|%%CB|%%IC)(.+)$/gm,
      '<p class="my-2 leading-relaxed text-[14px] text-foreground/90">$1</p>',
    );
  codeBlocks.forEach((block, i) => {
    html = html.replace('%%CB_' + i + '%%', block);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace('%%IC_' + i + '%%', code);
  });
  return html;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function DetailSection({
  label,
  icon: Icon,
  color,
  content,
}: {
  label: string;
  icon: any;
  color: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }
  if (!content) return null;
  return (
    <div className="bg-card border border-border rounded-2xl p-6 group/section">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/section:opacity-100 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

export default function MeetingsPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const authUser = useAuthStore((s) => s.user);
  const authTokens = useAuthStore((s) => s.tokens);
  const searchParams = useSearchParams();
  const router = useRouter();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  // ── State ──
  const [search, setSearch] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Create form
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createMeetLink, setCreateMeetLink] = useState('');
  const [createAndOpenLink, setCreateAndOpenLink] = useState(true);
  const [createStartTime, setCreateStartTime] = useState('');
  const [createEndTime, setCreateEndTime] = useState('');

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // AI Summarize
  const [showSummarize, setShowSummarize] = useState(false);
  const [sumProvider, setSumProvider] = useState('COPILOT');
  const [sumModel, setSumModel] = useState('gpt-4o');
  const [summarizing, setSummarizing] = useState(false);
  const [extensionState, setExtensionState] = useState<ExtensionInstallState>('checking');
  const [extensionInfo, setExtensionInfo] = useState<{
    version?: string;
    hasAuthToken?: boolean;
    hasTeamId?: boolean;
    userId?: string | null;
    email?: string | null;
    teamId?: string | null;
  } | null>(null);
  const [extensionConnectionState, setExtensionConnectionState] =
    useState<ExtensionConnectionState>('needs-connection');
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null);
  const [manualReconnectPending, setManualReconnectPending] = useState(false);
  const [lastMeetingSyncAt, setLastMeetingSyncAt] = useState<Date | null>(null);
  const [highlightSummary, setHighlightSummary] = useState(false);
  const autoConnectKeyRef = useRef<string | null>(null);
  const meetingSnapshotRef = useRef<
    Record<string, { updatedAt?: string; hasTranscript: boolean; hasSummary: boolean }>
  >({});
  const hasInitializedMeetingSnapshotRef = useRef(false);

  // ── Queries ──
  const { data: meetingsRes } = useQuery({
    queryKey: ['meetings', teamId, activeProject?.id],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/meetings${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`,
      ),
    enabled: !!teamId,
    refetchInterval: extensionConnectionState === 'ready' ? MEETINGS_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
    staleTime: 5 * 60_000,
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const meetings = meetingsRes?.data || [];
  const providerModels = models?.data?.[sumProvider] || [];

  const connectedProviders = new Set(
    (keysData?.data || []).filter((k: any) => k.isActive).map((k: any) => k.provider.toUpperCase()),
  );

  useEffect(() => {
    if (meetingsRes?.data) {
      setLastMeetingSyncAt(new Date());
    }
  }, [meetingsRes]);

  useEffect(() => {
    if (!meetings.length) return;

    const currentSnapshot: Record<
      string,
      { updatedAt?: string; hasTranscript: boolean; hasSummary: boolean }
    > = {};

    meetings.forEach((meeting: any) => {
      currentSnapshot[meeting.id] = {
        updatedAt: meeting.updatedAt,
        hasTranscript: Boolean(meeting.transcript),
        hasSummary: Boolean(meeting.summary),
      };
    });

    if (!hasInitializedMeetingSnapshotRef.current) {
      meetingSnapshotRef.current = currentSnapshot;
      hasInitializedMeetingSnapshotRef.current = true;
      return;
    }

    let transcriptToastShown = false;
    let summaryToastShown = false;

    meetings.forEach((meeting: any) => {
      const previous = meetingSnapshotRef.current[meeting.id];
      if (!previous) return;

      const transcriptJustSynced = !previous.hasTranscript && Boolean(meeting.transcript);
      const summaryJustSynced = !previous.hasSummary && Boolean(meeting.summary);

      if (transcriptJustSynced && !transcriptToastShown) {
        transcriptToastShown = true;
        toast.success(`Transcript synced: ${meeting.title}`);
      }

      if (summaryJustSynced && !summaryToastShown) {
        summaryToastShown = true;
        toast.success(`AI summary ready: ${meeting.title}`);
      }

      if (selectedMeeting?.id === meeting.id && previous.updatedAt !== meeting.updatedAt) {
        if (!previous.hasSummary && Boolean(meeting.summary)) {
          setHighlightSummary(true);
          window.setTimeout(() => setHighlightSummary(false), 2600);
        }
        setSelectedMeeting(meeting);
        setTranscript(meeting.transcript || '');
      }
    });

    meetingSnapshotRef.current = currentSnapshot;
  }, [meetings, selectedMeeting?.id]);

  useEffect(() => {
    if (models?.data && connectedProviders.size > 0 && !connectedProviders.has(sumProvider)) {
      const first =
        ['COPILOT', 'OPENAI', 'GEMINI', 'CLAUDE', 'OPENROUTER', 'GROQ'].find((p) =>
          connectedProviders.has(p),
        ) || Array.from(connectedProviders)[0];
      if (first) {
        setSumProvider(first);
        const firstModel = models.data[first]?.[0];
        if (firstModel) setSumModel(firstModel.id);
      }
    }
  }, [models, keysData]);

  useEffect(() => {
    if (providerModels?.length && !providerModels.find((m: any) => m.id === sumModel)) {
      setSumModel(providerModels[0].id);
    }
  }, [sumProvider, models]);

  const sendExtensionRequest = useCallback(
    (type: string, payload?: Record<string, any>, timeout = EXTENSION_PING_TIMEOUT_MS) =>
      new Promise<any>((resolve, reject) => {
        if (typeof window === 'undefined') {
          reject(new Error('Window is not available'));
          return;
        }

        const requestId = `brainforge-ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const handleMessage = (event: MessageEvent) => {
          if (event.source !== window) return;

          const data = event.data;
          if (!data || data.source !== 'brainforge-extension' || data.target !== 'brainforge-web') {
            return;
          }
          if (data.requestId !== requestId) return;

          window.clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          resolve(data.payload || null);
        };

        const timeoutId = window.setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          reject(new Error('Extension did not respond in time'));
        }, timeout);

        window.addEventListener('message', handleMessage);
        window.postMessage(
          {
            source: 'brainforge-web',
            target: 'brainforge-extension',
            type,
            requestId,
            payload,
          },
          '*',
        );
      }),
    [],
  );

  const readExtensionMarker = useCallback(() => {
    if (typeof document === 'undefined') return null;

    const root = document.documentElement.dataset;
    if (root.brainforgeExtensionInstalled !== 'true') return null;

    return {
      installed: true,
      version: root.brainforgeExtensionVersion || undefined,
    };
  }, []);

  const detectExtension = useCallback(() => {
    setExtensionState('checking');
    setExtensionMessage(null);

    const marker = readExtensionMarker();
    if (marker) {
      setExtensionInfo((current) => ({ ...current, ...marker }));
      setExtensionState('installed');
    }

    sendExtensionRequest('BRAINFORGE_EXTENSION_PING')
      .then((payload) => {
        setExtensionInfo(payload || null);
        setExtensionState('installed');
      })
      .catch(() => {
        const fallbackMarker = readExtensionMarker();
        if (fallbackMarker) {
          setExtensionInfo((current) => ({ ...current, ...fallbackMarker }));
          setExtensionState('installed');
          setExtensionConnectionState('needs-connection');
          setExtensionMessage(
            'Extension bridge detected, but the handshake failed. Reload the extension and refresh this page.',
          );
          return;
        }

        setExtensionInfo(null);
        setExtensionState('missing');
        setExtensionConnectionState('needs-connection');
      });
  }, [readExtensionMarker, sendExtensionRequest]);

  const connectExtension = useCallback(
    async (options?: { manual?: boolean }) => {
      if (!authUser || !authTokens) {
        setExtensionConnectionState('needs-connection');
        setExtensionMessage('Log in to BrainForge before connecting the extension.');
        return;
      }

      if (!teamId) {
        setExtensionConnectionState('needs-connection');
        setExtensionMessage('Select a team before connecting the extension.');
        return;
      }

      const preserveCurrentView = Boolean(options?.manual && extensionConnectionState === 'ready');

      if (preserveCurrentView) {
        setManualReconnectPending(true);
      } else {
        setExtensionConnectionState('syncing');
      }
      setExtensionMessage(null);

      try {
        const payload = await sendExtensionRequest(
          'BRAINFORGE_EXTENSION_CONNECT',
          {
            authToken: authTokens.accessToken,
            refreshToken: authTokens.refreshToken,
            teamId,
            user: authUser,
            appUrl:
              typeof window !== 'undefined'
                ? window.location.origin
                : process.env.NEXT_PUBLIC_APP_URL,
            apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
          },
          EXTENSION_CONNECT_TIMEOUT_MS,
        );

        setExtensionInfo(payload || null);
        setExtensionConnectionState('ready');
        setExtensionMessage(null);
      } catch (error: any) {
        if (!preserveCurrentView) {
          setExtensionConnectionState('needs-connection');
        }
        setExtensionMessage(error?.message || 'Failed to connect the extension.');
      } finally {
        if (preserveCurrentView) {
          setManualReconnectPending(false);
        }
      }
    },
    [authTokens, authUser, extensionConnectionState, sendExtensionRequest, teamId],
  );

  useEffect(() => {
    detectExtension();

    const handleFocus = () => detectExtension();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [detectExtension]);

  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      const payload = event.data;
      if (!payload || payload.source !== 'brainforge-extension' || payload.target !== 'brainforge-web') {
        return;
      }

      if (
        payload.type === 'BRAINFORGE_MEETING_SYNCED' ||
        payload.type === 'BRAINFORGE_MEETING_UPDATED' ||
        payload.type === 'BRAINFORGE_EXTENSION_CONNECTED'
      ) {
        queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, [queryClient, teamId]);

  useEffect(() => {
    if (extensionState !== 'installed') return;

    const isConnected = Boolean(
      extensionInfo?.hasAuthToken &&
      extensionInfo?.hasTeamId &&
      extensionInfo?.userId &&
      authUser?.id &&
      extensionInfo.userId === authUser.id &&
      extensionInfo.teamId === teamId,
    );

    if (isConnected) {
      setExtensionConnectionState('ready');
      setExtensionMessage(null);
      return;
    }

    setExtensionConnectionState('needs-connection');

    if (extensionInfo?.userId && authUser?.id && extensionInfo.userId !== authUser.id) {
      setExtensionMessage('The extension is signed in with a different BrainForge account.');
      return;
    }

    if (
      extensionInfo?.hasAuthToken &&
      extensionInfo?.teamId &&
      teamId &&
      extensionInfo.teamId !== teamId
    ) {
      setExtensionMessage('The extension is connected to a different team.');
      return;
    }

    if (!authUser || !authTokens) {
      setExtensionMessage('Log in to BrainForge to finish connecting the extension.');
      return;
    }

    if (!teamId) {
      setExtensionMessage('Select a team to finish connecting the extension.');
      return;
    }

    setExtensionMessage('Extension detected. Connect it to your current BrainForge account.');
  }, [extensionState, extensionInfo, authUser, authTokens, teamId]);

  useEffect(() => {
    if (extensionState !== 'installed' || !authUser || !authTokens || !teamId) return;

    const isConnected = Boolean(
      extensionInfo?.hasAuthToken &&
      extensionInfo?.hasTeamId &&
      extensionInfo?.userId === authUser.id &&
      extensionInfo?.teamId === teamId,
    );

    if (isConnected) return;

    const connectKey = `${authUser.id}:${teamId}:${authTokens.accessToken}`;
    if (autoConnectKeyRef.current === connectKey) return;

    autoConnectKeyRef.current = connectKey;
    void connectExtension();
  }, [extensionState, extensionInfo, authTokens, authUser, connectExtension, teamId]);

  useEffect(() => {
    if (!meetings.length) return;

    const meetingId = searchParams.get('meetingId');
    if (!meetingId) return;

    const target = meetings.find((meeting: any) => meeting.id === meetingId);
    if (!target) return;

    setSelectedMeeting(target);
    setTranscript(target.transcript || '');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('meetingId');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `/meetings?${nextQuery}` : '/meetings');
  }, [meetings, router, searchParams]);

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/meetings`, data),
    onSuccess: (res: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateMeetLink('');
      setCreateAndOpenLink(true);
      setCreateStartTime('');
      setCreateEndTime('');

      const shouldOpenAfterCreate = Boolean(variables?.openNow) || Boolean(variables?.autoOpen);
      if (shouldOpenAfterCreate && variables?.meetLink) {
        window.open(variables.meetLink, '_blank', 'noopener,noreferrer');
      }

      if (res?.data?.id) {
        setSelectedMeeting(res.data);
        setTranscript(res.data.transcript || '');
      }

      toast.success('Meeting created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create meeting'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/teams/${teamId}/meetings/${id}`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      if (selectedMeeting) setSelectedMeeting(res.data);
      toast.success('Meeting updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      if (selectedMeeting && deleteConfirm && selectedMeeting.id === deleteConfirm.id) {
        setSelectedMeeting(null);
      }
      toast.success('Meeting deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  const summarizeMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/teams/${teamId}/meetings/${id}/summarize`, {
        provider: sumProvider,
        model: sumModel,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      setSelectedMeeting(res.data);
      setShowSummarize(false);
      setSummarizing(false);
      toast.success('Transcript summarized by AI');
    },
    onError: (e: any) => {
      setSummarizing(false);
      toast.error(e.message || 'Failed to summarize');
    },
  });

  // ── Voice Recording ──
  async function startRecording() {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';
        let fullTranscript = transcript;
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullTranscript += t + ' ';
              setTranscript(fullTranscript);
            } else {
              interim += t;
            }
          }
        };
        recognition.onerror = () => {
          /* silently continue */
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      // Also record audio for backup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }

  function saveTranscript() {
    if (!selectedMeeting || !transcript.trim()) return;
    updateMutation.mutate({
      id: selectedMeeting.id,
      data: { transcript: transcript.trim(), status: 'COMPLETED' },
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Filtered ──
  const filtered = meetings.filter(
    (m: any) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase()),
  );

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const extensionAccountLabel = extensionInfo?.email || authUser?.email || 'Connected workspace';
  const extensionVersionLabel = extensionInfo?.version || 'Unknown';
  const isExtensionOutdated =
    !!extensionInfo?.version && compareSemver(extensionInfo.version, LATEST_EXTENSION_VERSION) < 0;

  if (extensionState !== 'installed' || extensionConnectionState !== 'ready') {
    const extensionDetected = extensionState === 'installed';
    const isChecking = extensionState === 'checking';
    const isSyncing = extensionDetected && extensionConnectionState === 'syncing';
    const gateTitle = extensionDetected
      ? 'Connect the BrainForge extension to this workspace'
      : 'Install the BrainForge extension to use Meetings';
    const gateDescription = extensionDetected
      ? 'The extension is installed, but this website session is not linked yet. Connect it with the same BrainForge account so meeting transcripts and AI summaries can sync here automatically.'
      : 'Meeting transcripts, AI recordings, and discussion summaries now flow through the BrainForge browser extension. Install it first to continue.';
    const statusLabel = isChecking
      ? 'Checking extension...'
      : isSyncing
        ? 'Extension detected, syncing account...'
        : extensionDetected
          ? 'Extension detected, connection required'
          : 'Extension not detected';

    return (
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-4xl rounded-[28px] border border-border bg-card overflow-hidden shadow-[0_24px_70px_rgba(16,185,129,0.08)]">
          <div className="relative border-b border-border px-8 py-8 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_35%),linear-gradient(180deg,rgba(16,185,129,0.06),transparent)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  <Puzzle className="h-3.5 w-3.5" />
                  {extensionDetected ? 'Extension Setup' : 'Extension Required'}
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-foreground">
                  {gateTitle}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  {gateDescription}
                </p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-background/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  {isChecking || isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                      {statusLabel}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 text-amber-500" />
                      {statusLabel}
                    </>
                  )}
                </div>
                {extensionInfo?.version && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Version {extensionInfo.version}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Install locally
                </div>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li>1. Download the extension `.zip` from the button on the right.</li>
                  <li>
                    2. Extract the zip into a normal folder such as `brainforge-meet-assistant`.
                  </li>
                  <li>3. Open `chrome://extensions/` in your Chromium browser.</li>
                  <li>4. Turn on `Developer mode` in the top-right corner.</li>
                  <li>5. Click `Load unpacked` and select the extracted folder.</li>
                  <li>6. If the extension was already loaded before, click `Reload` on it.</li>
                  <li>7. Return to this page and click `Check again`.</li>
                </ol>
                <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Chrome does not install local extensions directly from a `.zip` file. The archive
                  is only for download convenience; you still need to extract it and use `Load
                  unpacked`.
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <div className="text-sm font-semibold text-foreground">Why this setup matters</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="text-xs font-semibold text-foreground">
                      Automatic transcript sync
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Meetings recorded in the extension flow straight into BrainForge as structured
                      data.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="text-xs font-semibold text-foreground">
                      AI summaries stay linked
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Summaries, action items, and follow-ups land back on this page automatically.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="text-xs font-semibold text-foreground">
                      Same-account workflow
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      The extension now needs to use the same BrainForge account and team as this
                      site.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="text-sm font-semibold text-foreground">
                {extensionDetected ? 'Connection status' : 'Next steps'}
              </div>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>- Refresh the BrainForge tab after installing or reloading the extension.</p>
                <p>
                  - Make sure `BrainForge Meet Assistant` is enabled in the same browser profile.
                </p>
                <p>
                  - Once the extension is detected and synced, this gate disappears automatically.
                </p>
              </div>

              {extensionMessage && (
                <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                  {extensionMessage}
                </div>
              )}

              {extensionDetected && extensionInfo?.email && (
                <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Extension account:{' '}
                  <span className="font-medium text-foreground">{extensionInfo.email}</span>
                  {extensionInfo.teamId ? (
                    <>
                      {' '}
                      • Team{' '}
                      <span className="font-medium text-foreground">{extensionInfo.teamId}</span>
                    </>
                  ) : null}
                </div>
              )}

              <a
                href="/downloads/brainforge-meet-assistant.zip"
                download
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Download Extension (.zip)
              </a>

              <button
                onClick={extensionDetected ? () => connectExtension() : detectExtension}
                disabled={isChecking || isSyncing}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {isChecking || isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isChecking
                  ? 'Checking extension...'
                  : isSyncing
                    ? 'Connecting extension...'
                    : extensionDetected
                      ? 'Connect current account'
                      : 'Check again'}
              </button>

              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
                If detection still fails, reload the extension in `chrome://extensions/` and then do
                a hard refresh here with `Ctrl+Shift+R`.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (selectedMeeting) {
    const m = selectedMeeting;
    const status = STATUS_MAP[m.status] || STATUS_MAP.SCHEDULED;
    const nextGoals = extractNextGoals(m.summary, m.actionItems);
    const smartTitle = getSmartMeetingTitle(m);
    const extensionOrigin = isExtensionMeeting(m);
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => {
              setSelectedMeeting(null);
              setTranscript('');
              setIsRecording(false);
            }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{smartTitle}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(m.createdAt)}
              </span>
              <span
                className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', status.bg)}
                style={{ color: status.color }}
              >
                {status.label}
              </span>
              {m.project && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ background: m.project.color }} />
                  {m.project.name}
                </span>
              )}
              {extensionOrigin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-500">
                  Extension
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {m.meetLink && (
                <DropdownMenuItem
                  onClick={() => window.open(m.meetLink, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Meet Link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteConfirm({ id: m.id, title: m.title })}
                className="text-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Description */}
          {m.description && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm text-foreground/80 leading-relaxed">{m.description}</p>
            </div>
          )}

          {/* Meeting Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {m.meetLink && (
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Meet Link</p>
                  <a
                    href={m.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate block"
                  >
                    {m.meetLink}
                  </a>
                </div>
              </div>
            )}
            {m.startTime && (
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="text-sm text-foreground">{formatDateTime(m.startTime)}</p>
                </div>
              </div>
            )}
            {m.updatedAt && (
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-sm text-foreground">{formatDateTime(m.updatedAt)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Extension Capture Preferred
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">
                  Use the BrainForge extension in Google Meet for the cleanest workflow
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The extension is the primary capture path now. It pushes transcripts, AI
                  summaries, and follow-up items back into this page automatically. The browser
                  recorder below stays available only as a fallback.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Account
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-foreground">
                    {extensionAccountLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Extension
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    v{extensionVersionLabel}
                  </div>
                </div>
              </div>
            </div>
            {m.meetLink && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => window.open(m.meetLink, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: ACCENT }}
                >
                  <Video className="h-4 w-4" />
                  Open Google Meet
                </button>
                <span className="text-xs text-muted-foreground">
                  Launch the meeting, open the BrainForge assistant inside Meet, and let it sync the
                  transcript here.
                </span>
              </div>
            )}
          </div>

          {/* Voice Recorder */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Browser Recorder Fallback</h2>
              {isRecording && (
                <span className="flex items-center gap-1.5 ml-auto text-xs text-red-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording {formatTime(recordingTime)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Use this only when the Meet extension cannot capture the session. It relies on your
              browser&apos;s speech recognition, so transcript quality may be lower than the
              extension flow.
            </p>
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ background: ACCENT }}
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium transition-colors hover:bg-red-600"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </button>
              )}
              {transcript && !isRecording && (
                <button
                  onClick={saveTranscript}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Save Transcript
                </button>
              )}
            </div>
            {/* Live transcript */}
            {(transcript || isRecording) && (
              <div className="mt-4">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Transcript will appear here..."
                  className="min-h-30 text-sm resize-none"
                />
              </div>
            )}
          </div>

          {/* Saved Transcript */}
          {m.transcript && (
            <DetailSection
              label="Transcript"
              icon={FileText}
              color={ACCENT}
              content={m.transcript}
            />
          )}

          {/* AI Summary */}
          {m.summary && (
            <div
              className={cn(
                'rounded-2xl transition-all',
                highlightSummary && 'ring-2 ring-[#8b5cf6]/50 shadow-[0_0_0_6px_rgba(139,92,246,0.12)]',
              )}
            >
              <DetailSection
                label="AI Summary"
                icon={Sparkles}
                color="#8b5cf6"
                content={m.summary}
              />
            </div>
          )}

          {/* Action Items */}
          {m.actionItems && Array.isArray(m.actionItems) && m.actionItems.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <ListChecks className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Action Items</h2>
              </div>
              <ul className="space-y-2">
                {m.actionItems.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <div className="h-5 w-5 rounded-md border border-border flex items-center justify-center mt-0.5 shrink-0">
                      <span className="text-[10px] font-medium text-muted-foreground">{i + 1}</span>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nextGoals.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Tujuan Selanjutnya (AI)</h2>
              </div>
              <ul className="space-y-2">
                {nextGoals.map((goal, i) => (
                  <li key={`${goal}-${i}`} className="flex items-start gap-2 text-sm text-foreground/80">
                    <div className="h-5 w-5 rounded-md border border-border flex items-center justify-center mt-0.5 shrink-0">
                      <span className="text-[10px] font-medium text-muted-foreground">{i + 1}</span>
                    </div>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summarize button */}
          {m.transcript && !m.summary && (
            <button
              onClick={() => setShowSummarize(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-[#8b5cf6]/40 text-sm font-medium text-muted-foreground hover:text-[#8b5cf6] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Summarize Transcript with AI
            </button>
          )}
          {m.transcript && m.summary && (
            <button
              onClick={() => setShowSummarize(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Re-summarize
            </button>
          )}
        </div>

        {/* Summarize Dialog */}
        <Dialog open={showSummarize} onOpenChange={setShowSummarize}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#8b5cf6]" />
                AI Summarize
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Provider</label>
                <Select value={sumProvider} onValueChange={setSumProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p} disabled={!connectedProviders.has(p)}>
                        {p} {!connectedProviders.has(p) && '(no key)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Model</label>
                <Select value={sumModel} onValueChange={setSumModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowSummarize(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSummarizing(true);
                  summarizeMutation.mutate(selectedMeeting.id);
                }}
                disabled={summarizing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: '#8b5cf6' }}
              >
                {summarizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {summarizing ? 'Summarizing...' : 'Summarize'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          title="Delete Meeting"
          itemLabel={deleteConfirm?.title || ''}
          isPending={deleteMutation.isPending}
        />
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Meetings</h1>
            <p className="text-xs text-muted-foreground">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <Plus className="h-4 w-4" />
          New Meeting
        </button>
      </div>

      <div className="px-6 pt-5">
        <div className="relative overflow-hidden rounded-[26px] border border-border bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_35%),linear-gradient(180deg,rgba(16,185,129,0.05),transparent)]" />
          <div className="relative grid gap-5 px-5 py-5 lg:grid-cols-[1.5fr_0.95fr] lg:px-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Extension Synced
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                Meetings are ready to sync from your browser extension
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Open Google Meet, launch the BrainForge assistant from the call controls, and your
                transcript, AI summary, and follow-up items will flow back into this workspace.
              </p>
              {isExtensionOutdated && (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  You are still running extension v{extensionVersionLabel}. The latest package is
                  v{LATEST_EXTENSION_VERSION}, which includes the new UI and reconnect fixes.
                </div>
              )}
              {extensionMessage && (
                <div className="mt-4 rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground">
                  {extensionMessage}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href="https://meet.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: ACCENT }}
                >
                  <Video className="h-4 w-4" />
                  Open Google Meet
                </a>
                <button
                  onClick={() => connectExtension({ manual: true })}
                  disabled={manualReconnectPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {manualReconnectPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {manualReconnectPending ? 'Reconnecting...' : 'Reconnect Extension'}
                </button>
                {isExtensionOutdated && (
                  <a
                    href="/downloads/brainforge-meet-assistant.zip"
                    download
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/15"
                  >
                    <Download className="h-4 w-4" />
                    Download Latest Extension
                  </a>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-border bg-background/90 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Connected account
                </div>
                <div className="mt-1 truncate text-sm font-medium text-foreground">
                  {extensionAccountLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/90 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Active team
                </div>
                <div className="mt-1 truncate text-sm font-medium text-foreground">
                  {activeTeam?.name || 'No team selected'}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/90 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Extension version
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  v{extensionVersionLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/90 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Last sync
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {lastMeetingSyncAt ? formatDateTime(lastMeetingSyncAt.toISOString()) : 'Waiting...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      {meetings.length > 0 && (
        <div className="mt-4 px-6 py-3 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!meetingsRes && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {meetingsRes && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-emerald-500/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {search ? 'No meetings found' : 'No meetings yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {search
                ? 'Try a different search term.'
                : 'Create a meeting shell or start from Google Meet with the BrainForge extension to capture transcripts and AI summaries.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: ACCENT }}
              >
                <Plus className="h-4 w-4" />
                Create Meeting
              </button>
            )}
          </div>
        )}

        {meetingsRes && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m: any) => {
              const status = STATUS_MAP[m.status] || STATUS_MAP.SCHEDULED;
              const extensionOrigin = isExtensionMeeting(m);
              const smartTitle = getSmartMeetingTitle(m);
              const preview = getMeetingPreview(m);
              const wordCount = getTranscriptWordCount(m.transcript);
              const actionCount = Array.isArray(m.actionItems) ? m.actionItems.length : 0;
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedMeeting(m);
                    setTranscript(m.transcript || '');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMeeting(m);
                      setTranscript(m.transcript || '');
                    }
                  }}
                  className={cn(
                    'bg-card border border-border rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group',
                    extensionOrigin
                      ? 'bg-[linear-gradient(165deg,rgba(16,185,129,0.12),rgba(16,185,129,0.02)_38%,rgba(0,0,0,0)_55%)] border-emerald-500/30 hover:border-emerald-500/50'
                      : 'hover:border-emerald-500/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-emerald-500 transition-colors">
                        {smartTitle}
                      </h3>
                      {extensionOrigin && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-500">
                          Extension Capture
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium',
                          status.bg,
                        )}
                        style={{ color: status.color }}
                      >
                        {status.label}
                      </span>
                      {m.summary && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
                          <Sparkles className="h-3 w-3" />
                          AI ready
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/95 line-clamp-3 mb-3 leading-relaxed">
                    {preview}
                  </p>

                  <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg border border-border/70 bg-background/50 px-2 py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Words</div>
                      <div className="mt-0.5 font-medium text-foreground">{wordCount || '-'}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/50 px-2 py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Actions</div>
                      <div className="mt-0.5 font-medium text-foreground">{actionCount || '-'}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/50 px-2 py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sync</div>
                      <div className="mt-0.5 font-medium text-foreground">
                        {isRecentlyUpdated(m.updatedAt) ? 'Live' : 'Saved'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(m.createdAt)}
                    </span>
                    {m.transcript && !m.summary && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <FileText className="h-3 w-3" />
                        Has transcript
                      </span>
                    )}
                    {isRecentlyUpdated(m.updatedAt) && (
                      <span className="flex items-center gap-1 text-indigo-400">
                        <RefreshCw className="h-3 w-3" />
                        Live synced
                      </span>
                    )}
                  </div>
                  {m.project && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: m.project.color }}
                      />
                      {m.project.name}
                    </div>
                  )}
                  {m.meetLink && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          window.open(m.meetLink, '_blank', 'noopener,noreferrer');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Meet
                      </button>
                      <span className="text-[11px] text-muted-foreground">Tap card for full details</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-500" />
              New Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g., Sprint Planning, Daily Standup"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Description
              </label>
              <Textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="What's this meeting about?"
                className="resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Meet Link</label>
              <Input
                value={createMeetLink}
                onChange={(e) => setCreateMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={createAndOpenLink}
                  onChange={(e) => setCreateAndOpenLink(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                Buka link meeting otomatis setelah dibuat
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  value={createStartTime}
                  onChange={(e) => setCreateStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">End Time</label>
                <Input
                  type="datetime-local"
                  value={createEndTime}
                  onChange={(e) => setCreateEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!createTitle.trim()) {
                  toast.error('Title is required');
                  return;
                }
                createMutation.mutate({
                  title: createTitle.trim(),
                  description: createDesc.trim() || undefined,
                  meetLink: normalizeMeetLink(createMeetLink) || undefined,
                  startTime: createStartTime || undefined,
                  endTime: createEndTime || undefined,
                  projectId: activeProject?.id || undefined,
                  openNow: true,
                  autoOpen: true,
                });
              }}
              disabled={createMutation.isPending || !createTitle.trim() || !createMeetLink.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#0f766e' }}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Create & Join
            </button>
            <button
              onClick={() => {
                if (!createTitle.trim()) {
                  toast.error('Title is required');
                  return;
                }
                createMutation.mutate({
                  title: createTitle.trim(),
                  description: createDesc.trim() || undefined,
                  meetLink: normalizeMeetLink(createMeetLink) || undefined,
                  startTime: createStartTime || undefined,
                  endTime: createEndTime || undefined,
                  projectId: activeProject?.id || undefined,
                  openNow: false,
                  autoOpen: createAndOpenLink,
                });
              }}
              disabled={createMutation.isPending || !createTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Meeting
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
        title="Delete Meeting"
        itemLabel={deleteConfirm?.title || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
