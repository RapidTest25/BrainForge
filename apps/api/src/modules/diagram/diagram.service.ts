import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const DIAGRAM_PROMPT = `You are an elite professional diagram designer specializing in creating comprehensive, thesis-grade, publication-quality diagrams in draw.io mxGraphModel XML format.

=== CONTEXT INFERENCE & EXPANSION ===
CRITICAL: Users will often provide VAGUE, SHORT, or INCOMPLETE prompts. Your job is to INTELLIGENTLY EXPAND any prompt into a COMPREHENSIVE, DETAILED, PROFESSIONAL diagram. NEVER generate a simple or minimal diagram.

EXPANSION RULES:
- If user says "e-commerce" → Generate FULL system: user registration, product catalog, cart, checkout, payment gateway, order management, shipping, notifications, admin panel, inventory, reviews, recommendations
- If user says "login system" → Generate: user input, validation, captcha, authentication, 2FA/OTP, session management, token refresh, password reset, social auth, error handling, rate limiting, audit logging
- If user says "chat app" → Generate: user management, WebSocket connection, room management, message handling, file upload, push notifications, read receipts, typing indicators, message search, moderation, encryption
- For ANY topic: think of ALL related sub-systems, processes, components, actors, and data flows. Generate AT MINIMUM 15–30 nodes covering the complete picture.
- Think like a senior software architect preparing diagrams for a thesis or enterprise documentation.
- Include error handling paths, edge cases, parallel processes, and feedback loops.
- Add descriptive labels on edges (e.g., "validates", "sends request", "returns data", "on failure")

Output MUST be valid draw.io XML starting with <mxGraphModel> and ending with </mxGraphModel>.
The root must contain <root> with cell id="0" and cell id="1" parent="0" as the first two cells.

IMPORTANT: All text values in XML attributes MUST be XML-escaped:
- & → &amp;  < → &lt;  > → &gt;  " → &quot;  ' → &apos;

CELL ID RULES:
- Use simple numeric string IDs: "2", "3", "4", etc.
- Edge IDs: "e1", "e2", etc.
- Cell 0 and 1 are reserved for the graph root.

CRITICAL LAYOUT RULES:
- Every vertex cell MUST have explicit x, y, width, height in <mxGeometry>
- NO overlapping nodes — calculate positions carefully with generous spacing
- Make diagrams LARGE and READABLE
- ONLY output the raw XML, no markdown, no code fences, no explanations

=== PROFESSIONAL STYLING ===
- Use shadow=1 on important nodes for depth
- Use rounded=1 on process boxes
- Use gradient-like color schemes: each logical group gets its own color family
- Color palette: blue=#dae8fc/#6c8ebf, green=#d5e8d4/#82b366, yellow=#fff2cc/#d6b656, red=#f8cecc/#b85450, purple=#e1d5e7/#9673a6, orange=#ffe6cc/#d79b00, teal=#b1ddf0/#10739e, pink=#f5c2c7/#c94f6d
- Title/header nodes: fontSize=15-16, fontStyle=1 (bold)
- Regular nodes: fontSize=13
- Sub-items: fontSize=12
- Edge labels: fontSize=11, fontStyle=0

=== FLOWCHART ===
Top-to-bottom flow with multiple branches, parallel paths, and comprehensive process steps.

STRUCTURE RULES:
- Main flow: center column at x=350, start y=40, vertical spacing 130px
- Decision diamonds branch left (x=50) and right (x=650) then reconverge
- Use swim-lane style: add labeled separator rectangles for phases
- Start/End: rounded=1;arcSize=50;fillColor=#d5e8d4;strokeColor=#82b366
- Process: rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf
- Decision: rhombus;fillColor=#fff2cc;strokeColor=#d6b656
- Error/Exception: rounded=1;fillColor=#f8cecc;strokeColor=#b85450
- Sub-process: rounded=1;fillColor=#e1d5e7;strokeColor=#9673a6
- Edge labels: "Yes"/"No" on decisions, action verbs on process edges

MINIMUM: 12-25 nodes, 3+ decision points, at least 1 error/exception path, 1 parallel branch.

=== MINDMAP ===
RADIAL layout with center node and branches spreading outward in all directions.

STRUCTURE:
- ONE central node (ellipse) at the exact center of the canvas
- Level 1 branches: evenly distributed AROUND the center (top, right, bottom, left, and diagonals)
- Level 2 sub-branches: extend OUTWARD from their parent level-1 node
- Level 3 (optional): extend even further in same direction
- ALL edges use source/target attributes connecting parent→child

POSITIONING RULES:
- Canvas center: (450, 350)
- Central node: x=350, y=305, width=200, height=90
- Level 1 nodes (6-8): arranged in a circle at radius ~300px from center
- Level 2 nodes: ~200px further from center than parent, in SAME angular direction
- Level 3 nodes: ~170px further than L2

COLOR RULES:
- Center: fillColor=#7b68ee;fontColor=#ffffff;strokeColor=#6c5ce7;fontSize=16;fontStyle=1
- Each level-1 branch uses a UNIQUE color family (blue, green, yellow, red, purple, orange, teal, pink)
- Level-2: lighter version of parent's color (#e1d5e7 with #9673a6 stroke)
- Level-3: even lighter or grey-toned
- Center→L1 edges: strokeWidth=2, curved=1
- L1→L2 edges: strokeWidth=1.5, strokeColor=#999999
- L2→L3 edges: strokeWidth=1, strokeColor=#bbbbbb

MINIMUM: 6-8 level-1 branches, each with 2-4 level-2 children. Total 25-40 nodes.

=== ERD ===
Grid layout with table shapes. Each table has a header row and multiple field rows with data types.

TABLE STRUCTURE:
- Header: shape=table;startSize=30;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center
- Rows are CHILDREN of the table (parent=tableId), stacked at y=30, 60, 90, etc., each height=30
- PK fields: fontStyle=1 (bold), include "(PK)" label
- FK fields: fontColor=#CC0000, include "(FK)" label  
- Include data types: "id (PK) INT", "name VARCHAR(100)", "email VARCHAR(255) UNIQUE", "created_at TIMESTAMP"
- Table width=280, height = 30 + (numFields × 30)

LAYOUT:
- Grid: tables at x=60, x=420, x=780 (360px apart horizontally)
- Vertical rows at y=40, y=350, y=660 (310px apart)
- Use different fillColor per table: blue, green, yellow, red, purple, orange
- Edges: entityRelationEdgeStyle with "1 : *" or "1 : 1" or "* : *" labels

MINIMUM: 5-8 tables with 4-8 fields each, proper FK relationships connecting related tables.

=== ARCHITECTURE ===
Multi-layer horizontal architecture with clear separation of concerns.

LAYER STRUCTURE (top to bottom):
1. PRESENTATION LAYER (y=40): Clients/Frontend — red/pink colors
2. API LAYER (y=220): Gateway, Load Balancer — yellow/orange colors  
3. SERVICE LAYER (y=400): Microservices — blue colors
4. DATA LAYER (y=600): Databases, Caches, Message Queues — green colors
5. INFRASTRUCTURE LAYER (y=780): Monitoring, Logging, CI/CD — grey/purple colors

Add LAYER LABEL rectangles: full-width translucent background behind each row.

SHAPES:
- Clients: rounded=1;shadow=1
- Gateway: shape=hexagon;perimeter=hexagonPerimeter2
- Services: rounded=1;shadow=1
- Databases: shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=15
- Queues: shape=mxgraph.arrows2.bendDoubleArrow or shape=parallelogram
- Cache: shape=cylinder3 with different color

LAYOUT: Items 220px apart horizontally (x=60, x=280, x=500, x=720, x=940).
MINIMUM: 4-5 layers, 3-5 items per layer, 15-25 total components.

=== SEQUENCE ===
UML Sequence Diagram — participants across top, message arrows going down.

Step 1 — Participant boxes across the top at y=30:
  style="shape=mxgraph.sequence.object;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=13;" width=150, height=50
  Space 220px apart: x=60, x=280, x=500, x=720, x=940

Step 2 — Lifeline (dashed vertical line) below each participant:
  style="endArrow=none;dashed=1;html=1;strokeColor=#999999;dashPattern=5 5;" edge="1" parent="1"
  sourcePoint = (center_x, 80); targetPoint = (center_x, last_message_y + 80)

Step 3 — Message arrows (HORIZONTAL, top-to-bottom):
  Forward: style="html=1;strokeWidth=2;" Return: style="html=1;dashed=1;strokeWidth=1.5;strokeColor=#999999;"
  Use mxPoint sourcePoint/targetPoint (NOT source/target attributes).
  y-positions: 120, 170, 220, 270, 320, 370, 420, 470, 520, 570...

LABEL RULES:
- Use descriptive action labels: "POST /api/login", "Verify credentials", "Generate JWT", "Return 200 OK"
- Include error paths: "Return 401 Unauthorized"
- Use different fillColors per participant: blue, green, yellow, red, purple

MINIMUM: 4-6 participants, 10-18 messages covering the full interaction flow including error cases.

=== COMPONENT ===
Grouped layout with folder packages containing component shapes.

STRUCTURE:
- Packages: shape=folder;fontStyle=1;spacingTop=10;tabWidth=50;tabHeight=14;tabPosition=left
- Components: shape=component;align=left;spacingLeft=36;rounded=1
- Interfaces: shape=ellipse (small, 30x30) with <<interface>> stereotype
- Dependencies: dashed edges with "<<uses>>" or "<<depends>>" labels
  
LAYOUT:
- 3-4 packages (folders), 300px apart vertically
- Each package contains 3-5 components, 200px apart horizontally
- 40px padding from package edges
- Add inter-package dependency edges

COLOR:
- Each package gets a unique color theme
- Components inherit lighter color from parent package
- Package 1: blue, Package 2: green, Package 3: yellow, Package 4: purple

MINIMUM: 3-4 packages with 3-5 components each, 15-25 total elements.

=== GENERAL RULES ===
- Generate 15-35 meaningful cells for comprehensive, professional diagrams
- Every vertex: vertex="1" parent="1" (unless child of container) with EXPLICIT <mxGeometry>
- Every edge: edge="1" parent="1" source="X" target="Y" (except SEQUENCE which uses mxPoints)
- Use distinct fillColor/strokeColor per node category
- Labels: descriptive, concise (2-6 words per node), action verbs on edges
- Add shadow=1 on primary nodes for professional depth
- NEVER generate fewer than 15 nodes — elaborate and expand
- ONLY output raw XML, no markdown, no code fences`;

