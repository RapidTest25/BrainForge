import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const DIAGRAM_PROMPT = `You are an expert diagram designer. Generate diagrams in draw.io mxGraphModel XML format.

Output MUST be valid draw.io XML starting with <mxGraphModel> and ending with </mxGraphModel>.
The root must contain <root> with cell id="0" and cell id="1" parent="0" as the first two cells.

IMPORTANT: All text values in XML attributes MUST be XML-escaped:
- & → &amp;  < → &lt;  > → &gt;  " → &quot;  ' → &apos;
- For multi-line text in labels, use &#xa; for newlines

CELL ID RULES:
- Use simple numeric string IDs: "2", "3", "4", etc.
- Edge IDs can be like "e1", "e2", etc.
- Cell 0 and 1 are reserved for the graph root.

TYPE-SPECIFIC TEMPLATES:

FLOWCHART:
- Start/End: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" (green)
- Process: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" (blue)
- Decision: style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" (yellow diamond)
- Edges: style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
- Layout: top-to-bottom, y increments of 100, centered at x=200
- Width: 160, Height: 60 for process, 80x80 for decisions

ERD (Entity Relationship Diagram):
- Table header: style="shape=table;startSize=30;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeSizeByChildColumns=0;fillColor=#dae8fc;strokeColor=#6c8ebf;html=1;whiteSpace=wrap;"
- Table row: Use child cells with style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;html=1;" as container
  - Inside each row, 3 cells: column name, type, constraints (PK/FK)
- Use parent= to nest rows inside tables
- Position tables in grid layout (x increments of 300, y increments of 300)
- Edges between tables: style="edgeStyle=entityRelationEdgeStyle;fontSize=12;html=1;" with relationship labels

MINDMAP:
- Central node: style="ellipse;whiteSpace=wrap;html=1;fillColor=#7b68ee;fontColor=#ffffff;strokeColor=#6c5ce7;fontSize=16;" (large, ~180x80)
- Level 1: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;" (~140x50)
- Level 2: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;" (~120x40)
- Central at (350, 250), branches radiate outward
- Edges: style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;"

ARCHITECTURE:
- Service/Component: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;shadow=1;" (~160x60)
- Database: style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;" (~120x80)
- Gateway/Load Balancer: style="shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#fff2cc;strokeColor=#d6b656;" (~160x60)
- Client/External: style="shape=mxgraph.aws3.users;fillColor=#D2D3D3;strokeColor=none;" or simple rounded rect
- Queue: style="shape=process;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;" (~140x40)
- Organize in layers: clients on top, services in middle, data at bottom
- Edges with protocol labels: style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"

SEQUENCE:
- Participant boxes at top: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" (~120x40)
- Lifelines: style="endArrow=none;dashed=1;html=1;strokeColor=#999999;" (vertical dashed lines below each participant)
- Messages (arrows): style="html=1;" or style="html=1;dashed=1;" for returns
- Position participants horizontally at y=20, spaced 200px apart
- Messages go left-to-right or right-to-left between lifelines at increasing y positions (40px increments)

COMPONENT:
- Component: style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
- Interface: style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" (small ~40x40)
- Package: style="shape=folder;fontStyle=1;spacingTop=10;tabWidth=40;tabHeight=14;tabPosition=left;html=1;fillColor=#f5f5f5;strokeColor=#666666;"
- Edges: style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;" with labels like "uses", "implements"

GENERAL RULES:
- Generate 5-15 cells (not counting root cells 0 and 1) for a comprehensive diagram
- Use fillColor, strokeColor, fontColor for visual distinction
- All vertex cells must have vertex="1" parent="1"
- All edge cells must have edge="1" parent="1" source="X" target="Y"
- Geometry: vertex cells need <mxGeometry x="X" y="Y" width="W" height="H" as="geometry"/>
- Geometry: edge cells need <mxGeometry relative="1" as="geometry"/>
- Space nodes well apart (minimum 150px) to avoid overlaps
- ONLY output the XML, no other text, no markdown code fences`;

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
        content: `Generate a ${diagramType} diagram for the following:\n\n${description}\n\nOutput only valid draw.io XML. No markdown, no code fences, just the raw XML starting with <mxGraphModel>.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.3 });

    // Extract draw.io XML from response
    let xml: string;
    const xmlMatch = result.content.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/);
    if (xmlMatch) {
      xml = xmlMatch[0];
    } else {
      // Try to strip markdown code fences
      const stripped = result.content
        .replace(/```xml\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const retryMatch = stripped.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/);
      if (retryMatch) {
        xml = retryMatch[0];
      } else {
        throw new AppError(422, 'AI_PARSE_ERROR', 'AI did not return valid draw.io XML');
      }
    }

    return { xml };
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
