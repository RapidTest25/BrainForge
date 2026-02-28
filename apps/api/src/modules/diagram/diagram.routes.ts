import type { FastifyInstance } from 'fastify';
import { diagramService } from './diagram.service.js';
import { createDiagramSchema, updateDiagramSchema, aiGenerateDiagramSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function diagramRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/:teamId/diagrams', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.query as { projectId?: string };
    const diagrams = await diagramService.findByTeam(teamId, projectId);
    return reply.send({ success: true, data: diagrams });
  });

  app.post('/:teamId/diagrams', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.body as { projectId?: string };
    const body = createDiagramSchema.parse(request.body);
    const diagram = await diagramService.create(teamId, request.user.id, { ...body, projectId });
    return reply.status(201).send({ success: true, data: diagram });
  });

  app.get('/:teamId/diagrams/:diagramId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId, diagramId } = request.params as { teamId: string; diagramId: string };
    const diagram = await diagramService.findById(diagramId, teamId);
    return reply.send({ success: true, data: diagram });
  });

  app.patch('/:teamId/diagrams/:diagramId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { diagramId } = request.params as { diagramId: string };
    const body = updateDiagramSchema.parse(request.body);
    const diagram = await diagramService.update(diagramId, body);
    return reply.send({ success: true, data: diagram });
  });

  app.delete('/:teamId/diagrams/:diagramId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { diagramId } = request.params as { diagramId: string };
    await diagramService.delete(diagramId);
    return reply.send({ success: true, data: { message: 'Diagram deleted' } });
  });

  // AI Generate
  app.post('/:teamId/diagrams/ai-generate', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = aiGenerateDiagramSchema.parse(request.body);
    const { projectId } = request.body as { projectId?: string };
    const diagram = await diagramService.generateAndSave(
      teamId, request.user.id, body.provider, body.model, body.title, body.prompt, body.type, projectId
    );
    return reply.status(201).send({ success: true, data: diagram });
  });
}
