'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, Trash2, Loader2, Bell, AlignLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Constants ──
type ViewType = 'month' | 'week' | 'day';

const EVENT_TYPES = [
  { value: 'MEETING', label: 'Meeting', color: '#3b82f6' },
  { value: 'DEADLINE', label: 'Deadline', color: '#ef4444' },
  { value: 'MILESTONE', label: 'Milestone', color: '#8b5cf6' },
  { value: 'REMINDER', label: 'Reminder', color: '#f59e0b' },
  { value: 'OTHER', label: 'Other', color: '#6b7280' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getEventColor = (type: string, color?: string) => {
  if (color) return color;
  return EVENT_TYPES.find(t => t.value === type)?.color || '#3b82f6';
};

// ── Helpers ──
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Main ──
export default function CalendarPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '', type: 'MEETING', startDate: '', startTime: '09:00',
    endDate: '', endTime: '10:00', description: '', allDay: false,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute date range for query based on view
  const queryRange = useMemo(() => {
    if (view === 'month') {
      const s = new Date(year, month, 1);
      const e = new Date(year, month + 1, 0, 23, 59, 59);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      return { start: days[0].toISOString(), end: new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate(), 23, 59, 59).toISOString() };
    }
    const s = new Date(year, month, currentDate.getDate());
    const e = new Date(year, month, currentDate.getDate(), 23, 59, 59);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [view, currentDate, year, month]);

  const { data: eventsRes } = useQuery({
    queryKey: ['calendar', teamId, queryRange.start, queryRange.end],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/calendar/feed?start=${queryRange.start}&end=${queryRange.end}`),
    enabled: !!teamId,
  });
  const events: any[] = eventsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/calendar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', teamId] });
      setShowCreate(false);
      resetNewEvent();
      toast.success('Event created');
    },
    onError: () => toast.error('Failed to create event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => api.delete(`/teams/${teamId}/calendar/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', teamId] });
      setDeleteConfirm(null);
      setShowDetail(null);
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  function resetNewEvent() {
    setNewEvent({ title: '', type: 'MEETING', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', description: '', allDay: false });
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function getHeaderLabel() {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`;
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      const s = days[0]; const e = days[6];
      if (s.getMonth() === e.getMonth()) return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
      return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function openCreateForDate(dateStr: string, time?: string) {
    setNewEvent({
      title: '',
      startDate: dateStr,
      endDate: dateStr,
      startTime: time || '09:00',
      endTime: time ? `${String(Math.min(23, parseInt(time.split(':')[0]) + 1)).padStart(2, '0')}:00` : '10:00',
      allDay: !time,
      description: '',
      type: 'MEETING',
    });
    setShowCreate(true);
  }

  function handleCreate() {
    const base: any = {
      title: newEvent.title,
      type: newEvent.type,
      description: newEvent.description || undefined,
      allDay: newEvent.allDay,
      color: getEventColor(newEvent.type),
    };
    if (newEvent.allDay) {
      base.startDate = newEvent.startDate;
      base.endDate = newEvent.endDate || newEvent.startDate;
    } else {
      base.startDate = `${newEvent.startDate}T${newEvent.startTime}:00`;
      base.endDate = `${newEvent.endDate || newEvent.startDate}T${newEvent.endTime}:00`;
    }
    createMutation.mutate(base);
  }

  // ── Render ──
  return (
    <div className="h-full flex flex-col max-w-full">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-1 pb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
          <div className="flex items-center gap-1 border border-border rounded-lg bg-card">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-accent rounded-l-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-foreground min-w-48 text-center select-none">
              {getHeaderLabel()}
            </span>
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-accent rounded-r-lg transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
            {(['month', 'week', 'day'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  view === v ? 'bg-[#7b68ee] text-white' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => openCreateForDate(toDateStr(currentDate))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'month' && <MonthView currentDate={currentDate} events={events} onDateClick={openCreateForDate} onEventClick={setShowDetail} />}
        {view === 'week' && <WeekView currentDate={currentDate} events={events} onSlotClick={openCreateForDate} onEventClick={setShowDetail} />}
        {view === 'day' && <DayView currentDate={currentDate} events={events} onSlotClick={openCreateForDate} onEventClick={setShowDetail} />}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-[#7b68ee]" />
              </div>
              New Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newEvent.title}
              onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Add title"
              className="border-0 border-b border-border rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-[#7b68ee] placeholder:text-muted-foreground/50"
              autoFocus
            />

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.allDay}
                    onChange={e => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="rounded border-border accent-[#7b68ee]"
                  />
                  <span className="text-xs text-muted-foreground">All day</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={newEvent.startDate} onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value, endDate: e.target.value })} className="text-sm h-8" />
                  {!newEvent.allDay && (
                    <Input type="time" value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} className="text-sm h-8" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={newEvent.endDate} onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })} className="text-sm h-8" />
                  {!newEvent.allDay && (
                    <Input type="time" value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })} className="text-sm h-8" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={newEvent.type} onValueChange={v => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger className="h-8 text-sm border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3">
              <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              <Textarea
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Add description"
                className="border-border/60 text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newEvent.title || !newEvent.startDate || createMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={v => { if (!v) setShowDetail(null); }}>
        <DialogContent className="bg-card max-w-sm p-0 overflow-hidden">
          {showDetail && (() => {
            const eventColor = getEventColor(showDetail.type, showDetail.color);
            const typeInfo = EVENT_TYPES.find(t => t.value === showDetail.type) || EVENT_TYPES[4];
            const start = new Date(showDetail.startDate);
            const end = showDetail.endDate ? new Date(showDetail.endDate) : null;
            const isVirtualEvent = typeof showDetail.id === 'string' && (showDetail.id.startsWith('task-') || showDetail.id.startsWith('sprint-'));
            return (
              <>
                <div className="h-2" style={{ backgroundColor: eventColor }} />
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{showDetail.title}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: eventColor, backgroundColor: `${eventColor}15` }}>
                      {typeInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <div>
                      <p>{start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      {!showDetail.allDay && (
                        <p className="text-xs">{formatTime(start)}{end ? ` – ${formatTime(end)}` : ''}</p>
                      )}
                      {showDetail.allDay && <p className="text-xs">All day</p>}
                    </div>
                  </div>

                  {showDetail.description && (
                    <div className="flex items-start gap-3 text-sm">
                      <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-foreground leading-relaxed">{showDetail.description}</p>
                    </div>
                  )}

                  {!isVirtualEvent && (
                    <div className="flex justify-end pt-2 border-t border-border">
                      <button
                        onClick={() => setDeleteConfirm({ id: showDetail.id, title: showDetail.title })}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="bg-card max-w-sm">
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Delete Event</h3>
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">&ldquo;{deleteConfirm?.title}&rdquo;</span>?
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); } }}
              disabled={deleteMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ════════════════════════════════════════════════
// MONTH VIEW
// ════════════════════════════════════════════════
function MonthView({ currentDate, events, onDateClick, onEventClick }: {
  currentDate: Date; events: any[]; onDateClick: (date: string) => void; onEventClick: (e: any) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const now = new Date();

  function getEventsForDay(day: number) {
    const date = new Date(year, month, day);
    return events.filter(e => isSameDay(new Date(e.startDate), date));
  }

  const isToday = (day: number) => now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card h-full flex flex-col">
      <div className="grid grid-cols-7 bg-muted/50">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`e-${i}`} className="border-b border-r border-border/40 bg-muted/20" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDay(day);
          const dateStr = toDateStr(new Date(year, month, day));
          return (
            <div
              key={day}
              className={cn(
                'border-b border-r border-border/40 p-1 cursor-pointer hover:bg-accent/30 transition-colors overflow-hidden',
                isToday(day) && 'bg-[#7b68ee]/5'
              )}
              onClick={() => onDateClick(dateStr)}
            >
              <span className={cn(
                'text-[11px] font-medium inline-flex h-6 w-6 items-center justify-center rounded-full mb-0.5',
                isToday(day) ? 'bg-[#7b68ee] text-white' : 'text-muted-foreground'
              )}>
                {day}
              </span>
              <div className="space-y-px">
                {dayEvents.slice(0, 3).map(e => {
                  const color = getEventColor(e.type, e.color);
                  return (
                    <button
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                      className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80"
                      style={{ backgroundColor: `${color}20`, color, borderLeft: `2px solid ${color}` }}
                    >
                      {!e.allDay && <span className="opacity-70">{formatTime(new Date(e.startDate))} </span>}
                      {e.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground font-medium pl-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// WEEK VIEW
// ════════════════════════════════════════════════
function WeekView({ currentDate, events, onSlotClick, onEventClick }: {
  currentDate: Date; events: any[]; onSlotClick: (date: string, time?: string) => void; onEventClick: (e: any) => void;
}) {
  const weekDays = getWeekDays(currentDate);
  const now = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 60;

  useEffect(() => {
    if (scrollRef.current) {
      const hour = Math.max(0, now.getHours() - 1);
      scrollRef.current.scrollTop = hour * HOUR_HEIGHT;
    }
  }, []);

  function getTimedEvents(date: Date) {
    return events.filter(e => {
      const start = new Date(e.startDate);
      return isSameDay(start, date) && !e.allDay;
    });
  }

  function getAllDayEvents(date: Date) {
    return events.filter(e => {
      const start = new Date(e.startDate);
      return isSameDay(start, date) && e.allDay;
    });
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card h-full flex flex-col">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30 shrink-0">
        <div className="border-r border-border/40" />
        {weekDays.map((d, i) => {
          const isT = isSameDay(d, now);
          const allDay = getAllDayEvents(d);
          return (
            <div key={i} className={cn('text-center py-2 border-r border-border/40', isT && 'bg-[#7b68ee]/5')}>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{DAY_NAMES_SHORT[d.getDay()]}</p>
              <p className={cn(
                'text-lg font-bold mt-0.5 h-8 w-8 inline-flex items-center justify-center rounded-full',
                isT ? 'bg-[#7b68ee] text-white' : 'text-foreground'
              )}>{d.getDate()}</p>
              {allDay.length > 0 && (
                <div className="px-1 space-y-px mt-1">
                  {allDay.slice(0, 2).map(e => {
                    const color = getEventColor(e.type, e.color);
                    return (
                      <button key={e.id} onClick={() => onEventClick(e)}
                        className="w-full text-[9px] font-medium px-1 py-0.5 rounded truncate text-left hover:opacity-80"
                        style={{ backgroundColor: `${color}20`, color }}>
                        {e.title}
                      </button>
                    );
                  })}
                  {allDay.length > 2 && <span className="text-[9px] text-muted-foreground">+{allDay.length - 2}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          <div className="border-r border-border/40 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-muted-foreground font-medium" style={{ top: h * HOUR_HEIGHT - 6 }}>
                {h === 0 ? '' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}
              </div>
            ))}
          </div>

          {weekDays.map((day, di) => {
            const isT = isSameDay(day, now);
            const timedEvents = getTimedEvents(day);
            const dateStr = toDateStr(day);

            return (
              <div key={di} className={cn('relative border-r border-border/40', isT && 'bg-[#7b68ee]/[0.02]')}>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border/30 cursor-pointer hover:bg-accent/20 transition-colors"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(dateStr, `${String(h).padStart(2, '0')}:00`)}
                  />
                ))}

                {isT && (() => {
                  const mins = now.getHours() * 60 + now.getMinutes();
                  const top = (mins / 60) * HOUR_HEIGHT;
                  return (
                    <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top }}>
                      <div className="flex items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px]" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  );
                })()}

                {timedEvents.map(e => {
                  const start = new Date(e.startDate);
                  const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
                  const startMins = start.getHours() * 60 + start.getMinutes();
                  const endMins = end.getHours() * 60 + end.getMinutes();
                  const topPx = (startMins / 60) * HOUR_HEIGHT;
                  const heightPx = Math.max(20, ((endMins - startMins) / 60) * HOUR_HEIGHT);
                  const color = getEventColor(e.type, e.color);

                  return (
                    <button
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                      className="absolute left-1 right-1 rounded-md px-1.5 py-1 text-left z-10 overflow-hidden hover:brightness-95 transition-all border-l-[3px]"
                      style={{
                        top: topPx, height: heightPx,
                        backgroundColor: `${color}18`,
                        borderColor: color,
                        color,
                      }}
                    >
                      <p className="text-[10px] font-bold truncate leading-tight">{e.title}</p>
                      {heightPx > 30 && (
                        <p className="text-[9px] opacity-70">{formatTime(start)} – {formatTime(end)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// DAY VIEW
// ════════════════════════════════════════════════
function DayView({ currentDate, events, onSlotClick, onEventClick }: {
  currentDate: Date; events: any[]; onSlotClick: (date: string, time?: string) => void; onEventClick: (e: any) => void;
}) {
  const now = new Date();
  const isT = isSameDay(currentDate, now);
  const scrollRef = useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 64;

  useEffect(() => {
    if (scrollRef.current) {
      const hour = Math.max(0, now.getHours() - 1);
      scrollRef.current.scrollTop = hour * HOUR_HEIGHT;
    }
  }, []);

  const timedEvents = events.filter(e => {
    const start = new Date(e.startDate);
    return isSameDay(start, currentDate) && !e.allDay;
  });
  const allDayEvents = events.filter(e => {
    const start = new Date(e.startDate);
    return isSameDay(start, currentDate) && e.allDay;
  });

  const dateStr = toDateStr(currentDate);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card h-full flex flex-col">
      <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-12 w-12 rounded-xl flex flex-col items-center justify-center',
            isT ? 'bg-[#7b68ee] text-white' : 'bg-muted text-foreground'
          )}>
            <span className="text-[10px] uppercase font-bold tracking-wider leading-none">{DAY_NAMES_SHORT[currentDate.getDay()]}</span>
            <span className="text-lg font-bold leading-tight">{currentDate.getDate()}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {allDayEvents.length > 0 && (
              <p className="text-xs text-muted-foreground">{allDayEvents.length} all-day event{allDayEvents.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {allDayEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {allDayEvents.map(e => {
              const color = getEventColor(e.type, e.color);
              return (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${color}18`, color, borderLeft: `3px solid ${color}` }}
                >
                  {e.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_1fr]" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          <div className="border-r border-border/40 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute right-3 text-[11px] text-muted-foreground font-medium" style={{ top: h * HOUR_HEIGHT - 7 }}>
                {h === 0 ? '' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}
              </div>
            ))}
          </div>

          <div className="relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-border/30 cursor-pointer hover:bg-accent/20 transition-colors"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => onSlotClick(dateStr, `${String(h).padStart(2, '0')}:00`)}
              />
            ))}

            {isT && (() => {
              const mins = now.getHours() * 60 + now.getMinutes();
              const top = (mins / 60) * HOUR_HEIGHT;
              return (
                <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top }}>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-500 -ml-[6px]" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                </div>
              );
            })()}

            {timedEvents.map(e => {
              const start = new Date(e.startDate);
              const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
              const startMins = start.getHours() * 60 + start.getMinutes();
              const endMins = end.getHours() * 60 + end.getMinutes();
              const topPx = (startMins / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(24, ((endMins - startMins) / 60) * HOUR_HEIGHT);
              const color = getEventColor(e.type, e.color);

              return (
                <button
                  key={e.id}
                  onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                  className="absolute left-2 right-4 rounded-lg px-3 py-1.5 text-left z-10 overflow-hidden hover:brightness-95 transition-all border-l-4 shadow-sm"
                  style={{
                    top: topPx, height: heightPx,
                    backgroundColor: `${color}15`,
                    borderColor: color,
                    color,
                  }}
                >
                  <p className="text-xs font-bold truncate">{e.title}</p>
                  {heightPx > 36 && (
                    <p className="text-[10px] opacity-70 mt-0.5">{formatTime(start)} – {formatTime(end)}</p>
                  )}
                  {heightPx > 60 && e.description && (
                    <p className="text-[10px] opacity-50 mt-1 line-clamp-2">{e.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
