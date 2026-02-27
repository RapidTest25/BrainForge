import { prisma } from '../../lib/prisma.js';
import os from 'os';

// Default settings that will be seeded on first access
const DEFAULT_SETTINGS: Array<{ category: string; key: string; value: string; type: string; label: string }> = [
  // General
  { category: 'general', key: 'app_name', value: 'BrainForge', type: 'string', label: 'Application Name' },
  { category: 'general', key: 'app_description', value: 'Collaborative Project Management Platform', type: 'string', label: 'Description' },
  { category: 'general', key: 'maintenance_mode', value: 'false', type: 'boolean', label: 'Maintenance Mode' },
  { category: 'general', key: 'default_language', value: 'en', type: 'string', label: 'Default Language' },
  { category: 'general', key: 'timezone', value: 'UTC', type: 'string', label: 'Default Timezone' },
  { category: 'general', key: 'max_upload_size_mb', value: '10', type: 'number', label: 'Max Upload Size (MB)' },
  { category: 'general', key: 'allow_registration', value: 'true', type: 'boolean', label: 'Allow New Registrations' },
  // Email
  { category: 'email', key: 'smtp_host', value: '', type: 'string', label: 'SMTP Host' },
  { category: 'email', key: 'smtp_port', value: '587', type: 'number', label: 'SMTP Port' },
  { category: 'email', key: 'smtp_user', value: '', type: 'string', label: 'SMTP Username' },
  { category: 'email', key: 'smtp_secure', value: 'true', type: 'boolean', label: 'Use TLS/SSL' },
  { category: 'email', key: 'email_from_name', value: 'BrainForge', type: 'string', label: 'From Name' },
  { category: 'email', key: 'email_from_address', value: 'noreply@brainforge.dev', type: 'string', label: 'From Address' },
  { category: 'email', key: 'send_welcome_email', value: 'true', type: 'boolean', label: 'Send Welcome Email' },
  { category: 'email', key: 'send_invite_email', value: 'true', type: 'boolean', label: 'Send Team Invite Emails' },
  // Notifications
  { category: 'notifications', key: 'enable_in_app', value: 'true', type: 'boolean', label: 'In-App Notifications' },
  { category: 'notifications', key: 'enable_email_notifications', value: 'true', type: 'boolean', label: 'Email Notifications' },
  { category: 'notifications', key: 'notify_on_task_assign', value: 'true', type: 'boolean', label: 'Notify on Task Assignment' },
  { category: 'notifications', key: 'notify_on_mention', value: 'true', type: 'boolean', label: 'Notify on Mention' },
  { category: 'notifications', key: 'notify_on_team_invite', value: 'true', type: 'boolean', label: 'Notify on Team Invitation' },
  { category: 'notifications', key: 'digest_frequency', value: 'daily', type: 'string', label: 'Digest Frequency' },
  // Security
  { category: 'security', key: 'session_timeout_hours', value: '24', type: 'number', label: 'Session Timeout (hours)' },
  { category: 'security', key: 'max_login_attempts', value: '5', type: 'number', label: 'Max Login Attempts' },
  { category: 'security', key: 'lockout_duration_minutes', value: '15', type: 'number', label: 'Lockout Duration (min)' },
  { category: 'security', key: 'require_strong_password', value: 'true', type: 'boolean', label: 'Require Strong Password' },
  { category: 'security', key: 'min_password_length', value: '8', type: 'number', label: 'Minimum Password Length' },
  { category: 'security', key: 'enable_google_oauth', value: 'true', type: 'boolean', label: 'Enable Google OAuth' },
  { category: 'security', key: 'enable_two_factor', value: 'false', type: 'boolean', label: 'Enable Two-Factor Auth' },
  { category: 'security', key: 'allowed_domains', value: '', type: 'string', label: 'Allowed Email Domains (comma-separated)' },
  { category: 'security', key: 'cors_origins', value: '*', type: 'string', label: 'CORS Allowed Origins' },
  // AI
  { category: 'ai', key: 'default_ai_provider', value: 'OPENAI', type: 'string', label: 'Default AI Provider' },
  { category: 'ai', key: 'ai_enabled', value: 'true', type: 'boolean', label: 'Enable AI Features' },
  { category: 'ai', key: 'max_tokens_per_request', value: '4096', type: 'number', label: 'Max Tokens per Request' },
  { category: 'ai', key: 'daily_request_limit', value: '100', type: 'number', label: 'Daily Request Limit per User' },
  { category: 'ai', key: 'enable_brainstorm', value: 'true', type: 'boolean', label: 'Enable Brainstorm Feature' },
  { category: 'ai', key: 'enable_ai_chat', value: 'true', type: 'boolean', label: 'Enable AI Chat' },
  { category: 'ai', key: 'enable_diagram_ai', value: 'true', type: 'boolean', label: 'Enable AI Diagrams' },
  { category: 'ai', key: 'rate_limit_per_minute', value: '10', type: 'number', label: 'Rate Limit (requests/min)' },
  { category: 'ai', key: 'cost_alert_threshold', value: '50', type: 'number', label: 'Cost Alert Threshold ($)' },
  // Version & Info (editable display values)
  { category: 'version', key: 'app_name', value: 'BrainForge', type: 'string', label: 'Application Name' },
  { category: 'version', key: 'app_tagline', value: 'Collaborative Project Management Platform', type: 'string', label: 'App Tagline' },
  { category: 'version', key: 'api_version', value: '0.0.1', type: 'string', label: 'API Version' },
  { category: 'version', key: 'web_version', value: '0.1.0', type: 'string', label: 'Web Version' },
  { category: 'version', key: 'environment_label', value: 'development', type: 'string', label: 'Environment Label' },
  { category: 'version', key: 'database_provider', value: 'PostgreSQL', type: 'string', label: 'Database Provider' },
  { category: 'version', key: 'database_orm', value: 'Prisma 6', type: 'string', label: 'Database ORM' },
  { category: 'version', key: 'frontend_tech', value: 'Next.js 15', type: 'string', label: 'Frontend Technology' },
  { category: 'version', key: 'backend_tech', value: 'Fastify 5', type: 'string', label: 'Backend Technology' },
  { category: 'version', key: 'auth_method', value: 'JWT + Google OAuth', type: 'string', label: 'Auth Method' },
  { category: 'version', key: 'realtime_tech', value: 'Socket.IO', type: 'string', label: 'Realtime Technology' },
];

