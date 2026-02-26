import { prisma } from '../../lib/prisma.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { AIProviderType } from '@brainforge/types';

class AIKeyService {
  async addKey(userId: string, provider: string, apiKey: string, label?: string) {
    const existing = await prisma.userAIKey.findFirst({
      where: { userId, provider: provider as any },
    });
    if (existing) {
      throw new ConflictError(`API key for ${provider} already exists. Update instead.`);
    }
    const encryptedKey = encrypt(apiKey);
    return prisma.userAIKey.create({
      data: {
        userId,
        provider: provider as any,
        encryptedKey,
        label: label || provider,
        isActive: true,
      },
      select: { id: true, provider: true, label: true, isActive: true, lastUsedAt: true, createdAt: true },
    });
  }

  async getUserKeys(userId: string) {
    return prisma.userAIKey.findMany({
      where: { userId },
      select: { id: true, provider: true, label: true, isActive: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateKey(userId: string, keyId: string, data: { apiKey?: string; label?: string }) {
    const key = await prisma.userAIKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundError('API key not found');
    const updateData: any = {};
    if (data.label) updateData.label = data.label;
    if (data.apiKey) {
      updateData.encryptedKey = encrypt(data.apiKey);
      updateData.isActive = true;
    }
    return prisma.userAIKey.update({
      where: { id: keyId },
      data: updateData,
      select: { id: true, provider: true, label: true, isActive: true, lastUsedAt: true, createdAt: true },
    });
  }

  async deleteKey(userId: string, keyId: string) {
    const key = await prisma.userAIKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundError('API key not found');
    await prisma.userAIKey.delete({ where: { id: keyId } });
  }

  async getDecryptedKey(userId: string, provider: string): Promise<string> {
    const key = await prisma.userAIKey.findFirst({
      where: { userId, provider: provider as any, isActive: true },
    });
    if (!key) throw new NotFoundError(`No valid API key found for ${provider}. Please add one in settings.`);
    await prisma.userAIKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return decrypt(key.encryptedKey);
  }

  async markKeyInvalid(userId: string, provider: string) {
    await prisma.userAIKey.updateMany({
      where: { userId, provider: provider as any },
      data: { isActive: false },
    });
  }

  async markKeyValid(userId: string, provider: string) {
    await prisma.userAIKey.updateMany({
      where: { userId, provider: provider as any },
      data: { isActive: true },
    });
  }

  async getKeyForValidation(userId: string, keyId: string) {
    const key = await prisma.userAIKey.findFirst({ where: { id: keyId, userId } });
    if (!key) return null;
    return { provider: key.provider, decryptedKey: decrypt(key.encryptedKey) };
  }

  async logUsage(userId: string, provider: string, model: string, inputTokens: number, outputTokens: number, cost: number) {
    return prisma.aIUsageLog.create({
      data: {
        userId,
        provider: provider as any,
        model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        estimatedCost: cost,
        feature: 'chat',
      },
    });
  }

  async getUsageStats(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const logs = await prisma.aIUsageLog.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
    let totalTokens = 0, totalCost = 0;
    for (const log of logs) {
      if (!byProvider[log.provider]) byProvider[log.provider] = { requests: 0, tokens: 0, cost: 0 };
      byProvider[log.provider].requests++;
      byProvider[log.provider].tokens += log.promptTokens + log.completionTokens;
      byProvider[log.provider].cost += log.estimatedCost;
      totalTokens += log.promptTokens + log.completionTokens;
      totalCost += log.estimatedCost;
    }
    return { totalRequests: logs.length, totalTokens, totalCost, byProvider, recentLogs: logs.slice(0, 50) };
  }
}

export const aiKeyService = new AIKeyService();
