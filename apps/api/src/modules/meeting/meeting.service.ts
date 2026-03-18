import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';

function stripMarkdownToken(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function deriveTitleFromSummary(summary: string, fallback: string): string {
  const candidates = summary
    .split('\n')
    .map((line) => stripMarkdownToken(line))
    .filter((line) => line.length >= 12)
    .filter((line) => !/^summary:?$/i.test(line))
    .filter((line) => !/^ringkasan:?$/i.test(line))
    .filter((line) => !/^action items?:?$/i.test(line))
    .filter((line) => !/^next (steps?|actions?):?$/i.test(line));

  const picked = candidates[0];
  if (!picked) return fallback;

  const compact = picked.replace(/\s+/g, ' ').trim();
  if (compact.length <= 78) return compact;
  return `${compact.slice(0, 75).trimEnd()}...`;
}

function deriveDescriptionFromSummary(summary: string): string | undefined {
  const paragraph = summary
    .split('\n')
    .map((line) => stripMarkdownToken(line))
    .filter((line) => line.length > 20)
    .find((line) => !line.toLowerCase().includes('action item') && !line.toLowerCase().includes('next step'));

  if (!paragraph) return undefined;
  return paragraph.length > 220 ? `${paragraph.slice(0, 217).trimEnd()}...` : paragraph;
}

function shouldAutoRetitleMeeting(meeting: { title: string; description: string | null; meetLink: string | null }): boolean {
  const isGenericTitle = /^meet\s+recording\s*-\s*/i.test(meeting.title);
  const isExtensionDescription = /google meet via brainforge extension|live recording from google meet/i.test(
    meeting.description || '',
  );
  const isGoogleMeetLink = /meet\.google\.com/i.test(meeting.meetLink || '');

  return isGenericTitle && (isExtensionDescription || isGoogleMeetLink);
}

class MeetingService {
  async getMeetings(teamId: string, options?: { projectId?: string; limit?: number; offset?: number }) {
    return prisma.meeting.findMany({
      where: {
        teamId,
        ...(options?.projectId ? { projectId: options.projectId } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getMeeting(id: string) {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }

  async createMeeting(teamId: string, userId: string, data: {
    title: string;
    description?: string;
    meetLink?: string;
    startTime?: string;
    endTime?: string;
    projectId?: string;
    transcript?: string;
    status?: string;
  }) {
    return prisma.meeting.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        description: data.description,
        meetLink: data.meetLink,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        projectId: data.projectId,
        transcript: data.transcript,
        ...(data.status ? { status: data.status as any } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }

  async updateMeeting(id: string, userId: string, data: {
    title?: string;
    description?: string;
    meetLink?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    transcript?: string;
    projectId?: string | null;
  }) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('Meeting not found');
    if (meeting.createdBy !== userId) throw new Error('Unauthorized');

    return prisma.meeting.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.meetLink !== undefined ? { meetLink: data.meetLink } : {}),
        ...(data.startTime !== undefined ? { startTime: new Date(data.startTime) } : {}),
        ...(data.endTime !== undefined ? { endTime: new Date(data.endTime) } : {}),
        ...(data.status !== undefined ? { status: data.status as any } : {}),
        ...(data.transcript !== undefined ? { transcript: data.transcript } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }

  async deleteMeeting(id: string, userId: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('Meeting not found');
    if (meeting.createdBy !== userId) throw new Error('Unauthorized');
    return prisma.meeting.delete({ where: { id } });
  }

  async summarizeTranscript(id: string, userId: string, provider: string, model: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('Meeting not found');
    if (!meeting.transcript) throw new Error('No transcript available to summarize');

    const messages = [
      {
        role: 'system' as const,
        content: `You are a meeting assistant. Summarize the following meeting transcript into:
1. A concise summary of what was discussed
2. Key action items with assignees if mentioned
3. Important decisions made

Format the output in markdown. Use the same language as the transcript.`,
      },
      {
        role: 'user' as const,
        content: `Meeting: ${meeting.title}\n\nTranscript:\n${meeting.transcript}`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages);

    // Parse action items from the AI response
    const actionItemsMatch = result.content.match(/action items?:?\s*\n([\s\S]*?)(?:\n#|\n\*\*|$)/i);
    const actionItems = actionItemsMatch
      ? actionItemsMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')).map(l => l.replace(/^[\s\-\*]+/, '').trim())
      : [];

    const shouldRetitle = shouldAutoRetitleMeeting(meeting);
    const autoTitle = shouldRetitle ? deriveTitleFromSummary(result.content, meeting.title) : undefined;
    const autoDescription = shouldRetitle ? deriveDescriptionFromSummary(result.content) : undefined;

    return prisma.meeting.update({
      where: { id },
      data: {
        ...(autoTitle ? { title: autoTitle } : {}),
        ...(autoDescription ? { description: autoDescription } : {}),
        summary: result.content,
        actionItems: actionItems.length > 0 ? actionItems : undefined,
        provider,
        model,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }
}

export const meetingService = new MeetingService();