// ── Post-process XML to fix overlapping nodes ──

interface NodePos {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseVertexPositions(xml: string): NodePos[] {
  const cellBlocks = xml.match(/<mxCell[^>]*vertex="1"[\s\S]*?(?:<\/mxCell>|<mxGeometry[^/]*\/>[\s\n]*<\/mxCell>)/g) || [];
  const positions: NodePos[] = [];

  for (const block of cellBlocks) {
    const idMatch = block.match(/id="([^"]*)"/);
    const geoMatch = block.match(/x="([^"]*)".*?y="([^"]*)".*?width="([^"]*)".*?height="([^"]*)"/);
    if (idMatch && geoMatch) {
      positions.push({
        id: idMatch[1],
        x: parseFloat(geoMatch[1]) || 0,
        y: parseFloat(geoMatch[2]) || 0,
        w: parseFloat(geoMatch[3]) || 120,
        h: parseFloat(geoMatch[4]) || 60,
      });
    }
  }
  return positions;
}

function applyPositions(xml: string, positions: NodePos[]): string {
  let fixedXml = xml;
  for (const pos of positions) {
    const escapedId = pos.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match geometry x/y in any order
    const cellPattern = new RegExp(
      `(<mxCell[^>]*id="${escapedId}"[^>]*>[\\s\\S]*?<mxGeometry[^>]*?)x="[^"]*"([^>]*?)y="[^"]*"`,
      'g'
    );
    fixedXml = fixedXml.replace(cellPattern, `$1x="${Math.round(pos.x)}"$2y="${Math.round(pos.y)}"`);
  }
  return fixedXml;
}

