import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const DIAGRAM_PROMPT = `You are an expert diagram designer. Generate diagrams in draw.io mxGraphModel XML format.

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
- NO overlapping nodes — calculate positions carefully
- Make diagrams LARGE and READABLE — prefer generous spacing
- ONLY output the raw XML, no markdown, no code fences, no explanations

=== FLOWCHART ===
Top-to-bottom flow, single center column. Decisions branch left/right then reconverge.

EXAMPLE (simple approval flow):
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Start" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;fontStyle=1;arcSize=50;" vertex="1" parent="1"><mxGeometry x="260" y="40" width="180" height="50" as="geometry"/></mxCell>
<mxCell id="3" value="Submit Request" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;" vertex="1" parent="1"><mxGeometry x="260" y="140" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="4" value="Valid?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;" vertex="1" parent="1"><mxGeometry x="250" y="250" width="160" height="100" as="geometry"/></mxCell>
<mxCell id="5" value="Process" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;" vertex="1" parent="1"><mxGeometry x="260" y="420" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="6" value="Show Error" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=13;" vertex="1" parent="1"><mxGeometry x="520" y="265" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="7" value="End" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;fontStyle=1;arcSize=50;" vertex="1" parent="1"><mxGeometry x="260" y="550" width="180" height="50" as="geometry"/></mxCell>
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="2" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="3" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e3" value="Yes" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="4" target="5" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e4" value="No" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="4" target="6" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e5" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="6" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e6" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="5" target="7" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>

Rules: Center column at x=260. Start y=40, increment 150px. Decisions at x=250 (wider). Yes goes down, No goes right (x+260). Use source/target on edges.

=== MINDMAP ===
RADIAL layout with center node and branches spreading outward in all directions. This is THE MOST IMPORTANT layout to get right.

STRUCTURE:
- ONE central node (ellipse) at the exact center of the canvas
- Level 1 branches: evenly distributed AROUND the center (top, right, bottom, left, and diagonals)
- Level 2 sub-branches: extend OUTWARD from their parent level-1 node, AWAY from center
- ALL edges use source/target attributes connecting parent→child

POSITIONING RULES:
- Canvas center: (450, 350)
- Central node: x=350, y=305, width=200, height=90 (center at 450, 350)
- Level 1 nodes (up to 8): arranged in a circle at radius ~280px from center
  - Top:        (370, 50)
  - Top-Right:  (660, 100)
  - Right:      (730, 305)
  - Bot-Right:  (660, 510)
  - Bottom:     (370, 560)
  - Bot-Left:   (80, 510)
  - Left:       (10, 305)
  - Top-Left:   (80, 100)
- Level 2 nodes: positioned ~180px FURTHER from center than their parent, in the SAME angular direction
  - E.g., if parent is at Right (730,305), children go to (950,240) and (950,370)
  - If parent is at Top (370,50), children go to (290,-110) and (460,-110) — use y >= 10

EXAMPLE (Project Planning mindmap with 4 branches + sub-items):
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Project Planning" style="ellipse;whiteSpace=wrap;html=1;fillColor=#7b68ee;fontColor=#ffffff;strokeColor=#6c5ce7;fontSize=16;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="350" y="305" width="200" height="90" as="geometry"/></mxCell>
<mxCell id="3" value="Timeline" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="370" y="50" width="160" height="55" as="geometry"/></mxCell>
<mxCell id="4" value="Resources" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="730" y="305" width="160" height="55" as="geometry"/></mxCell>
<mxCell id="5" value="Budget" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="370" y="560" width="160" height="55" as="geometry"/></mxCell>
<mxCell id="6" value="Risks" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="10" y="305" width="160" height="55" as="geometry"/></mxCell>
<mxCell id="7" value="Milestones" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="280" y="10" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="8" value="Deadlines" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="500" y="10" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="9" value="Team" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="940" y="250" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="10" value="Tools" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="940" y="370" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="11" value="Cost Estimate" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="280" y="650" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="12" value="Funding" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="500" y="650" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="13" value="Technical" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="10" y="200" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="14" value="Schedule" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=12;" vertex="1" parent="1"><mxGeometry x="10" y="420" width="140" height="45" as="geometry"/></mxCell>
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=2;exitX=0.5;exitY=0;exitDx=0;exitDy=0;" edge="1" source="2" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" source="2" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=2;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" edge="1" source="2" target="5" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e4" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=2;exitX=0;exitY=0.5;exitDx=0;exitDy=0;" edge="1" source="2" target="6" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e5" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="3" target="7" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e6" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="3" target="8" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e7" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="4" target="9" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e8" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="4" target="10" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e9" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="5" target="11" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e10" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="5" target="12" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e11" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="6" target="13" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e12" style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;html=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" source="6" target="14" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>

MINDMAP RULES:
- Use DIFFERENT fillColors for each level-1 branch (blue, green, yellow, red, purple, etc.)
- Level-2 nodes use lighter color (e.g., #e1d5e7 with #9673a6 stroke)
- ALL edges MUST use source="X" target="Y" — NOT mxPoint geometry
- Center→Level1 edges: strokeWidth=2, exitX/Y pointing toward the branch direction
- Level1→Level2 edges: strokeWidth=1.5, strokeColor=#999999
- Generate 4-8 level-1 branches with 2-3 level-2 sub-items EACH for comprehensive diagrams
- Spread branches EVENLY around the center — do NOT cluster them on one side

=== ERD ===
Grid layout with table shapes. Each table has a header row and field rows.

EXAMPLE (2 tables):
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Users" style="shape=table;startSize=30;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeSizeByChildColumns=0;fillColor=#dae8fc;strokeColor=#6c8ebf;html=1;whiteSpace=wrap;fontSize=14;" vertex="1" parent="1"><mxGeometry x="60" y="60" width="240" height="150" as="geometry"/></mxCell>
<mxCell id="3" value="id (PK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;" vertex="1" parent="2"><mxGeometry y="30" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="4" value="name" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=12;" vertex="1" parent="2"><mxGeometry y="60" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="5" value="email" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=12;" vertex="1" parent="2"><mxGeometry y="90" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="6" value="created_at" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=12;" vertex="1" parent="2"><mxGeometry y="120" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="10" value="Orders" style="shape=table;startSize=30;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeSizeByChildColumns=0;fillColor=#d5e8d4;strokeColor=#82b366;html=1;whiteSpace=wrap;fontSize=14;" vertex="1" parent="1"><mxGeometry x="420" y="60" width="240" height="150" as="geometry"/></mxCell>
<mxCell id="11" value="id (PK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;" vertex="1" parent="10"><mxGeometry y="30" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="12" value="user_id (FK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=12;fontColor=#CC0000;" vertex="1" parent="10"><mxGeometry y="60" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="13" value="total" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=12;" vertex="1" parent="10"><mxGeometry y="90" width="240" height="30" as="geometry"/></mxCell>
<mxCell id="e1" value="1 : *" style="edgeStyle=entityRelationEdgeStyle;fontSize=12;html=1;strokeWidth=2;" edge="1" source="2" target="10" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>

ERD Rules: Tables at x=60, x=420, x=780 (360px apart). Rows at y=60, y=350. Table rows are CHILDREN (parent=tableId). Use different fillColors per table.

=== ARCHITECTURE ===
Horizontal layers, top-to-bottom. Each layer contains related components at the same y.

EXAMPLE (3 layers):
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Web App" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;shadow=1;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="60" y="40" width="160" height="60" as="geometry"/></mxCell>
<mxCell id="3" value="Mobile App" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;shadow=1;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="300" y="40" width="160" height="60" as="geometry"/></mxCell>
<mxCell id="4" value="API Gateway" style="shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="150" y="200" width="200" height="60" as="geometry"/></mxCell>
<mxCell id="5" value="Auth Service" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;shadow=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="60" y="380" width="160" height="60" as="geometry"/></mxCell>
<mxCell id="6" value="User Service" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;shadow=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="300" y="380" width="160" height="60" as="geometry"/></mxCell>
<mxCell id="7" value="PostgreSQL" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=13;" vertex="1" parent="1"><mxGeometry x="60" y="560" width="160" height="80" as="geometry"/></mxCell>
<mxCell id="8" value="Redis" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=13;" vertex="1" parent="1"><mxGeometry x="300" y="560" width="160" height="80" as="geometry"/></mxCell>
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="2" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="3" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="4" target="5" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e4" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="4" target="6" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e5" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="5" target="7" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e6" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="6" target="8" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>

Architecture Rules: Layers at y=40, y=200, y=380, y=560. Items 240px apart (x=60, x=300, x=540, x=780). Use colors: red=clients, yellow=gateway, blue=services, green=data.

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
  y-positions: 120, 180, 240, 300, 360, 420...

EXAMPLE:
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="User" style="shape=mxgraph.sequence.object;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="60" y="30" width="150" height="50" as="geometry"/></mxCell>
<mxCell id="3" value="Server" style="shape=mxgraph.sequence.object;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="280" y="30" width="150" height="50" as="geometry"/></mxCell>
<mxCell id="4" value="Database" style="shape=mxgraph.sequence.object;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontStyle=1;fontSize=13;" vertex="1" parent="1"><mxGeometry x="500" y="30" width="150" height="50" as="geometry"/></mxCell>
<mxCell id="L1" style="endArrow=none;dashed=1;html=1;strokeColor=#999999;dashPattern=5 5;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="135" y="80" as="sourcePoint"/><mxPoint x="135" y="420" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="L2" style="endArrow=none;dashed=1;html=1;strokeColor=#999999;dashPattern=5 5;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="355" y="80" as="sourcePoint"/><mxPoint x="355" y="420" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="L3" style="endArrow=none;dashed=1;html=1;strokeColor=#999999;dashPattern=5 5;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="575" y="80" as="sourcePoint"/><mxPoint x="575" y="420" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="e1" value="HTTP Request" style="html=1;strokeWidth=2;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="135" y="120" as="sourcePoint"/><mxPoint x="355" y="120" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="e2" value="Query" style="html=1;strokeWidth=2;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="355" y="180" as="sourcePoint"/><mxPoint x="575" y="180" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="e3" value="Result" style="html=1;dashed=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="575" y="240" as="sourcePoint"/><mxPoint x="355" y="240" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="e4" value="Response" style="html=1;dashed=1;strokeWidth=1.5;strokeColor=#999999;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="355" y="300" as="sourcePoint"/><mxPoint x="135" y="300" as="targetPoint"/></mxGeometry></mxCell>
</root></mxGraphModel>

Generate 6-12+ messages with different fillColors per participant.

=== COMPONENT ===
Grouped layout with folder packages containing component shapes.

EXAMPLE:
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Frontend" style="shape=folder;fontStyle=1;spacingTop=10;tabWidth=50;tabHeight=14;tabPosition=left;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=14;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="460" height="250" as="geometry"/></mxCell>
<mxCell id="3" value="UI Components" style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;" vertex="1" parent="1"><mxGeometry x="80" y="100" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="4" value="State Manager" style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;" vertex="1" parent="1"><mxGeometry x="290" y="100" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="5" value="Router" style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=13;" vertex="1" parent="1"><mxGeometry x="80" y="200" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="6" value="Backend" style="shape=folder;fontStyle=1;spacingTop=10;tabWidth=50;tabHeight=14;tabPosition=left;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=14;" vertex="1" parent="1"><mxGeometry x="40" y="360" width="460" height="250" as="geometry"/></mxCell>
<mxCell id="7" value="API Layer" style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=13;" vertex="1" parent="1"><mxGeometry x="80" y="420" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="8" value="Database" style="shape=component;align=left;spacingLeft=36;rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=13;" vertex="1" parent="1"><mxGeometry x="290" y="420" width="180" height="60" as="geometry"/></mxCell>
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="3" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="4" target="7" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=2;" edge="1" source="7" target="8" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>

Component Rules: Packages 320px apart vertically. Components inside with 40px padding from package edge, 210px apart horizontally.

=== GENERAL RULES ===
- Generate 10-25+ meaningful cells for comprehensive diagrams
- Every vertex: vertex="1" parent="1" (unless child of container) with EXPLICIT <mxGeometry>
- Every edge: edge="1" parent="1" source="X" target="Y" (except SEQUENCE which uses mxPoints)
- Use distinct fillColor/strokeColor per node category
- Labels: descriptive, concise (2-5 words)
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
      SEQUENCE: `CRITICAL: Follow the SEQUENCE section EXACTLY. Place participant boxes at y=30 spaced 220px apart. Add dashed lifelines below each. Messages are HORIZONTAL ARROWS between lifelines going TOP to BOTTOM (y=120, 180, 240...). Use mxPoint sourcePoint/targetPoint geometry (NOT source/target attributes). Generate at least 6 messages. Copy the example XML structure exactly.`,
      FLOWCHART: `Follow the FLOWCHART section. Center column at x=260, y starts at 40 increments 150px. Use rounded boxes for process, rhombus for decisions, green rounded for start/end. Use source/target on edges. Copy the example structure.`,
      ERD: `Follow the ERD section. Use shape=table containers with text child rows. Place tables 360px apart horizontally. Table rows use parent=tableId. Use different fillColors per table.`,
      MINDMAP: `CRITICAL: Follow the MINDMAP section EXACTLY. Place ONE ellipse center node at (350,305) size 200x90. Level-1 branches EVENLY distributed in a circle (top, right, bottom, left, etc.) at 300px radius from center. Level-2 sub-items 200px FURTHER in same direction. Use source/target on ALL edges. Use DIFFERENT fillColors for each level-1 branch (blue, green, yellow, red, purple). Generate 4-8 level-1 branches each with 2-3 children. Copy the example XML structure exactly.`,
      ARCHITECTURE: `Follow the ARCHITECTURE section. 4 horizontal layers at y=40, 200, 380, 560. Items 240px apart horizontally. Red=clients, yellow=gateway, blue=services, green=data stores. Copy the example structure.`,
      COMPONENT: `Follow the COMPONENT section. Use shape=folder packages containing shape=component items. Packages 320px apart vertically. Components 210px apart inside. Copy the example structure.`,
    };

    const hint = typeHints[diagramType] || typeHints.FLOWCHART;

    const messages: ChatMsg[] = [
      { role: 'system', content: DIAGRAM_PROMPT },
      {
        role: 'user',
        content: `Generate a ${diagramType} diagram for the following:\n\n${description}\n\n${hint}\n\nOutput ONLY valid draw.io XML starting with <mxGraphModel>. No markdown, no code fences, no explanation.`,
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
