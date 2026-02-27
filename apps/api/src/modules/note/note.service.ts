import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

class NoteService {
  async create(teamId: string, userId: string, data: { title: string; content?: string; projectId?: string }) {
    return prisma.note.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        content: data.content || '',
        projectId: data.projectId,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string, projectId?: string) {
    return prisma.note.findMany({
      where: { teamId, ...(projectId && { projectId }) },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(noteId: string) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!note) throw new NotFoundError('Note not found');
    return note;
  }

  async update(noteId: string, userId: string, data: { title?: string; content?: string }) {
    // Save version history
    const current = await prisma.note.findUnique({ where: { id: noteId } });
    if (current) {
      await prisma.noteHistory.create({
        data: {
          noteId,
          content: current.content,
          editedBy: userId,
          version: current.version,
        },
      });
    }
    return prisma.note.update({
      where: { id: noteId },
      data: { ...data, version: { increment: 1 }, updatedAt: new Date() },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async delete(noteId: string) {
    await prisma.noteHistory.deleteMany({ where: { noteId } });
    await prisma.note.delete({ where: { id: noteId } });
  }

  async getHistory(noteId: string) {
    return prisma.noteHistory.findMany({
      where: { noteId },
      include: { editor: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async restoreVersion(noteId: string, historyId: string, userId: string) {
    const history = await prisma.noteHistory.findUnique({ where: { id: historyId } });
    if (!history) throw new NotFoundError('Version not found');
    return this.update(noteId, userId, { content: history.content });
  }

  async aiAssist(userId: string, provider: string, model: string, content: string, action: string) {
    const prompts: Record<string, string> = {
      summarize: 'Summarize the following content concisely, keeping key points:',
      expand: 'Expand and elaborate on the following content with more detail and examples:',
      improve: 'Improve the writing quality, clarity, and structure of the following content:',
      translate_en: 'Translate the following content to English, keeping the formatting:',
      translate_id: 'Translate the following content to Indonesian (Bahasa Indonesia), keeping the formatting:',
      fix_grammar: 'Fix grammar and spelling errors in the following content:',
      generate_outline: 'Generate a detailed outline based on the following topic/content:',
    };

    const prompt = prompts[action] || prompts.improve;
    const messages: ChatMsg[] = [
      { role: 'system', content: 'You are a helpful writing assistant. Respond only with the improved/modified content.' },
      { role: 'user', content: `${prompt}\n\n${content}` },
    ];

    const result = await aiService.chat(userId, provider, model, messages);
    return result.content;
  }
}

export const noteService = new NoteService();
