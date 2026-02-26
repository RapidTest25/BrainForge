import type { FastifyInstance } from 'fastify';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { AppError } from '../../lib/errors.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      // Zod validation error
      if ((error as any)?.issues) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: (error as any).issues },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      if ((error as any)?.issues) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: (error as any).issues },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/google
  app.post('/google', async (request, reply) => {
    try {
      const { credential, userInfo } = request.body as { credential: string; userInfo?: { email: string; name: string; picture?: string; sub: string } };
      if (!credential) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Google credential is required' },
        });
      }
      const result = await authService.googleLogin(credential, userInfo);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/refresh
  app.post('/refresh', async (request, reply) => {
    try {
      const body = refreshTokenSchema.parse(request.body);
      const tokens = await authService.refresh(body.refreshToken);
      return reply.send({ success: true, data: tokens });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/logout
  app.post('/logout', { preHandler: [authGuard] }, async (request, reply) => {
    const refreshToken = (request.body as any)?.refreshToken ?? '';
    const accessToken = request.headers.authorization?.slice(7) ?? '';
    await authService.logout(refreshToken, accessToken);
    return reply.send({ success: true, data: { message: 'Logged out successfully' } });
  });

  // GET /api/auth/me
  app.get('/me', { preHandler: [authGuard] }, async (request, reply) => {
    const user = await authService.getProfile(request.user.id);
    return reply.send({ success: true, data: user });
  });

  // PATCH /api/auth/me
  app.patch('/me', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const body = request.body as { name?: string; avatarUrl?: string };
      const user = await authService.updateProfile(request.user.id, body);
      return reply.send({ success: true, data: user });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // PATCH /api/auth/me/password
  app.patch('/me/password', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const body = request.body as { currentPassword: string; newPassword: string };
      if (!body.currentPassword || !body.newPassword) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required' },
        });
      }
      const result = await authService.updatePassword(request.user.id, body);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/me/set-password (for Google-only users)
  app.post('/me/set-password', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const { newPassword } = request.body as { newPassword: string };
      if (!newPassword) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'newPassword is required' },
        });
      }
      const result = await authService.setPassword(request.user.id, newPassword);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body as { email: string };
      if (!email) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
        });
      }
      const result = await authService.requestPasswordReset(email);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', async (request, reply) => {
    try {
      const { token, newPassword } = request.body as { token: string; newPassword: string };
      if (!token || !newPassword) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token and newPassword are required' },
        });
      }
      const result = await authService.resetPassword(token, newPassword);
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/auth/me/link-google
  app.post('/me/link-google', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const { credential, userInfo } = request.body as { credential: string; userInfo?: { email: string; name: string; picture?: string; sub: string } };
      if (!credential) {
        return reply.status(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Google credential is required' },
        });
      }
      const user = await authService.linkGoogle(request.user.id, credential, userInfo);
      return reply.send({ success: true, data: user });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // DELETE /api/auth/me/link-google
  app.delete('/me/link-google', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const user = await authService.unlinkGoogle(request.user.id);
      return reply.send({ success: true, data: user });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });
}