class SettingsService {
  private async ensureSeeded() {
    const count = await prisma.systemSetting.count();
    if (count === 0) {
      await prisma.systemSetting.createMany({
        data: DEFAULT_SETTINGS,
        skipDuplicates: true,
      });
    }
  }

  async getAllSettings() {
    await this.ensureSeeded();
    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, Array<{
      id: string; key: string; value: string; type: string; label: string | null; updatedAt: Date;
    }>> = {};

    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({
        id: s.id,
        key: s.key,
        value: s.value,
        type: s.type,
        label: s.label,
        updatedAt: s.updatedAt,
      });
    }

    return grouped;
  }

  async getSettingsByCategory(category: string) {
    await this.ensureSeeded();
    return prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  async updateSetting(category: string, key: string, value: string) {
    const existing = await prisma.systemSetting.findUnique({
      where: { category_key: { category, key } },
    });

    if (!existing) {
      return prisma.systemSetting.create({
        data: { category, key, value, type: 'string' },
      });
    }

    return prisma.systemSetting.update({
      where: { category_key: { category, key } },
      data: { value },
    });
  }

  async updateBulk(settings: Array<{ category: string; key: string; value: string }>) {
    const results = await Promise.all(
      settings.map(s => this.updateSetting(s.category, s.key, s.value))
    );
    return results;
  }

  async resetCategory(category: string) {
    const defaults = DEFAULT_SETTINGS.filter(s => s.category === category);
    if (defaults.length === 0) return [];

    const results = await Promise.all(
      defaults.map(d =>
        prisma.systemSetting.upsert({
          where: { category_key: { category: d.category, key: d.key } },
          update: { value: d.value },
          create: d,
        })
      )
    );
    return results;
  }

  // Version and runtime information
  async getVersionInfo() {
    await this.ensureSeeded();

    // Read editable version settings from DB
    const versionSettings = await prisma.systemSetting.findMany({
      where: { category: 'version' },
    });
    const vs: Record<string, string> = {};
    for (const s of versionSettings) {
      vs[s.key] = s.value;
    }

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${days}d ${hours}h ${mins}m ${secs}s`;

    return {
      app: {
        name: vs.app_name || 'BrainForge',
        tagline: vs.app_tagline || 'Collaborative Project Management Platform',
        apiVersion: vs.api_version || '0.0.1',
        webVersion: vs.web_version || '0.1.0',
        environment: vs.environment_label || process.env.NODE_ENV || 'development',
      },
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: uptimeStr,
        uptimeSeconds: Math.floor(uptimeSeconds),
        pid: process.pid,
      },
      system: {
        hostname: os.hostname(),
        osType: os.type(),
        osRelease: os.release(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMemoryGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
        freeMemoryGB: (os.freemem() / (1024 ** 3)).toFixed(2),
        memoryUsagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1),
        loadAverage: os.loadavg().map(l => l.toFixed(2)),
      },
      process: {
        memoryUsageMB: {
          rss: (process.memoryUsage().rss / (1024 ** 2)).toFixed(2),
          heapUsed: (process.memoryUsage().heapUsed / (1024 ** 2)).toFixed(2),
          heapTotal: (process.memoryUsage().heapTotal / (1024 ** 2)).toFixed(2),
          external: (process.memoryUsage().external / (1024 ** 2)).toFixed(2),
        },
      },
      database: {
        provider: vs.database_provider || 'PostgreSQL',
        orm: vs.database_orm || 'Prisma 6',
      },
      stack: {
        frontend: vs.frontend_tech || 'Next.js 15',
        backend: vs.backend_tech || 'Fastify 5',
        auth: vs.auth_method || 'JWT + Google OAuth',
        realtime: vs.realtime_tech || 'Socket.IO',
      },
    };
  }
}

export const settingsService = new SettingsService();
