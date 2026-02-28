import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const DIAGRAM_PROMPT = `You are an expert software architect and diagram designer. Generate diagram data based on user descriptions.

Output MUST be valid JSON with this structure:
{
  "nodes": [
    { "id": "1", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "Node Name", "description": "Optional description" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "relationship" }
  ]
}

TYPE-SPECIFIC RULES:

FLOWCHART:
- Position nodes top-to-bottom (increment y by 120 for each step)
- Use meaningful labels. Start first node with "Start", end with "End"
- Decision nodes should have labels ending with "?"
- Edge labels: "Yes", "No" for decisions, or action descriptions
- Spread x positions (200px apart) for parallel branches

ERD (Entity Relationship Diagram):
- Each node is a database table. Label = table name (e.g. "Users", "Orders")
- Description MUST list columns, one per line in format: "column_name: TYPE (PK)" or "column_name: TYPE (FK)"
  Example description: "id: UUID (PK)\nname: VARCHAR\nemail: VARCHAR\ncreated_at: TIMESTAMP"
- Position tables in a grid layout (x increments of 300, y increments of 250)
- Edge labels should show relationship type: "1:N", "1:1", "N:M", or "has many", "belongs to"

MINDMAP:
- First node is the CENTRAL topic, position at center (x:350, y:250)
- Branch nodes radiate outward from center
- Level 1 branches: position at radius ~200px from center in a circle
- Level 2 branches: position at radius ~350px from center
- Edge connections flow outward from center. No labels needed on edges.
- Use short, concise labels

ARCHITECTURE:
- Nodes represent system components/services/layers
- Use labels like "API Gateway", "Auth Service", "Database Layer", "CDN"
- Position in logical layers: top=presentation, middle=business, bottom=data
- Space nodes 250px apart in x, 180px in y
- Edge labels: "REST", "gRPC", "WebSocket", "SQL", etc.

SEQUENCE:
- Nodes represent actors/participants (e.g. "Client", "Server", "Database")
- Position ALL nodes horizontally at y:30, spaced 200px apart in x
- Edge labels describe messages: "POST /login", "SELECT * FROM users", "200 OK"
- Multiple edges between same nodes represent sequential messages

COMPONENT:
- Nodes represent software modules/components
- Labels: "AuthModule", "UserService", "PaymentGateway", etc.
- Position in a logical dependency layout
- Edge labels: "uses", "implements", "depends on", "provides"

GENERAL RULES:
- Position nodes in a readable layout (spread them out, avoid overlaps, minimum 150px apart)
- Use meaningful labels and descriptions
- Create logical connections between nodes
- Generate 5-10 nodes and appropriate edges for a comprehensive diagram
- ONLY output the JSON, no other text`;

class DiagramService {
  async create(teamId: string, userId: string, data: { title: string; type: string; description?: string; projectId?: string }) {
    return prisma.diagram.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        type: data.type as any,
        description: data.description,
        data: { nodes: [], edges: [] },
        projectId: data.projectId,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string, projectId?: string) {
    return prisma.diagram.findMany({
      where: { teamId, ...(projectId && { projectId }) },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(diagramId: string, teamId?: string) {
    const diagram = await prisma.diagram.findUnique({
      where: { id: diagramId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!diagram) throw new NotFoundError('Diagram not found');
    if (teamId && diagram.teamId !== teamId) {
      throw new NotFoundError('Diagram not found');
    }
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
    diagramType?: string,
    projectId?: string
  ) {
    const diagramData = await this.generateWithAI(userId, provider || '', model || '', description || '', diagramType || 'FLOWCHART');

    // If AI failed to parse, throw instead of saving empty diagram
    if (diagramData.error) {
      throw new AppError(422, 'AI_PARSE_ERROR', diagramData.error);
    }

    return prisma.diagram.create({
      data: {
        teamId,
        createdBy: userId,
        title: title || 'AI Generated Diagram',
        type: (diagramType || 'FLOWCHART') as any,
        description,
        data: diagramData,
        projectId,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }
}

export const diagramService = new DiagramService();
