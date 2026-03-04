'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock, Trash2, Edit3, ChevronRight as ChevronRightIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: 'MEETING', label: 'Meeting', color: '#3b82f6' },
  { value: 'DEADLINE', label: 'Deadline', color: '#ef4444' },
  { value: 'MILESTONE', label: 'Milestone', color: '#8b5cf6' },
  { value: 'REMINDER', label: 'Reminder', color: '#f59e0b' },
  { value: 'OTHER', label: 'Other', color: '#6b7280' },
];

const getEventColor = (type: string) => EVENT_TYPES.find(t => t.value === type)?.color || '#3b82f6';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '', type: 'MEETING', startDate: '', endDate: '', description: '', allDay: true,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const startRange = new Date(year, month, 1).toISOString();
  const endRange = new Date(year, month + 1, 0).toISOString();

  const { data: events } = useQuery({
    queryKey: ['calendar', teamId, year, month],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/calendar/feed?start=${startRange}&end=${endRange}`),
    enabled: !!teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/calendar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', teamId] });
      setShowCreate(false);
      setNewEvent({ title: '', type: 'MEETING', startDate: '', endDate: '', description: '', allDay: true });
      toast.success('Event created');
    },
    onError: () => toast.error('Failed to create event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => api.delete(`/teams/${teamId}/calendar/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', teamId] });
      // Refresh the panel events
      setSelectedDayEvents(prev => prev.filter((e: any) => e.id !== deleteMutation.variables));
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return (events?.data || []).filter((e: any) => {
      const start = new Date(e.startDate).toISOString().split('T')[0];
      return start === dateStr;
    });
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={today} className="px-3 py-1.5 border border-border text-muted-foreground text-sm rounded-lg hover:bg-accent transition-colors">Today</button>
          <div className="flex items-center border border-border rounded-lg">
            <button className="p-1.5 hover:bg-accent rounded-l-lg" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="px-3 text-sm font-medium text-foreground min-w-40 text-center">{monthName}</span>
            <button className="p-1.5 hover:bg-accent rounded-r-lg" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-x-auto bg-card">
        {/* Days header */}
        <div className="grid grid-cols-7 bg-muted min-w-140">
          {days.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 min-w-140">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-25 border-b border-r border-border/50 bg-muted/30" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day}
                className={cn(
                  'min-h-25 border-b border-r border-border/50 p-1.5 cursor-pointer hover:bg-muted/50 transition-colors',
                  isToday(day) && 'bg-[#7b68ee]/5'
                )}
                onClick={() => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  if (dayEvents.length > 0) {
                    // Show detail panel for this day
                    setSelectedDate(dateStr);
                    setSelectedDayEvents(dayEvents);
                    setShowDayPanel(true);
                  } else {
                    // Open create dialog for empty day
                    setNewEvent({ ...newEvent, startDate: dateStr, endDate: dateStr });
                    setShowCreate(true);
                  }
                }}
              >
                <span className={cn(
                  'text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full',
                  isToday(day) ? 'bg-[#7b68ee] text-white' : 'text-muted-foreground'
                )}>
                  {day}
                </span>
                <div className="space-y-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((e: any) => (
                    <div
                      key={e.id}
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{
                        backgroundColor: `${e.color || '#3b82f6'}15`,
                        color: e.color || '#3b82f6',
                        borderLeft: `2px solid ${e.color || '#3b82f6'}`,
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" className="border-border focus:border-[#7b68ee]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Type</label>
              <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Description <span className="font-normal">(optional)</span></label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Add event details..."
                className="border-border focus:border-[#7b68ee] min-h-[60px]"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Start Date</label>
                <Input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} className="border-border focus:border-[#7b68ee]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">End Date</label>
                <Input type="date" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} className="border-border focus:border-[#7b68ee]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate({ ...newEvent, color: getEventColor(newEvent.type) })}
              disabled={!newEvent.title || !newEvent.startDate}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Events Side Panel */}
      <Sheet open={showDayPanel} onOpenChange={(open) => { if (!open) setShowDayPanel(false); }}>
        <SheetContent side="right" hideClose className="w-full sm:w-[420px] md:w-[480px] p-0 border-l border-border">
          <div className="flex flex-col h-full bg-card">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-[#7b68ee]" />
                <span className="text-sm font-semibold text-foreground">
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <button
                onClick={() => setShowDayPanel(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedDayEvents.length} Event{selectedDayEvents.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    setNewEvent({ ...newEvent, startDate: selectedDate || '', endDate: selectedDate || '' });
                    setShowCreate(true);
                  }}
                  className="flex items-center gap-1 text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Event
                </button>
              </div>

              {selectedDayEvents.map((event: any) => {
                const typeInfo = EVENT_TYPES.find(t => t.value === event.type) || EVENT_TYPES[4];
                const eventColor = event.color || typeInfo.color;
                const isExpanded = expandedEvent === event.id;
                return (
                  <div
                    key={event.id}
                    className="rounded-xl border border-border bg-card hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  >
                    {/* Color bar */}
                    <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: eventColor }} />
                    
                    <div className="p-4 space-y-3">
                      {/* Title & actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: eventColor, backgroundColor: `${eventColor}15` }}
                            >
                              {typeInfo.label}
                            </span>
                            {event.allDay && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">All day</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ id: event.id, title: event.title });
                            }}
                            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                          <ChevronRightIcon className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                        </div>
                      </div>

                      {/* Time info (always visible) */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {event.endDate && event.endDate !== event.startDate && (
                          <>
                            <span>→</span>
                            <span>{new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-border space-y-3 animate-in slide-in-from-top-1 fade-in duration-200">
                          {event.description ? (
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground mb-1">Description</p>
                              <p className="text-xs text-foreground leading-relaxed">{event.description}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No description</p>
                          )}
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span>Start: {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            {event.endDate && (
                              <span>End: {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ id: event.id, title: event.title });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedDayEvents.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No events on this day</p>
                  <button
                    onClick={() => {
                      setNewEvent({ ...newEvent, startDate: selectedDate || '', endDate: selectedDate || '' });
                      setShowCreate(true);
                    }}
                    className="mt-2 text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium"
                  >
                    Create one
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="bg-card max-w-sm">
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Delete Event</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{deleteConfirm?.title}&rdquo;</span>?
            </p>
            <p className="text-xs text-muted-foreground/70">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); } }}
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
