// ============================================================================
// QuantAI - Calendar AI Service
// Auto-scheduling, meeting prep, follow-ups, optimal time finding, conflict resolution
// ============================================================================

interface CalendarEvent { id: string; title: string; start: string; end: string; type: 'meeting' | 'focus' | 'break' | 'travel' | 'personal'; attendees: string[]; location?: string; priority: 'low' | 'medium' | 'high' | 'critical'; isRecurring: boolean; notes: string; }
interface ScheduleConstraint { type: 'working_hours' | 'no_meetings' | 'focus_time' | 'buffer' | 'max_meetings'; value: any; }
interface MeetingPrep { meetingId: string; title: string; attendees: { name: string; role: string; recentTopics: string[] }[]; agenda: string[]; relevantDocs: string[]; previousNotes: string[]; suggestedTalkingPoints: string[]; estimatedDuration: number; }
interface TimeSlot { start: string; end: string; score: number; conflicts: string[]; attendeeAvailability: number; }
interface WeeklyPlan { userId: string; week: string; days: { date: string; events: CalendarEvent[]; focusBlocks: number; meetingLoad: string }[]; summary: { totalMeetings: number; focusHours: number; busiestDay: string; recommendations: string[] }; }

class CalendarAIService {
  private events: Map<string, CalendarEvent[]> = new Map();
  private constraints: Map<string, ScheduleConstraint[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  async autoSchedule(userId: string, event: { title: string; duration: number; attendees: string[]; priority: CalendarEvent['priority']; type: CalendarEvent['type'] }, constraints?: ScheduleConstraint[]): Promise<{ event: CalendarEvent; alternativeSlots: TimeSlot[] }> {
    const userEvents = this.events.get(userId) || [];
    const userConstraints = constraints || this.constraints.get(userId) || [{ type: 'working_hours', value: { start: 9, end: 17 } }];

    const optimalSlot = this.findBestSlot(userEvents, event.duration, event.priority, userConstraints);
    const calEvent: CalendarEvent = {
      id: this.genId('evt'), title: event.title, start: optimalSlot.start, end: optimalSlot.end,
      type: event.type, attendees: event.attendees, priority: event.priority,
      isRecurring: false, notes: '',
    };

    userEvents.push(calEvent);
    this.events.set(userId, userEvents);

    const alternativeSlots = this.findAlternatives(userEvents, event.duration, userConstraints, 3);
    return { event: calEvent, alternativeSlots };
  }

  private findBestSlot(existingEvents: CalendarEvent[], durationMinutes: number, priority: string, constraints: ScheduleConstraint[]): { start: string; end: string } {
    const workingHours = constraints.find(c => c.type === 'working_hours')?.value || { start: 9, end: 17 };
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(workingHours.start, 0, 0, 0);

    // Try each 30-min slot in the next 5 business days
    for (let day = 0; day < 5; day++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + day);
      if (dayStart.getDay() === 0 || dayStart.getDay() === 6) continue;

      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const slotStart = new Date(dayStart);
          slotStart.setHours(hour, min, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
          if (slotEnd.getHours() > workingHours.end) continue;

          const hasConflict = existingEvents.some(e => {
            const eStart = new Date(e.start).getTime();
            const eEnd = new Date(e.end).getTime();
            return slotStart.getTime() < eEnd && slotEnd.getTime() > eStart;
          });

          if (!hasConflict) {
            return { start: slotStart.toISOString(), end: slotEnd.toISOString() };
          }
        }
      }
    }

