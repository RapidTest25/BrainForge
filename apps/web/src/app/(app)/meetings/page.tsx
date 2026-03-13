'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video, Plus, Loader2, Search, ChevronRight, ArrowLeft,
  Trash2, MoreVertical, Mic, MicOff, Clock, Calendar as CalendarIcon,
  ExternalLink, Sparkles, Copy, Check, Link2, Play, Square,
  FileText, ListChecks, ChevronDown, Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

const ACCENT = '#10b981'; // emerald-500
const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];

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
    const langLabel = lang ? '<div class="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider"><span>' + lang + '</span></div>' : '';
    codeBlocks.push(
      '<div class="rounded-lg border border-border my-4 overflow-hidden bg-muted/30">' + langLabel + '<pre class="p-4 overflow-x-auto"><code class="text-[13px] font-mono text-foreground leading-relaxed">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() + '</code></pre></div>'
    );
    return '%%CB_' + idx + '%%';
  });
  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push('<code class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[13px] font-mono">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>');
    return '%%IC_' + idx + '%%';
  });
  let html = processed
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#### (.+)$/gm, '<h4 class="text-[15px] font-semibold text-foreground mt-5 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-7 mb-3 pb-2 border-b border-border/60">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-8 mb-4 pb-2.5 border-b-2 border-emerald-500/30">$1</h1>')
    .replace(/^---$/gm, '<hr class="border-border/60 my-8" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-emerald-500 pl-4 py-2 my-3 bg-emerald-500/5 rounded-r-lg text-muted-foreground italic text-[14px]">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-foreground/80">$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/((?:<li class="ml-5 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-3 space-y-0.5">$1</ul>')
    .replace(/((?:<li class="ml-5 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-3 space-y-0.5">$1</ol>')
    .replace(/^(?!<[a-z/!]|%%CB|%%IC)(.+)$/gm, '<p class="my-2 leading-relaxed text-[14px] text-foreground/90">$1</p>');
  codeBlocks.forEach((block, i) => { html = html.replace('%%CB_' + i + '%%', block); });
  inlineCodes.forEach((code, i) => { html = html.replace('%%IC_' + i + '%%', code); });
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

function DetailSection({ label, icon: Icon, color, content }: { label: string; icon: any; color: string; content: string }) {
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
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
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

  // ── Queries ──
  const { data: meetingsRes } = useQuery({
    queryKey: ['meetings', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/meetings${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
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

  const connectedProviders = new Set((keysData?.data || []).filter((k: any) => k.isActive).map((k: any) => k.provider.toUpperCase()));

  useEffect(() => {
    if (models?.data && connectedProviders.size > 0 && !connectedProviders.has(sumProvider)) {
      const first = ['COPILOT', 'OPENAI', 'GEMINI', 'CLAUDE', 'OPENROUTER', 'GROQ'].find(p => connectedProviders.has(p))
        || Array.from(connectedProviders)[0];
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

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/meetings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateMeetLink('');
      setCreateStartTime('');
      setCreateEndTime('');
      toast.success('Meeting created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create meeting'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/teams/${teamId}/meetings/${id}`, data),
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
    mutationFn: (id: string) => api.post(`/teams/${teamId}/meetings/${id}/summarize`, {
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
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        recognition.onerror = () => { /* silently continue */ };
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
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
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
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
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
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Filtered ──
  const filtered = meetings.filter((m: any) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ── DETAIL VIEW ──
  if (selectedMeeting) {
    const m = selectedMeeting;
    const status = STATUS_MAP[m.status] || STATUS_MAP.SCHEDULED;
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => { setSelectedMeeting(null); setTranscript(''); setIsRecording(false); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{m.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(m.createdAt)}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', status.bg)} style={{ color: status.color }}>
                {status.label}
              </span>
              {m.project && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ background: m.project.color }} />
                  {m.project.name}
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
                <DropdownMenuItem onClick={() => window.open(m.meetLink, '_blank', 'noopener,noreferrer')}>
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
          </div>

          {/* Voice Recorder */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Voice Recorder</h2>
              {isRecording && (
                <span className="flex items-center gap-1.5 ml-auto text-xs text-red-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording {formatTime(recordingTime)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Record audio during your meeting. Speech will be transcribed in real-time using your browser&apos;s speech recognition.
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
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
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
            <DetailSection
              label="AI Summary"
              icon={Sparkles}
              color="#8b5cf6"
              content={m.summary}
            />
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => (
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
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
                {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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

      {/* Search */}
      {meetings.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
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
              {search ? 'Try a different search term.' : 'Create a meeting to record voice conversations and let AI summarize them for you.'}
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
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMeeting(m); setTranscript(m.transcript || ''); }}
                  className="bg-card border border-border rounded-2xl p-5 text-left hover:shadow-md hover:border-emerald-500/20 hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-emerald-500 transition-colors">
                      {m.title}
                    </h3>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ml-2', status.bg)} style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(m.createdAt)}
                    </span>
                    {m.summary && (
                      <span className="flex items-center gap-1 text-[#8b5cf6]">
                        <Sparkles className="h-3 w-3" />
                        Summarized
                      </span>
                    )}
                    {m.transcript && !m.summary && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <FileText className="h-3 w-3" />
                        Has transcript
                      </span>
                    )}
                  </div>
                  {m.project && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ background: m.project.color }} />
                      {m.project.name}
                    </div>
                  )}
                </button>
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
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
                if (!createTitle.trim()) { toast.error('Title is required'); return; }
                createMutation.mutate({
                  title: createTitle.trim(),
                  description: createDesc.trim() || undefined,
                  meetLink: createMeetLink.trim() || undefined,
                  startTime: createStartTime || undefined,
                  endTime: createEndTime || undefined,
                  projectId: activeProject?.id || undefined,
                });
              }}
              disabled={createMutation.isPending || !createTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
