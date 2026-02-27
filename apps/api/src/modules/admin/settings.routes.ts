import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { adminGuard } from '../../middleware/admin.middleware.js';
import { settingsService } from './settings.service.js';

export async function settingsRoutes(app: FastifyInstance) {
  // All settings routes require auth + admin
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', adminGuard);

  // Get version/runtime info
  app.get('/version', async (_request, reply) => {
    const info = await settingsService.getVersionInfo();
    return reply.send({ success: true, data: info });
  });

  // Get all settings (grouped by category)
  app.get('/', async (_request, reply) => {
    const settings = await settingsService.getAllSettings();
    return reply.send({ success: true, data: settings });
  });

  // Get settings for a specific category
  app.get('/:category', async (request, reply) => {
    const { category } = request.params as { category: string };
    const settings = await settingsService.getSettingsByCategory(category);
    return reply.send({ success: true, data: settings });
  });

  // Update a single setting
  app.patch('/:category/:key', async (request, reply) => {
    const { category, key } = request.params as { category: string; key: string };
    const { value } = request.body as { value: string };
    const setting = await settingsService.updateSetting(category, key, value);
    return reply.send({ success: true, data: setting });
  });

  // Bulk update settings
  app.post('/bulk', async (request, reply) => {
    const { settings } = request.body as { settings: Array<{ category: string; key: string; value: string }> };
    const results = await settingsService.updateBulk(settings);
    return reply.send({ success: true, data: results });
  });

  // Reset a category to defaults
  app.post('/:category/reset', async (request, reply) => {
    const { category } = request.params as { category: string };
    const results = await settingsService.resetCategory(category);
    return reply.send({ success: true, data: results });
  });
}
