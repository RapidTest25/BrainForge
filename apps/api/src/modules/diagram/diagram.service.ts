import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const DIAGRAM_PROMPT = `You are an expert software architect and diagram designer. Generate diagram data based on user descriptions.

Output MUST be valid JSON with this structure:
{
  "nodes": [
    { "id": "1", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "Node Name", "description": "Optional description" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "relationship", "animated": false }
  ]
}

Rules:
- Position nodes in a readable layout (spread them out, avoid overlaps)
- Use meaningful labels and descriptions
- Create logical connections between nodes
- For ERD: include columns in description field as bullet list
- For flowcharts: use animated edges for primary flow
- For mind maps: use a radial layout pattern
- ONLY output the JSON, no other text`;

class DiagramService {
  async create(teamId: string, userId: string, data: { title: string; type: string; description?: string }) {
    return prisma.diagram.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        type: data.type as any,
        description: data.description,
        data: { nodes: [], edges: [] },
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string) {
    return prisma.diagram.findMany({
      where: { teamId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(diagramId: string) {
    const diagram = await prisma.diagram.findUnique({
      where: { id: diagramId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!diagram) throw new NotFoundError('Diagram not found');
    return diagram;
  }

  async update(diagramId: string, data: { title?: string; description?: string; data?: any; thumbnail?: string }) {
    return prisma.diagram.update({
      where: { id: diagramId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async delete(diagramId: string) {
    await prisma.diagram.delete({ where: { id: diagramId } });
  }

  async generateWithAI(
    userId: string,
    provider: string,
    model: string,
    description: string,
    diagramType: string
  ) {
    const messages: ChatMsg[] = [
      { role: 'system', content: DIAGRAM_PROMPT },
      {
        role: 'user',
        content: `Generate a ${diagramType} diagram for the following:\n\n${description}\n\nOutput only valid JSON.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.3 });

    // Parse JSON from response
    let diagramData: any;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diagramData = JSON.parse(jsonMatch[0]);
      } else {
        diagramData = JSON.parse(result.content);
      }
    } catch {
      diagramData = { nodes: [], edges: [], error: 'Failed to parse AI response' };
    }

    return diagramData;
  }

  async generateAndSave(
    teamId: string,
    userId: string,
    provider?: string,
    model?: string,
    title?: string,
    description?: string,
    diagramType?: string
  ) {
    const diagramData = await this.generateWithAI(userId, provider || '', model || '', description || '', diagramType || 'FREEFORM');

    return prisma.diagram.create({
      data: {
        teamId,
        createdBy: userId,
        title: title || 'AI Generated Diagram',
        type: (diagramType || 'FREEFORM') as any,
        description,
        data: diagramData,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }
}

export const diagramService = new DiagramService();
