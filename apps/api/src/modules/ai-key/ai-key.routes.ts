import type { FastifyInstance } from 'fastify';
import { aiKeyService } from './ai-key.service.js';
import { aiService } from '../../ai/ai.service.js';
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

  // Validate an API key before saving — checks if the key works with the provider
  app.post('/keys/validate', async (request, reply) => {
    const { provider, apiKey } = request.body as { provider: string; apiKey: string };
    if (!provider || !apiKey) {
      return reply.status(400).send({ success: false, error: { message: 'Provider and apiKey are required' } });
    }
    try {
      const valid = await aiService.validateKey(provider, apiKey);
      return reply.send({ success: true, data: { valid, provider } });
    } catch (error: any) {
      return reply.send({ success: true, data: { valid: false, provider, error: error.message } });
    }
  });

  // Check an existing saved key — validates it still works + returns balance info if available
  app.post('/keys/:keyId/check', async (request, reply) => {
    const { keyId } = request.params as { keyId: string };
    try {
      const keyData = await aiKeyService.getKeyForValidation(request.user.id, keyId);
      if (!keyData) {
        return reply.status(404).send({ success: false, error: { message: 'Key not found' } });
      }
      const valid = await aiService.validateKey(keyData.provider, keyData.decryptedKey);
      // Try to get balance/credit info
      let balance = null;
      try {
        balance = await aiService.getBalance(keyData.provider, keyData.decryptedKey);
      } catch { /* balance not available for all providers */ }
      // Update key active status based on validation
      if (!valid) {
        await aiKeyService.markKeyInvalid(request.user.id, keyData.provider);
      } else {
        await aiKeyService.markKeyValid(request.user.id, keyData.provider);
      }
      return reply.send({ success: true, data: { valid, provider: keyData.provider, balance } });
    } catch (error: any) {
      return reply.send({ success: true, data: { valid: false, error: error.message } });
    }
  });
}
