import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { aiService } from '../../ai/ai.service.js';
import { prisma } from '../../lib/prisma.js';

// ── Enum safety sets ────────────────────────────────────────────────
const VALID_PRIORITIES = new Set(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
const VALID_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']);
const VALID_BRAINSTORM_MODES = new Set(['BRAINSTORM', 'DEBATE', 'ANALYSIS', 'FREEFORM']);
const ALLOWED_TYPES = new Set(['tasks', 'brainstorm', 'notes', 'goals']);

// ── JSON parser with markdown-fence stripping ───────────────────────
const tryParseJson = (raw: string) => {
  let content = raw.trim();
  // Strip markdown code fences
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  // Extract first JSON object if surrounded by text
  const match = content.match(/\{[\s\S]*\}/);
  if (match) content = match[0];
  return JSON.parse(content);
};

// ── Build strict system prompt ──────────────────────────────────────
function buildSystemPrompt(requestedKeys: string[]) {
  return `
You are a Project Management AI assistant that must output ONLY strict JSON.

ABSOLUTE OUTPUT RULES (must follow):
- Output must be exactly ONE JSON object, and nothing else.
- No markdown, no code fences, no comments, no explanations.
- Use double quotes for all keys and string values.
- No trailing commas.
- Do not include any keys other than the requested top-level keys.

REQUESTED TOP-LEVEL KEYS:
${requestedKeys.map((k) => `"${k}"`).join(', ')}

LANGUAGE:
- Write all text in the same language as the user.

SCHEMAS (only include requested keys):
${requestedKeys.includes('tasks') ? `
"tasks": an array of 3 to 8 objects. Each object must include:
- "title": string, 5-70 chars, starts with a verb, actionable
- "description": string, includes: steps + deliverable + acceptance criteria (use \\n for new lines)
- "priority": one of ["URGENT","HIGH","MEDIUM","LOW"]
- "status": exactly "TODO"

TASK QUALITY RULES:
- Tasks must be practical and implementable.
- Avoid duplicates.
- Prefer measurable outcomes (e.g., "Add Zod validation for AI output").
- If user input lacks details, create reasonable assumptions inside "description" (do not ask questions).
` : ''}
${requestedKeys.includes('brainstorm') ? `
"brainstorm": an object with:
- "title": string, max 80 chars
- "mode": exactly "BRAINSTORM"
- "initialMessage": string, a facilitator opener that includes:
  - goal of the session
  - 3-6 guiding questions using \\n- bullet format
  - timebox suggestion (e.g., "10 minutes diverge, 10 minutes converge")
BRAINSTORM RULES:
- Make it engaging but focused on the user's prompt.
` : ''}
${requestedKeys.includes('notes') ? `
"notes": an array of 1 to 3 objects. Each object must include:
- "title": string, max 80 chars
- "content": string, structured with \\n and '-' bullets where helpful.
NOTES RULES:
- Include decisions, assumptions, and next steps.
- Actionable, no filler.
` : ''}
${requestedKeys.includes('goals') ? `
"goals": an array of 3 to 6 objects. Each object must include:
- "title": string, max 100 chars, clear and measurable (SMART goal format)
- "description": string, detailed with success criteria, key results, and milestones (use \\n for new lines)
- "status": exactly "NOT_STARTED"
- "progress": number 0
- "dueDate": ISO 8601 date string, realistic deadline (within 1-12 months from now)
GOALS RULES:
- Goals must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
- Each goal should have clear success criteria in description.
- Vary due dates across goals (not all on the same date).
- Make goals strategic and aligned with the user's prompt.
` : ''}
IMPORTANT:
- Return ONLY valid JSON now.
`.trim();
}

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

    // ── Normalize generateTypes ───────────────────────────────────
    const normalizedTypes = (generateTypes || [])
      .map((t) => (t || '').toLowerCase().trim())
      .filter((t) => ALLOWED_TYPES.has(t));

    if (!normalizedTypes.length) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No valid generateTypes provided. Allowed: tasks, brainstorm, notes, goals' },
      });
    }

    const systemPrompt = buildSystemPrompt(normalizedTypes);

    try {
      const result = await aiService.chat(userId, provider, model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      // ── Parse JSON with repair pass ─────────────────────────────
      let parsed: any;
      try {
        parsed = tryParseJson(result.content);
      } catch {
        // Repair attempt — ask AI to fix its own broken output
        const repairPrompt = `Fix the following text into a SINGLE valid JSON object that follows the required schema.
Rules:
- Output ONLY JSON (no markdown, no extra text)
- Keep the same meaning
- Remove any non-JSON text
Text to fix:
${result.content}`;

        try {
          const repaired = await aiService.chat(userId, provider, model, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: repairPrompt },
          ]);
          parsed = tryParseJson(repaired.content);
        } catch {
          return reply.status(422).send({
            success: false,
            error: { message: 'AI returned invalid JSON even after repair attempt. Please try again.' },
            raw: result.content,
          });
        }
      }

      const created: any = { tasks: [], brainstorm: null, notes: [], goals: [] };

      // ── Create tasks with enum safety ───────────────────────────
      if (normalizedTypes.includes('tasks') && parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          if (!task.title) continue;
          const safePriority = VALID_PRIORITIES.has(task.priority) ? task.priority : 'MEDIUM';
          const safeStatus = VALID_STATUSES.has(task.status) ? task.status : 'TODO';
          try {
            const t = await prisma.task.create({
              data: {
                title: task.title.slice(0, 200),
                description: task.description || '',
                priority: safePriority,
                status: safeStatus,
                teamId,
                createdBy: userId,
              },
            });
            created.tasks.push(t);
          } catch (e: any) {
            console.error('Failed to create task:', e.message);
          }
        }
      }

      // ── Create brainstorm session with enum safety ──────────────
      if (normalizedTypes.includes('brainstorm') && parsed.brainstorm) {
        const safeMode = VALID_BRAINSTORM_MODES.has(parsed.brainstorm.mode) ? parsed.brainstorm.mode : 'BRAINSTORM';
        try {
          const session = await prisma.brainstormSession.create({
            data: {
              title: (parsed.brainstorm.title || 'AI Generated Session').slice(0, 200),
              mode: safeMode,
              teamId,
              createdBy: userId,
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
        } catch (e: any) {
          console.error('Failed to create brainstorm:', e.message);
        }
      }

      // ── Create notes ────────────────────────────────────────────
      if (normalizedTypes.includes('notes') && parsed.notes && Array.isArray(parsed.notes)) {
        for (const note of parsed.notes) {
          if (!note.title) continue;
          try {
            const n = await prisma.note.create({
              data: {
                title: note.title.slice(0, 200),
                content: note.content || '',
                teamId,
                createdBy: userId,
              },
            });
            created.notes.push(n);
          } catch (e: any) {
            console.error('Failed to create note:', e.message);
          }
        }
      }

      // ── Create goals ────────────────────────────────────────────
      const VALID_GOAL_STATUSES = new Set(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']);
      if (normalizedTypes.includes('goals') && parsed.goals && Array.isArray(parsed.goals)) {
        for (const goal of parsed.goals) {
          if (!goal.title) continue;
          const safeStatus = VALID_GOAL_STATUSES.has(goal.status) ? goal.status : 'NOT_STARTED';
          try {
            const g = await prisma.goal.create({
              data: {
                title: goal.title.slice(0, 200),
                description: goal.description || '',
                status: safeStatus,
                progress: typeof goal.progress === 'number' ? Math.min(100, Math.max(0, goal.progress)) : 0,
                dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
                teamId,
                createdBy: userId,
              },
            });
            created.goals.push(g);
          } catch (e: any) {
            console.error('Failed to create goal:', e.message);
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
            goals: created.goals.length,
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
