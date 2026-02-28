import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma.js';
import { generateTokens, verifyRefreshToken } from '../../lib/jwt.js';
import { redis } from '../../lib/redis.js';
import { AppError, ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from '@brainforge/validators';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        googleId: true,
        isAdmin: true,
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

    return { user: { ...user, hasPassword: true, isAdmin: user.isAdmin || false }, tokens };
  }
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('This account uses Google sign-in. Please login with Google.');
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
        googleId: (user as any).googleId || null,
        hasPassword: true,
        isAdmin: (user as any).isAdmin || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  async googleLogin(credential: string, userInfo?: { email: string; name: string; picture?: string; sub: string }) {
    let email: string;
    let googleId: string;
    let name: string;
    let picture: string | undefined;

    if (userInfo?.email && userInfo?.sub) {
      // Implicit flow: frontend already fetched user info with access token
      // Verify the access token is valid by calling Google's tokeninfo
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${credential}`);
      if (!tokenInfoRes.ok) {
        throw new UnauthorizedError('Invalid Google access token');
      }
      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfo.email !== userInfo.email) {
        throw new UnauthorizedError('Token email mismatch');
      }

      email = userInfo.email;
      googleId = userInfo.sub;
      name = userInfo.name || email.split('@')[0];
      picture = userInfo.picture;
    } else {
      // ID token flow (Google One Tap / credential response)
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedError('Invalid Google token');
      }

      email = payload.email;
      googleId = payload.sub!;
      name = payload.name || email.split('@')[0];
      picture = payload.picture;
    }

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
    });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: user.avatarUrl || picture },
        });
      }
    } else {
      // Create new user (no password needed for Google-only users)
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          googleId,
          avatarUrl: picture,
        },
      });

      // Auto-create a personal team
      await prisma.team.create({
        data: {
          name: `${user.name}'s Team`,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });
    }

    const tokens = await generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        googleId: user.googleId || null,
        hasPassword: !!user.passwordHash,
        isAdmin: (user as any).isAdmin || false,
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
        googleId: true,
        isAdmin: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const { passwordHash, ...rest } = user;
    return { ...rest, hasPassword: !!passwordHash };
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
        googleId: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async updatePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    if (!user.passwordHash) {
      throw new AppError(400, 'NO_PASSWORD', 'This account does not have a password. Use "Set Password" instead.');
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    // Validate new password complexity
    if (!input.newPassword || input.newPassword.length < 8) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(input.newPassword)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(input.newPassword)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must contain at least one number');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password updated successfully' };
  }

  async setPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    if (user.passwordHash) {
      throw new AppError(400, 'HAS_PASSWORD', 'This account already has a password. Use "Change Password" instead.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must contain at least one number');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password set successfully' };
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

  async linkGoogle(userId: string, credential: string, userInfo?: { email: string; name: string; picture?: string; sub: string }) {
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new UnauthorizedError('User not found');
    if (currentUser.googleId) {
      throw new AppError(409, 'ALREADY_LINKED', 'Google account is already linked');
    }

    let googleId: string;
    let email: string;

    if (userInfo?.email && userInfo?.sub) {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${credential}`);
      if (!tokenInfoRes.ok) throw new UnauthorizedError('Invalid Google access token');
      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfo.email !== userInfo.email) throw new UnauthorizedError('Token email mismatch');
      googleId = userInfo.sub;
      email = userInfo.email;
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedError('Invalid Google token');
      googleId = payload.sub!;
      email = payload.email;
    }

    // Check email matches
    if (email !== currentUser.email) {
      throw new AppError(400, 'EMAIL_MISMATCH', 'Google account email must match your account email');
    }

    // Check if this Google ID is already used by another account
    const existingGoogle = await prisma.user.findFirst({ where: { googleId } });
    if (existingGoogle && existingGoogle.id !== userId) {
      throw new AppError(409, 'GOOGLE_ALREADY_USED', 'This Google account is already linked to another user');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { googleId },
      select: { id: true, email: true, name: true, avatarUrl: true, googleId: true, isAdmin: true, createdAt: true, updatedAt: true },
    });

    return user;
  }

  async unlinkGoogle(userId: string) {
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new UnauthorizedError('User not found');
    if (!currentUser.googleId) {
      throw new AppError(400, 'NOT_LINKED', 'No Google account is linked');
    }
    // Can't unlink if no password (would lock out the user)
    if (!currentUser.passwordHash) {
      throw new AppError(400, 'NO_PASSWORD', 'Please set a password before unlinking Google. You would be locked out otherwise.');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { googleId: null },
      select: { id: true, email: true, name: true, avatarUrl: true, googleId: true, isAdmin: true, createdAt: true, updatedAt: true },
    });

    return user;
  }
}

export const authService = new AuthService();