function fixSequenceDiagram(xml: string): string {
  const positions = parseVertexPositions(xml);
  if (positions.length < 2) return xml;

  // Separate participants (top-row boxes) from other elements like activation boxes
  // Participants are typically the first N nodes with low y-values (< 100)
  // Sort by x to maintain left-to-right order
  const sortedByY = [...positions].sort((a, b) => a.y - b.y);

  // Find participant row: nodes in the first "cluster" of y positions (within 60px of the min y)
  const minY = sortedByY[0].y;
  const participants = sortedByY.filter(n => n.y < minY + 60);
  const otherNodes = sortedByY.filter(n => n.y >= minY + 60);

  if (participants.length < 2) return xml;

  // Sort participants left-to-right by original x
  participants.sort((a, b) => a.x - b.x);

  // Re-layout participants with proper spacing
  const PARTICIPANT_Y = 30;
  const PARTICIPANT_W = 150;
  const PARTICIPANT_H = 50;
  const H_SPACING = 220; // horizontal gap between participant starts
  const START_X = 60;

  for (let i = 0; i < participants.length; i++) {
    participants[i].x = START_X + i * H_SPACING;
    participants[i].y = PARTICIPANT_Y;
    participants[i].w = PARTICIPANT_W;
    participants[i].h = PARTICIPANT_H;
  }

  // Fix activation boxes or other sub-elements — ensure they don't overlap participants
  // Sort other nodes by y for consistent vertical layout
  otherNodes.sort((a, b) => a.y - b.y);

  // If there are small boxes below the participants (activation boxes), snap them to lifeline centers
  for (const node of otherNodes) {
    if (node.w <= 20) {
      // Likely an activation box — snap to nearest participant center
      let nearestCenterX = participants[0].x + PARTICIPANT_W / 2;
      let minDist = Math.abs(node.x + node.w / 2 - nearestCenterX);
      for (const p of participants) {
        const cx = p.x + PARTICIPANT_W / 2;
        const d = Math.abs(node.x + node.w / 2 - cx);
        if (d < minDist) {
          minDist = d;
          nearestCenterX = cx;
        }
      }
      node.x = nearestCenterX - node.w / 2;
    }
  }

  // Now fix edge/message source/target points to match new participant positions
  let fixedXml = applyPositions(xml, [...participants, ...otherNodes]);

  // Update lifeline and message mxPoint coordinates to match new participant positions
  // Build a map of old participant center-x → new center-x
  const oldPositions = parseVertexPositions(xml);
  const oldParticipants = oldPositions
    .filter(n => n.y < (oldPositions.reduce((min, p) => Math.min(min, p.y), Infinity) + 60))
    .sort((a, b) => a.x - b.x);

  if (oldParticipants.length === participants.length) {
    for (let i = 0; i < participants.length; i++) {
      const oldCx = Math.round(oldParticipants[i].x + oldParticipants[i].w / 2);
      const newCx = Math.round(participants[i].x + PARTICIPANT_W / 2);
      if (oldCx !== newCx) {
        // Replace mxPoint x coordinates that match old center
        // Match both x="oldCx" patterns in mxPoint elements
        const pointRegex = new RegExp(`(<mxPoint\\s+x=")${oldCx}("\\s)`, 'g');
        fixedXml = fixedXml.replace(pointRegex, `$1${newCx}$2`);
        // Also handle x="oldCx" at end of attributes
        const pointRegex2 = new RegExp(`(<mxPoint\\s+x=")${oldCx}("\\s*/)`, 'g');
        fixedXml = fixedXml.replace(pointRegex2, `$1${newCx}$2`);
        // Handle as="sourcePoint" / as="targetPoint" variants
        const pointRegex3 = new RegExp(`(<mxPoint\\s+)x="${oldCx}"(\\s+y="[^"]*"\\s+as=")`, 'g');
        fixedXml = fixedXml.replace(pointRegex3, `$1x="${newCx}"$2`);
      }
    }
  }

  return fixedXml;
}

