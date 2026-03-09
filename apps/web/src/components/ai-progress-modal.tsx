'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Sparkles, Brain,
  Timer, RefreshCw, AlertTriangle, ExternalLink, Check, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

// ── Types ──

export type AIStep = {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  hint?: string;
};

// ── Hooks ──

export function useElapsedTime(isRunning: boolean, startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning || !startedAt) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt]);
  return elapsed;
}

export function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ── Animated Helpers ──

export function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c >= 3 ? 1 : c + 1), 500);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-4 text-left">{'.'.repeat(count)}</span>;
}

export function PulseRing({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return (
    <>
      <span className="absolute inset-0 rounded-2xl animate-[ai-ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"
        style={{ border: `2px solid ${color}`, opacity: 0.4 }} />
      <span className="absolute inset-0 rounded-2xl animate-[ai-ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"
        style={{ border: `2px solid ${color}`, opacity: 0.2 }} />
    </>
  );
}

// ── Floating Bubble ──

export function AIGenerateBubble({
  visible, progress, title, onClick, color = '#7b68ee',
}: {
  visible: boolean;
  progress: number;
  title?: string;
  onClick: () => void;
  color?: string;
}) {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border border-border/50 bg-card/95 backdrop-blur-xl hover:scale-105 transition-all duration-200 group cursor-pointer"
      style={{ boxShadow: `0 8px 32px ${color}25` }}
    >
      <div className="relative h-10 w-10 shrink-0">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${progress * 0.975} 100`} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <Brain className="absolute inset-0 m-auto h-4 w-4 animate-pulse" style={{ color }} />
      </div>
      <div className="text-left">
        <p className="text-[11px] font-bold" style={{ color }}>AI Generating...</p>
        {title && <p className="text-[10px] text-muted-foreground truncate max-w-32">{title}</p>}
      </div>
    </button>
  );
}

// ── Main Progress Modal ──

export interface AIProgressModalProps {
  open: boolean;
  steps: AIStep[];
  error: string | null;
  resultId: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onOpenResult?: () => void;
  onRetry?: () => void;
  startedAt: number | null;
  itemTitle?: string;
  initialElapsed?: number;
  // Customization
  generatingTitle?: string;
  doneTitle?: string;
  failedTitle?: string;
  generatingSubtitle?: React.ReactNode;
  doneSubtitle?: string;
  failedSubtitle?: string;
  openResultLabel?: string;
  openResultIcon?: React.ReactNode;
  accentColor?: string;
}

export function AIGenerateProgressModal({
  open, steps, error, resultId, onClose, onMinimize, onOpenResult, onRetry,
  startedAt, itemTitle, initialElapsed,
  generatingTitle = 'AI is Working',
  doneTitle = 'Generation Complete!',
  failedTitle = 'Generation Failed',
  generatingSubtitle,
  doneSubtitle = 'Your AI-generated content has been created and saved successfully.',
  failedSubtitle = 'Something went wrong. Please check your API key or try a different model.',
  openResultLabel = 'Open Result',
  openResultIcon = <ExternalLink className="h-3.5 w-3.5" />,
  accentColor = '#7b68ee',
}: AIProgressModalProps) {
  const allDone = steps.length > 0 && steps.every(s => s.status === 'done');
  const hasError = !!error;
  const isGenerating = !allDone && !hasError && steps.length > 0;
  const elapsed = useElapsedTime(isGenerating, startedAt);
  const finalElapsed = useRef(initialElapsed || 0);
  useEffect(() => {
    if (initialElapsed && initialElapsed > 0) finalElapsed.current = initialElapsed;
  }, [initialElapsed]);
  if (isGenerating) finalElapsed.current = elapsed;

  const doneSteps = steps.filter(s => s.status === 'done').length;
  const activeIdx = steps.findIndex(s => s.status === 'active');

  const baseProgress = steps.length > 0 ? (doneSteps / steps.length) * 100 : 0;
  const smoothProgress = activeIdx >= 0
    ? ((doneSteps + Math.min(elapsed * 0.02, 0.85)) / steps.length) * 100
    : baseProgress;
  const displayProgress = allDone ? 100 : hasError ? baseProgress : Math.min(smoothProgress, 99);

  const statusColor = hasError ? '#ef4444' : allDone ? '#22c55e' : accentColor;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { isGenerating ? onMinimize() : onClose(); } }}>
      <DialogContent className="bg-card max-w-105 p-0 overflow-hidden border-border/50 shadow-2xl">
        <VisuallyHidden.Root><DialogTitle>AI Generation Progress</DialogTitle></VisuallyHidden.Root>
        {/* Gradient header band */}
        <div className="relative h-1.5 w-full overflow-hidden"
          style={{ background: hasError ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' : allDone ? 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)' : `linear-gradient(90deg, ${accentColor} 0%, #a78bfa 50%, ${accentColor} 100%)` }}>
          <div className="absolute inset-0 bg-muted/80" />
          <div className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
            style={{
              width: `${displayProgress}%`,
              backgroundImage: hasError
                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                : allDone
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : `linear-gradient(90deg, ${accentColor}, #a78bfa, ${accentColor})`,
              backgroundSize: '200% 100%',
            }}
          />
          {isGenerating && (
            <div className="absolute inset-y-0 left-0 transition-all duration-1000"
              style={{ width: `${displayProgress}%` }}>
              <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
            </div>
          )}
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* Icon + Title Section */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="relative mb-4">
              <div className={cn(
                'h-18 w-18 rounded-2xl flex items-center justify-center transition-all duration-500',
                hasError ? 'bg-red-500/10' : allDone ? 'bg-green-500/10' : 'bg-[#7b68ee]/10'
              )} style={!hasError && !allDone ? { backgroundColor: `${accentColor}15` } : undefined}>
                <PulseRing color={statusColor} active={isGenerating} />
                {hasError ? (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                ) : allDone ? (
                  <div className="relative">
                    <CheckCircle2 className="h-9 w-9 text-green-500 animate-in zoom-in-50 duration-500" />
                    <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-green-400 animate-in spin-in-180 zoom-in-50 duration-700" />
                  </div>
                ) : (
                  <Brain className="h-8 w-8 animate-pulse" style={{ color: accentColor }} />
                )}
              </div>
            </div>

            <h3 className="text-[17px] font-bold text-foreground leading-tight">
              {hasError ? failedTitle : allDone ? doneTitle : generatingTitle}
            </h3>

            {itemTitle && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: `${statusColor}12`, color: statusColor }}>
                <Sparkles className="h-2.5 w-2.5" />
                {itemTitle}
              </div>
            )}

            <p className="text-[13px] text-muted-foreground mt-2 max-w-70">
              {hasError
                ? failedSubtitle
                : allDone
                  ? doneSubtitle
                  : generatingSubtitle || <>AI is generating your content<AnimatedDots /></>}
            </p>

            {(isGenerating || allDone) && startedAt && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {formatElapsed(allDone ? finalElapsed.current : elapsed)}
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: `${accentColor}15`, color: accentColor }}>
                    {elapsed < 5 ? 'Starting…' : elapsed < 15 ? 'Processing…' : elapsed < 45 ? 'Working…' : 'Almost there…'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="relative bg-muted/40 rounded-xl p-3 mb-4 border border-border/50">
            <div className="absolute left-7.25 top-5.5 bottom-5.5 w-0.5 rounded-full overflow-hidden bg-border/60">
              <div className="w-full transition-all duration-700 ease-out rounded-full"
                style={{
                  height: `${displayProgress}%`,
                  background: hasError
                    ? 'linear-gradient(to bottom, #22c55e, #ef4444)'
                    : allDone
                      ? '#22c55e'
                      : `linear-gradient(to bottom, #22c55e, ${accentColor})`,
                }} />
            </div>

            <div className="space-y-0.5">
              {steps.map((step, i) => {
                const isActive = step.status === 'active';
                const isDone = step.status === 'done';
                const isError = step.status === 'error';

                return (
                  <div key={i} className={cn(
                    'relative flex items-start gap-3 px-2 py-2.5 rounded-lg transition-all duration-300',
                    isActive && `bg-[${accentColor}]/6`,
                    isDone && 'opacity-75',
                  )} style={isActive ? { backgroundColor: `${accentColor}0a` } : undefined}>
                    <div className="shrink-0 relative z-10 mt-px">
                      {isDone ? (
                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm"
                          style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)' }}>
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      ) : isActive ? (
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${accentColor}, #a78bfa)`, boxShadow: `0 0 12px ${accentColor}66` }}>
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        </div>
                      ) : isError ? (
                        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm"
                          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)' }}>
                          <XCircle className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                          <span className="text-[9px] font-bold text-muted-foreground/40">{i + 1}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-[13px] font-medium leading-tight',
                          isDone ? 'text-green-600 dark:text-green-400'
                            : isActive ? `text-[${accentColor}]`
                              : isError ? 'text-red-500'
                                : 'text-muted-foreground/40'
                        )} style={isActive ? { color: accentColor } : undefined}>
                          {step.label}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-semibold text-green-500 shrink-0 px-1.5 py-0.5 rounded-full bg-green-500/10">
                            Done
                          </span>
                        )}
                        {isActive && (
                          <span className="shrink-0 flex gap-0.5">
                            <span className="h-1 w-1 rounded-full animate-[ai-bounce_1.4s_ease-in-out_infinite]" style={{ backgroundColor: accentColor }} />
                            <span className="h-1 w-1 rounded-full animate-[ai-bounce_1.4s_ease-in-out_0.2s_infinite]" style={{ backgroundColor: accentColor }} />
                            <span className="h-1 w-1 rounded-full animate-[ai-bounce_1.4s_ease-in-out_0.4s_infinite]" style={{ backgroundColor: accentColor }} />
                          </span>
                        )}
                        {isError && (
                          <span className="text-[10px] font-semibold text-red-500 shrink-0 px-1.5 py-0.5 rounded-full bg-red-500/10">
                            Failed
                          </span>
                        )}
                      </div>
                      {isActive && step.hint && (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">{step.hint}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error details */}
          {hasError && error && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-red-500/6 border border-red-500/15">
              <div className="flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] font-medium text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {(allDone || hasError) && (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-xl transition-all duration-200 active:scale-[0.98]">
                {hasError ? 'Close' : 'Stay Here'}
              </button>
              {hasError && onRetry && (
                <button onClick={onRetry}
                  className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, #6c5ce7)` }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              )}
              {allDone && resultId && onOpenResult && (
                <button onClick={onOpenResult}
                  className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, #6c5ce7)`, boxShadow: `0 4px 14px ${accentColor}59` }}>
                  {openResultLabel} {openResultIcon}
                </button>
              )}
            </div>
          )}

          {/* Background info */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground/40">
              <RefreshCw className="h-2.5 w-2.5" />
              Safe to minimize — generation continues in background
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
