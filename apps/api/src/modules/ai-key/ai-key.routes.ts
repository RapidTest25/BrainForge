import type { FastifyInstance } from 'fastify';
import { aiKeyService } from './ai-key.service.js';
import { addAIKeySchema, updateAIKeySchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';

export async function aiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/keys', async (request, reply) => {
    const keys = await aiKeyService.getUserKeys(request.user.id);
    return reply.send({ success: true, data: keys });
  });

  app.post('/keys', async (request, reply) => {
    const body = addAIKeySchema.parse(request.body);
    const key = await aiKeyService.addKey(request.user.id, body.provider, body.apiKey, body.label);
    return reply.status(201).send({ success: true, data: key });
  });

  app.patch('/keys/:keyId', async (request, reply) => {
    const { keyId } = request.params as { keyId: string };
    const body = updateAIKeySchema.parse(request.body);
    const key = await aiKeyService.updateKey(request.user.id, keyId, body);
    return reply.send({ success: true, data: key });
  });

  app.delete('/keys/:keyId', async (request, reply) => {
    const { keyId } = request.params as { keyId: string };
    await aiKeyService.deleteKey(request.user.id, keyId);
    return reply.send({ success: true, data: { message: 'API key deleted' } });
  });

  app.get('/usage', async (request, reply) => {
    const { days } = request.query as { days?: string };
    const stats = await aiKeyService.getUsageStats(request.user.id, days ? parseInt(days) : 30);
    return reply.send({ success: true, data: stats });
  });
}