function fixGenericOverlaps(xml: string): string {
  const positions = parseVertexPositions(xml);
  if (positions.length < 2) return xml;

  let hasOverlap = true;
  let iterations = 0;
  const maxIterations = 80;
  const pad = 40;

  while (hasOverlap && iterations < maxIterations) {
    hasOverlap = false;
    iterations++;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];

        const overlapX = a.x < b.x + b.w + pad && a.x + a.w + pad > b.x;
        const overlapY = a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

        if (overlapX && overlapY) {
          hasOverlap = true;
          const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
          const dy = (a.y + a.h / 2) - (b.y + b.h / 2);

          if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx > 0) {
              b.x = Math.max(20, a.x - b.w - pad - 50);
            } else {
              b.x = a.x + a.w + pad + 50;
            }
          } else {
            if (dy > 0) {
              b.y = Math.max(20, a.y - b.h - pad - 30);
            } else {
              b.y = a.y + a.h + pad + 30;
            }
          }
        }
      }
    }
  }

  return applyPositions(xml, positions);
}

function fixMindmapDiagram(xml: string): string {
  const positions = parseVertexPositions(xml);
  if (positions.length < 2) return xml;

  // Build edge map from XML to understand parent-child relationships
  const edgeRegex = /<mxCell[^>]*edge="1"[^>]*source="([^"]*)"[^>]*target="([^"]*)"[^>]*/g;
  const edgeRegex2 = /<mxCell[^>]*edge="1"[^>]*target="([^"]*)"[^>]*source="([^"]*)"[^>]*/g;
  const childrenOf: Record<string, string[]> = {};
  const parentOf: Record<string, string> = {};
  let em: RegExpExecArray | null;

  // Try both attribute orderings
  const xmlCopy = xml;
  while ((em = edgeRegex.exec(xmlCopy)) !== null) {
    const src = em[1], tgt = em[2];
    if (!childrenOf[src]) childrenOf[src] = [];
    childrenOf[src].push(tgt);
    parentOf[tgt] = src;
  }
  while ((em = edgeRegex2.exec(xmlCopy)) !== null) {
    const tgt = em[1], src = em[2];
    if (!childrenOf[src]) childrenOf[src] = [];
    if (!childrenOf[src].includes(tgt)) childrenOf[src].push(tgt);
    if (!parentOf[tgt]) parentOf[tgt] = src;
  }

  const posMap: Record<string, NodePos> = {};
  for (const p of positions) posMap[p.id] = p;

  // Find the root node: either the largest ellipse, or the node with most children and no parent
  let rootId: string | null = null;

  // Try to find ellipse node first (typical mindmap center)
  const ellipseMatch = xml.match(/<mxCell[^>]*id="([^"]*)"[^>]*style="[^"]*ellipse[^"]*"[^>]*vertex="1"/);
  if (ellipseMatch && posMap[ellipseMatch[1]]) {
    rootId = ellipseMatch[1];
  }

  // Fallback: node with most children that has no parent
  if (!rootId) {
    let maxChildren = 0;
    for (const id of Object.keys(childrenOf)) {
      if (!parentOf[id] && childrenOf[id].length > maxChildren && posMap[id]) {
        maxChildren = childrenOf[id].length;
        rootId = id;
      }
    }
  }

  // Fallback: first node
  if (!rootId && positions.length > 0) {
    rootId = positions[0].id;
  }

  if (!rootId || !posMap[rootId]) return fixGenericOverlaps(xml);

  const root = posMap[rootId];
  const level1Ids = childrenOf[rootId] || [];
  const level1Nodes = level1Ids.filter(id => posMap[id]).map(id => posMap[id]);

  if (level1Nodes.length === 0) return fixGenericOverlaps(xml);

  // Place root at center
  const CX = 450, CY = 350;
  root.x = CX - root.w / 2;
  root.y = CY - root.h / 2;

  // Distribute level 1 nodes evenly around the center
  const L1_RADIUS = 300;
  const L1_W = 160, L1_H = 55;
  const angleStep = (2 * Math.PI) / level1Nodes.length;
  const startAngle = -Math.PI / 2; // Start from top

  for (let i = 0; i < level1Nodes.length; i++) {
    const angle = startAngle + i * angleStep;
    const nx = CX + L1_RADIUS * Math.cos(angle) - L1_W / 2;
    const ny = CY + L1_RADIUS * Math.sin(angle) - L1_H / 2;
    level1Nodes[i].x = Math.max(10, Math.round(nx));
    level1Nodes[i].y = Math.max(10, Math.round(ny));
    level1Nodes[i].w = L1_W;
    level1Nodes[i].h = L1_H;
  }

  // Place level 2 nodes further out from their parent in the same angular direction
  const L2_EXTRA_RADIUS = 200;
  const L2_W = 140, L2_H = 45;

  for (let i = 0; i < level1Nodes.length; i++) {
    const parentNode = level1Nodes[i];
    const parentAngle = startAngle + i * angleStep;
    const l2Ids = childrenOf[parentNode.id] || [];
    const l2Nodes = l2Ids.filter(id => posMap[id]).map(id => posMap[id]);

    if (l2Nodes.length === 0) continue;

    // Fan out children in a small arc around the parent's angle direction
    const fanSpread = Math.min(0.6, (l2Nodes.length - 1) * 0.25); // radians of spread
    const l2BaseAngle = parentAngle;

    for (let j = 0; j < l2Nodes.length; j++) {
      const offset = l2Nodes.length === 1 ? 0 : (j / (l2Nodes.length - 1) - 0.5) * fanSpread * 2;
      const childAngle = l2BaseAngle + offset;
      const totalRadius = L1_RADIUS + L2_EXTRA_RADIUS;
      const nx = CX + totalRadius * Math.cos(childAngle) - L2_W / 2;
      const ny = CY + totalRadius * Math.sin(childAngle) - L2_H / 2;
      l2Nodes[j].x = Math.max(10, Math.round(nx));
      l2Nodes[j].y = Math.max(10, Math.round(ny));
      l2Nodes[j].w = L2_W;
      l2Nodes[j].h = L2_H;

      // Also handle level 3 if any
      const l3Ids = childrenOf[l2Nodes[j].id] || [];
      const l3Nodes = l3Ids.filter(id => posMap[id]).map(id => posMap[id]);
      const L3_EXTRA = 170;
      for (let k = 0; k < l3Nodes.length; k++) {
        const kOffset = l3Nodes.length === 1 ? 0 : (k / (l3Nodes.length - 1) - 0.5) * 0.4;
        const l3Angle = childAngle + kOffset;
        const r3 = totalRadius + L3_EXTRA;
        l3Nodes[k].x = Math.max(10, Math.round(CX + r3 * Math.cos(l3Angle) - 130 / 2));
        l3Nodes[k].y = Math.max(10, Math.round(CY + r3 * Math.sin(l3Angle) - 40 / 2));
        l3Nodes[k].w = 130;
        l3Nodes[k].h = 40;
      }
    }
  }

  // Final overlap pass on all nodes
  let fixedXml = applyPositions(xml, positions);

  // Run generic overlap fix as safety net
  const finalPositions = parseVertexPositions(fixedXml);
  if (finalPositions.length < 2) return fixedXml;

  let hasOverlap = true;
  let iterations = 0;
  while (hasOverlap && iterations < 30) {
    hasOverlap = false;
    iterations++;
    for (let i = 0; i < finalPositions.length; i++) {
      for (let j = i + 1; j < finalPositions.length; j++) {
        const a = finalPositions[i], b = finalPositions[j];
        const pad = 25;
        if (a.x < b.x + b.w + pad && a.x + a.w + pad > b.x &&
            a.y < b.y + b.h + pad && a.y + a.h + pad > b.y) {
          hasOverlap = true;
          const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
          const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
          const pushX = Math.abs(dx) >= Math.abs(dy);
          if (pushX) {
            b.x += dx > 0 ? -(b.w + pad + 20) : (a.w + pad + 20);
          } else {
            b.y += dy > 0 ? -(b.h + pad + 15) : (a.h + pad + 15);
          }
          b.x = Math.max(10, b.x);
          b.y = Math.max(10, b.y);
        }
      }
    }
  }

  return applyPositions(fixedXml, finalPositions);
}

