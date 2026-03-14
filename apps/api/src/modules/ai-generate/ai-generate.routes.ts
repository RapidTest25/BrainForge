import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { aiService } from '../../ai/ai.service.js';
import { prisma } from '../../lib/prisma.js';

// ── Enum safety sets ────────────────────────────────────────────────
const VALID_PRIORITIES = new Set(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
const VALID_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']);
const VALID_BRAINSTORM_MODES = new Set(['BRAINSTORM', 'DEBATE', 'ANALYSIS', 'FREEFORM']);
const ALLOWED_TYPES = new Set(['tasks', 'brainstorm', 'notes', 'goals', 'sprints']);

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
function buildSystemPrompt(requestedKeys: string[], existingContext: string) {
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

EXISTING PROJECT CONTEXT (use this to avoid duplication and make output relevant):
${existingContext}

SPECIFICITY RULES (CRITICAL — MUST FOLLOW):
- Output must be DIRECTLY relevant to the user's prompt, not generic.
- Use the existing project context above to:
  • Avoid creating tasks/goals that already exist.
  • Reference existing sprints, goals, or priorities where logical.
  • Ensure deadlines, team sizes, and priorities are realistic given the context.
- Every title must be actionable and specific — reference the actual topic from the user's prompt.
- Every description must include concrete steps or criteria, not vague statements.

LANGUAGE (CRITICAL — MUST FOLLOW):
- Detect the language of the user's input/prompt.
- Write ALL output text in the SAME language as the user's input.
- If the user writes in Indonesian (Bahasa Indonesia), ALL titles, descriptions, content, and text MUST be in Indonesian.
- If the user writes in English, output in English.
- Do NOT mix languages. Be consistent throughout.

SCHEMAS (only include requested keys):
${requestedKeys.includes('tasks') ? `
"tasks": an array of 3 to 8 objects. Each object must include:
- "title": string, 5-70 chars, starts with a verb, specific and actionable (in user's language).
  Example: "Implementasikan validasi JWT pada endpoint login"
- "description": string, must include:
  • What exactly needs to be done (specific to the prompt)
  • Step-by-step breakdown (use \\n for line breaks)
  • Deliverable: what the done state looks like
  • Acceptance criteria: how to verify it is complete
  (in user's language)
- "priority": one of ["URGENT","HIGH","MEDIUM","LOW"] — choose based on impact and dependencies
- "status": exactly "TODO"

TASK QUALITY RULES:
- Each task must be independently completable (no vague "research X" tasks).
- Avoid duplicating any task already in the existing context.
- If the prompt is about a feature, break it into implementation sub-tasks (e.g., API, UI, validation, tests).
- Assign URGENT/HIGH to tasks that are blockers for others.
` : ''}
${requestedKeys.includes('sprints') ? `
"sprints": an array of 1 to 2 objects. Each object must include:
- "title": string, sprint name in format "Sprint N: <focus area>" (in user's language)
- "goal": string, 2-4 sentences describing what will be achieved by end of sprint (in user's language)
  • Be specific about which features/modules will be done
  • Include a measurable definition of done
- "deadline": ISO 8601 date string, 2-4 weeks from today (${new Date().toISOString().split('T')[0]})
- "teamSize": number, realistic team size (1-10, default 3 if not specified)
- "status": exactly "DRAFT"

SPRINT QUALITY RULES:
- Sprint goal must link directly to the user's prompt.
- Deadline must be realistic (not in the past, not more than 6 weeks away).
- If multiple sprints, make them sequential — Sprint 2 builds on Sprint 1.
- Avoid overlap with any active sprint already in the existing context.
` : ''}
${requestedKeys.includes('brainstorm') ? `
"brainstorm": an object with:
- "title": string, max 80 chars (in user's language)
- "mode": exactly "BRAINSTORM"
- "initialMessage": string, a facilitator opener (in user's language) that includes:
  • Clear goal of the session (specific to the user's prompt)
  • 4-6 guiding questions using \\n- bullet format — questions must be thought-provoking and specific
  • Suggested approach: "10 menit diverge (semua ide diterima), lalu 10 menit konverge (pilih yang terbaik)"
` : ''}
${requestedKeys.includes('notes') ? `
"notes": an array of 1 to 3 objects. Each object must include:
- "title": string, max 80 chars (in user's language)
- "content": string, structured content using \\n and '-' bullet points where helpful (in user's language).
  Must include: decisions made, assumptions, key constraints, and actionable next steps.
  Minimum 80 words per note.
` : ''}
${requestedKeys.includes('goals') ? `
"goals": an array of 2 to 5 objects. Each object must include:
- "title": string, max 100 chars, written as a measurable outcome (in user's language).
  Example: "Tingkatkan konversi checkout sebesar 20% dalam 3 bulan"
- "description": string, must include:
  • Why this goal matters (business/project impact)
  • Key Results (3-4 measurable KRs) using \\n- bullet format
  • Milestones (what done looks like at 25%, 50%, 75%, 100%)
  (in user's language)
- "status": exactly "NOT_STARTED"
- "progress": number 0
- "dueDate": ISO 8601 date string, realistic deadline within 1-12 months from ${new Date().toISOString().split('T')[0]}

GOALS QUALITY RULES:
- Each goal must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
- Key results must be quantifiable (e.g., "reduce bug count by 40%", not "improve quality").
- Vary due dates — spread them across the timeline (not all on the same date).
- Do not duplicate goals already in the existing context.
` : ''}
IMPORTANT: Return ONLY valid JSON now.
`.trim();
}

// ── Fetch existing context for a team (used to avoid duplication) ───
async function getExistingContext(teamId: string, projectId?: string): Promise<string> {
  const where = { teamId, ...(projectId ? { projectId } : {}) };
  const [tasks, goals, sprints] = await Promise.all([
    prisma.task.findMany({
      where, select: { title: true, status: true, priority: true }, orderBy: { updatedAt: 'desc' }, take: 25,
    }),
    prisma.goal.findMany({
      where, select: { title: true, status: true, progress: true }, orderBy: { updatedAt: 'desc' }, take: 10,
    }),
    prisma.sprintPlan.findMany({
      where: { teamId, ...(projectId ? { projectId } : {}) },
      select: { title: true, goal: true, status: true, deadline: true },
      orderBy: { updatedAt: 'desc' }, take: 5,
    }),
  ]);

  const parts: string[] = [];
  if (tasks.length) {
    parts.push(`Existing tasks (${tasks.length}):\n${tasks.map(t => `- [${t.status}][${t.priority}] ${t.title}`).join('\n')}`);
  }
  if (goals.length) {
    parts.push(`Existing goals (${goals.length}):\n${goals.map(g => `- [${g.status}] ${g.title} (${g.progress}%)`).join('\n')}`);
  }
  if (sprints.length) {
    parts.push(`Existing sprints (${sprints.length}):\n${sprints.map(s => `- [${s.status}] ${s.title}: ${s.goal.slice(0, 80)} (deadline: ${new Date(s.deadline).toLocaleDateString()})`).join('\n')}`);
  }
  return parts.length ? parts.join('\n\n') : 'No existing data — this is a fresh project.';
}

export const aiGenerateRoutes: FastifyPluginAsync = async (app) => {
  // AI Generate endpoint — generates tasks, brainstorm ideas, notes based on user prompt
  app.post<{
    Params: { teamId: string };
    Body: {
      prompt: string;
      provider: string;
      model: string;
      generateTypes: string[];
      projectId?: string;
    };
  }>('/:teamId/ai-generate', {
    preHandler: [authGuard],
  }, async (request, reply) => {
    const userId = (request as any).user.id;
    const { teamId } = request.params;
    const { prompt, provider, model, generateTypes, projectId } = request.body;

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
        error: { message: 'No valid generateTypes provided. Allowed: tasks, brainstorm, notes, goals, sprints' },
      });
    }

    // ── Fetch existing context to help AI avoid duplication ───────
    const existingContext = await getExistingContext(teamId, projectId);
    const systemPrompt = buildSystemPrompt(normalizedTypes, existingContext);

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

      const created: any = { tasks: [], brainstorm: null, notes: [], goals: [], sprints: [] };

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
                ...(projectId ? { projectId } : {}),
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
              ...(projectId ? { projectId } : {}),
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
                ...(projectId ? { projectId } : {}),
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
                ...(projectId ? { projectId } : {}),
              },
            });
            created.goals.push(g);
          } catch (e: any) {
            console.error('Failed to create goal:', e.message);
          }
        }
      }

      // ── Create sprints ──────────────────────────────────────────
      const VALID_SPRINT_STATUSES = new Set(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
      if (normalizedTypes.includes('sprints') && parsed.sprints && Array.isArray(parsed.sprints)) {
        for (const sprint of parsed.sprints) {
          if (!sprint.title || !sprint.goal || !sprint.deadline) continue;
          const safeStatus = VALID_SPRINT_STATUSES.has(sprint.status) ? sprint.status : 'DRAFT';
          let deadlineDate: Date;
          try { deadlineDate = new Date(sprint.deadline); if (isNaN(deadlineDate.getTime())) throw new Error(); }
          catch { deadlineDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000); }
          try {
            const s = await prisma.sprintPlan.create({
              data: {
                title: sprint.title.slice(0, 200),
                goal: sprint.goal,
                deadline: deadlineDate,
                teamSize: typeof sprint.teamSize === 'number' ? Math.min(20, Math.max(1, sprint.teamSize)) : 3,
                status: safeStatus as any,
                teamId,
                createdBy: userId,
                ...(projectId ? { projectId } : {}),
              },
            });
            created.sprints.push(s);
          } catch (e: any) {
            console.error('Failed to create sprint:', e.message);
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
            sprints: created.sprints.length,
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
