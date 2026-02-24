import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { generateTokens, verifyRefreshToken } from '../../lib/jwt.js';
import { redis } from '../../lib/redis.js';
import { AppError, ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from '@brainforge/validators';

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Auto-create a personal team for the user
    await prisma.team.create({
      data: {
        name: `${input.name}'s Team`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    const tokens = await generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      // Check blacklist
      const isBlacklisted = await redis.get(`bl:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }

      const payload = await verifyRefreshToken(refreshToken);

      // Blacklist old refresh token (rotate)
      await redis.set(`bl:${refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);

      const tokens = await generateTokens(payload.userId, payload.email);
      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string, accessToken: string) {
    // Blacklist both tokens
    await Promise.all([
      redis.set(`bl:${refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60),
      redis.set(`bl:${accessToken}`, '1', 'EX', 15 * 60),
    ]);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, input: { name?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async updatePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password updated successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If an account exists with this email, a reset link has been generated.' };
    }

    const token = randomBytes(32).toString('hex');
    // Store reset token in Redis with 1 hour expiry
    await redis.set(`reset:${token}`, user.id, 'EX', 3600);

    // In production, send email. For self-hosted, return the token directly.
    return { message: 'Reset link generated.', token };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(`reset:${token}`);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Invalidate the token
    await redis.del(`reset:${token}`);

    return { message: 'Password has been reset successfully' };
  }
}

export const authService = new AuthService();