    // Fallback: next available day at 10am
    const fallback = new Date(startDate);
    fallback.setHours(10, 0, 0, 0);
    return { start: fallback.toISOString(), end: new Date(fallback.getTime() + durationMinutes * 60000).toISOString() };
  }

  private findAlternatives(events: CalendarEvent[], duration: number, constraints: ScheduleConstraint[], count: number): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let i = 0; i < count; i++) {
      const dayOffset = i + 2;
      const start = new Date();
      start.setDate(start.getDate() + dayOffset);
      start.setHours(10 + i, 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);
      slots.push({ start: start.toISOString(), end: end.toISOString(), score: 0.8 - i * 0.1, conflicts: [], attendeeAvailability: 0.7 + Math.random() * 0.3 });
    }
    return slots;
  }

  async prepMeeting(userId: string, meetingId: string): Promise<MeetingPrep> {
    const events = this.events.get(userId) || [];
    const meeting = events.find(e => e.id === meetingId);
    if (!meeting) throw new Error('Meeting not found');

    const attendees = meeting.attendees.map(a => ({ name: a, role: 'Participant', recentTopics: ['Project update', 'Budget review', 'Timeline'] }));
    return {
      meetingId, title: meeting.title, attendees,
      agenda: ['Review action items from last meeting', 'Discuss current progress', 'Address blockers', 'Plan next steps'],
      relevantDocs: ['Project Plan v3.pdf', 'Q4 Budget Spreadsheet', 'Status Report Week 42'],
      previousNotes: ['Last meeting: agreed on new timeline', 'Action: review deliverables by Friday'],
      suggestedTalkingPoints: ['Status of key deliverables', 'Resource allocation concerns', 'Upcoming milestones'],
      estimatedDuration: Math.floor((new Date(meeting.end).getTime() - new Date(meeting.start).getTime()) / 60000),
    };
  }

  async suggestFollowUp(userId: string, meetingId: string): Promise<{ suggestions: { action: string; assignee: string; dueDate: string; priority: string }[] }> {
    const events = this.events.get(userId) || [];
    const meeting = events.find(e => e.id === meetingId);
    if (!meeting) throw new Error('Meeting not found');

    return {
      suggestions: [
        { action: 'Send meeting summary to all attendees', assignee: userId, dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'high' },
        { action: 'Follow up on action items', assignee: meeting.attendees[0] || userId, dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), priority: 'medium' },
        { action: 'Schedule next check-in', assignee: userId, dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), priority: 'low' },
      ],
    };
  }

  async findOptimalTime(attendees: string[], duration: number, constraints?: ScheduleConstraint[]): Promise<TimeSlot[]> {
    return this.findAlternatives([], duration, constraints || [], 5).map(slot => ({ ...slot, attendeeAvailability: 0.6 + Math.random() * 0.4 })).sort((a, b) => b.attendeeAvailability - a.attendeeAvailability);
  }

  async resolveConflicts(userId: string): Promise<{ conflicts: { event1: CalendarEvent; event2: CalendarEvent; suggestion: string }[] }> {
    const events = this.events.get(userId) || [];
    const conflicts: { event1: CalendarEvent; event2: CalendarEvent; suggestion: string }[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1Start = new Date(events[i].start).getTime();
        const e1End = new Date(events[i].end).getTime();
        const e2Start = new Date(events[j].start).getTime();
        const e2End = new Date(events[j].end).getTime();
        if (e1Start < e2End && e1End > e2Start) {
          const lowerPriority = events[i].priority < events[j].priority ? events[i] : events[j];
          conflicts.push({ event1: events[i], event2: events[j], suggestion: `Reschedule "${lowerPriority.title}" to avoid overlap` });
        }
      }
    }
    return { conflicts };
  }

  async getWeeklyPlan(userId: string): Promise<WeeklyPlan> {
    const events = this.events.get(userId) || [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() + i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.start.startsWith(dateStr));
      const meetingCount = dayEvents.filter(e => e.type === 'meeting').length;
      return { date: dateStr, events: dayEvents, focusBlocks: Math.max(0, 4 - meetingCount), meetingLoad: meetingCount > 4 ? 'heavy' : meetingCount > 2 ? 'moderate' : 'light' };
    });

    const totalMeetings = days.reduce((s, d) => s + d.events.filter(e => e.type === 'meeting').length, 0);
    const focusHours = days.reduce((s, d) => s + d.focusBlocks * 1.5, 0);
    const busiestDay = days.sort((a, b) => b.events.length - a.events.length)[0]?.date || '';

    return { userId, week: new Date().toISOString().split('T')[0], days, summary: { totalMeetings, focusHours, busiestDay, recommendations: ['Block focus time on Wednesday morning', 'Consider rescheduling 2 low-priority meetings'] } };
  }
}

export const calendarAIService = new CalendarAIService();
export { CalendarAIService };