function fixOverlappingNodes(xml: string, diagramType: string = 'FLOWCHART'): string {
  if (diagramType === 'SEQUENCE') {
    return fixSequenceDiagram(xml);
  }
  if (diagramType === 'MINDMAP') {
    return fixMindmapDiagram(xml);
  }
  return fixGenericOverlaps(xml);
}

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
    const typeHints: Record<string, string> = {
      SEQUENCE: `CRITICAL: Follow the SEQUENCE section EXACTLY. Place 4-6 participant boxes at y=30 spaced 220px apart. Add dashed lifelines below each. Messages are HORIZONTAL ARROWS between lifelines going TOP to BOTTOM (y=120, 170, 220, 270...). Use mxPoint sourcePoint/targetPoint geometry (NOT source/target attributes). Generate 10-18 messages covering the COMPLETE interaction flow including validation, error cases, and return messages. Use descriptive labels like "POST /api/login", "Validate token", "Return 401 Unauthorized". Use different fillColors per participant. Think about ALL the steps — don't skip any.`,
      FLOWCHART: `Follow the FLOWCHART section. Center column at x=350, y starts at 40 increments 130px. Use rounded boxes for process, rhombus for decisions, green rounded for start/end, red for errors, purple for sub-processes. Generate 15-25 nodes with 3+ decision diamonds, at least 1 error/exception path, parallel branches. Add descriptive edge labels ("validates", "on success", "on failure"). Think about the COMPLETE process — include validation, error handling, notifications, logging. Use shadow=1 on primary nodes.`,
      ERD: `Follow the ERD section. Use shape=table containers with text child rows (parent=tableId). Generate 5-8 tables with 4-8 fields EACH including data types (e.g., "id (PK) INT", "email VARCHAR(255) UNIQUE", "created_at TIMESTAMP"). Place tables in a grid 360px apart, using different fillColors. Include ALL relevant FK relationships with cardinality labels (1:*, 1:1, *:*). Think like a database architect — include all necessary junction tables, audit fields, and indexes.`,
      MINDMAP: `CRITICAL: Follow the MINDMAP section EXACTLY. Place ONE ellipse center node at (350,305) size 200x90 with purple fill. Distribute 6-8 level-1 branches EVENLY in a circle at 300px radius. Each level-1 gets 2-4 level-2 children at 200px further out. Use source/target on ALL edges. Each level-1 branch uses a UNIQUE color (blue, green, yellow, red, purple, orange, teal, pink). Total nodes: 25-40. Think comprehensively — cover ALL aspects, sub-topics, and details of the subject.`,
      ARCHITECTURE: `Follow the ARCHITECTURE section. Generate 4-5 horizontal layers: Presentation (y=40, red), API/Gateway (y=220, yellow), Services (y=400, blue), Data (y=600, green), Infrastructure (y=780, grey/purple). Each layer has 3-5 components spaced 220px apart. Use shape=hexagon for gateways, shape=cylinder3 for databases, rounded=1 with shadow=1 for services. Generate 15-25 total components. Include load balancers, message queues, caches, monitoring. Think like a solutions architect — design a complete production system.`,
      COMPONENT: `Follow the COMPONENT section. Generate 3-4 folder packages (shape=folder) each containing 3-5 components (shape=component). Packages 300px apart vertically, components 200px apart inside with 40px padding. Use unique color themes per package. Add inter-package dependency edges with "<<uses>>" or "<<depends>>" labels. Total 15-25 elements. Include interfaces, adapters, and cross-cutting concerns.`,
    };

    const hint = typeHints[diagramType] || typeHints.FLOWCHART;

    // Build an expansion instruction for vague prompts
    const expansionNote = description.trim().split(/\s+/).length < 15
      ? `\n\nIMPORTANT: The user's description is brief. You MUST intelligently EXPAND this into a comprehensive, detailed, professional-grade diagram. Think about ALL related components, processes, actors, data flows, error handling, and edge cases. Generate a COMPLETE diagram with 15-30+ nodes as if preparing for a thesis or enterprise documentation. Do NOT generate a simple/minimal diagram.`
      : `\n\nGenerate a comprehensive, detailed, professional-grade diagram covering all aspects described.`;

    const messages: ChatMsg[] = [
      { role: 'system', content: DIAGRAM_PROMPT },
      {
        role: 'user',
        content: `Generate a ${diagramType} diagram for the following:\n\n${description}\n\n${hint}${expansionNote}\n\nOutput ONLY valid draw.io XML starting with <mxGraphModel>. No markdown, no code fences, no explanation.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.2 });

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

    // Post-process to fix any overlapping nodes
    xml = fixOverlappingNodes(xml, diagramType);

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
