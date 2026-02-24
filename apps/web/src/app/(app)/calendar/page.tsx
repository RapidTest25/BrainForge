'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
  { value: 'MEETING', label: 'Meeting', color: '#3b82f6' },
  { value: 'DEADLINE', label: 'Deadline', color: '#ef4444' },
  { value: 'MILESTONE', label: 'Milestone', color: '#8b5cf6' },
  { value: 'REMINDER', label: 'Reminder', color: '#f59e0b' },
  { value: 'OTHER', label: 'Other', color: '#6b7280' },
];

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
    },
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
        <h1 className="text-xl font-semibold text-[#1a1a2e]">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={today} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">Today</button>
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button className="p-1.5 hover:bg-gray-50 rounded-l-lg" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <span className="px-3 text-sm font-medium text-[#1a1a2e] min-w-40 text-center">{monthName}</span>
            <button className="p-1.5 hover:bg-gray-50 rounded-r-lg" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4 text-gray-500" />
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
      <div className="border border-gray-100 rounded-xl overflow-x-auto bg-white">
        {/* Days header */}
        <div className="grid grid-cols-7 bg-gray-50 min-w-140">
          {days.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-gray-400 border-b border-gray-100">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 min-w-140">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-25 border-b border-r border-gray-50 bg-gray-50/30" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day}
                className={cn(
                  'min-h-25 border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-gray-50/50 transition-colors',
                  isToday(day) && 'bg-[#7b68ee]/5'
                )}
                onClick={() => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  setNewEvent({ ...newEvent, startDate: dateStr, endDate: dateStr });
                  setShowCreate(true);
                }}
              >
                <span className={cn(
                  'text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full',
                  isToday(day) ? 'bg-[#7b68ee] text-white' : 'text-gray-600'
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
                    <span className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Title</label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" className="border-gray-200 focus:border-[#7b68ee]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Type</label>
              <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Start Date</label>
                <Input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} className="border-gray-200 focus:border-[#7b68ee]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">End Date</label>
                <Input type="date" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} className="border-gray-200 focus:border-[#7b68ee]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate(newEvent)}
              disabled={!newEvent.title || !newEvent.startDate}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
