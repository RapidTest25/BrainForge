import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { aiService } from '../../ai/ai.service.js';
import { prisma } from '../../lib/prisma.js';

export const aiGenerateRoutes: FastifyPluginAsync = async (app) => {
  // AI Generate endpoint — generates tasks, brainstorm ideas, notes based on user prompt
  app.post<{
    Params: { teamId: string };
    Body: {
      prompt: string;
      provider: string;
      model: string;
      generateTypes: string[]; // ['tasks', 'brainstorm', 'notes']
    };
  }>('/:teamId/ai-generate', {
    preHandler: [authGuard],
  }, async (request, reply) => {
    const userId = (request as any).user.id;
    const { teamId } = request.params;
    const { prompt, provider, model, generateTypes } = request.body;

    if (!prompt || !provider || !model || !generateTypes?.length) {
      return reply.status(400).send({
        success: false,
        error: { message: 'prompt, provider, model, and generateTypes are required' },
      });
    }

    const systemPrompt = `You are a project management AI assistant. Based on the user's description, generate structured output in JSON format.
The user wants to generate: ${generateTypes.join(', ')}.

Return a JSON object with these keys (only include keys the user requested):
${generateTypes.includes('tasks') ? `- "tasks": Array of objects with { "title": string, "description": string, "priority": "URGENT"|"HIGH"|"MEDIUM"|"LOW", "status": "TODO" }` : ''}
${generateTypes.includes('brainstorm') ? `- "brainstorm": Object with { "title": string, "mode": "BRAINSTORM", "initialMessage": string } — a brainstorm session starter` : ''}
${generateTypes.includes('notes') ? `- "notes": Array of objects with { "title": string, "content": string }` : ''}

Generate practical, actionable items. For tasks, create 3-8 well-defined tasks with clear titles and descriptions.
For brainstorm, create an engaging session topic. For notes, create 1-3 detailed notes.
ONLY return valid JSON, no markdown formatting, no code blocks.`;

    try {
      const result = await aiService.chat(userId, provider, model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      let parsed: any;
      try {
        // Try to extract JSON from the response
        let content = result.content.trim();
        // Remove potential markdown code blocks
        if (content.startsWith('```')) {
          content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        parsed = JSON.parse(content);
      } catch {
        return reply.status(422).send({
          success: false,
          error: { message: 'AI returned invalid JSON. Try again.' },
          raw: result.content,
        });
      }

      const created: any = { tasks: [], brainstorm: null, notes: [] };

      // Create tasks
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          try {
            const t = await prisma.task.create({
              data: {
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'MEDIUM',
                status: task.status || 'TODO',
                teamId,
                creatorId: userId,
              },
            });
            created.tasks.push(t);
          } catch (e) {
            // skip invalid tasks
          }
        }
      }

      // Create brainstorm session
      if (parsed.brainstorm) {
        try {
          const session = await prisma.brainstormSession.create({
            data: {
              title: parsed.brainstorm.title || 'AI Generated Session',
              mode: parsed.brainstorm.mode || 'BRAINSTORM',
              teamId,
              userId,
              context: prompt,
              messages: parsed.brainstorm.initialMessage ? {
                create: {
                  role: 'ASSISTANT',
                  content: parsed.brainstorm.initialMessage,
                },
              } : undefined,
            },
            include: { messages: true },
          });
          created.brainstorm = session;
        } catch (e) {
          // skip
        }
      }

      // Create notes
      if (parsed.notes && Array.isArray(parsed.notes)) {
        for (const note of parsed.notes) {
          try {
            const n = await prisma.note.create({
              data: {
                title: note.title,
                content: note.content || '',
                teamId,
                userId,
              },
            });
            created.notes.push(n);
          } catch (e) {
            // skip invalid notes
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          generated: parsed,
          created,
          summary: {
            tasks: created.tasks.length,
            brainstorm: created.brainstorm ? 1 : 0,
            notes: created.notes.length,
          },
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: { message: error.message || 'AI generation failed' },
      });
    }
  });
};
