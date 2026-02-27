'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Globe, Mail, Shield, Bot, Info, Server,
  Loader2, RefreshCw, Save, RotateCcw, CheckCircle2,
  Cpu, HardDrive, Database, Clock, MemoryStick, Monitor,
  Bell, AlertTriangle,
  ChevronRight, Hash, ToggleLeft, Type, Package, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  label: string | null;
  updatedAt: string;
}

interface VersionInfo {
  app: { name: string; tagline: string; apiVersion: string; webVersion: string; environment: string };
  runtime: { nodeVersion: string; platform: string; arch: string; uptime: string; uptimeSeconds: number; pid: number };
  system: {
    hostname: string; osType: string; osRelease: string;
    cpus: number; cpuModel: string;
    totalMemoryGB: string; freeMemoryGB: string; memoryUsagePercent: string;
    loadAverage: string[];
  };
  process: { memoryUsageMB: { rss: string; heapUsed: string; heapTotal: string; external: string } };
  database: { provider: string; orm: string };
  stack: { frontend: string; backend: string; auth: string; realtime: string };
}

type TabKey = 'version' | 'general' | 'email' | 'notifications' | 'security' | 'ai';

const TABS: { key: TabKey; label: string; icon: any; color: string }[] = [
  { key: 'version', label: 'Version & Info', icon: Info, color: '#7b68ee' },
  { key: 'general', label: 'General', icon: Globe, color: '#3b82f6' },
  { key: 'email', label: 'Email', icon: Mail, color: '#22c55e' },
  { key: 'notifications', label: 'Notifications', icon: Bell, color: '#f59e0b' },
  { key: 'security', label: 'Security & Auth', icon: Shield, color: '#ef4444' },
  { key: 'ai', label: 'AI & Integration', icon: Bot, color: '#8b5cf6' },
];

// ─── Helper Components ───────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground truncate">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ setting, value, onChange }: {
  setting: Setting;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const [showPassword] = useState(false);
  const TypeIcon = setting.type === 'boolean' ? ToggleLeft
    : setting.type === 'number' ? Hash
    : Type;

  if (setting.type === 'boolean') {
    const isOn = value === 'true';
    return (
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{setting.label || setting.key}</p>
            <p className="text-xs text-muted-foreground">{setting.key}</p>
          </div>
        </div>
        <button
          onClick={() => onChange(setting.key, isOn ? 'false' : 'true')}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            isOn ? 'bg-emerald-500' : 'bg-muted-foreground/30'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            isOn ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 group">
      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{setting.label || setting.key}</p>
        <p className="text-xs text-muted-foreground mb-1.5">{setting.key}</p>
        <input
          type={setting.key.includes('password') || setting.key.includes('secret') ? (showPassword ? 'text' : 'password') : setting.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => onChange(setting.key, e.target.value)}
          className="w-full h-8 px-3 rounded-md bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-colors"
          placeholder={setting.label || setting.key}
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('version');
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [allSettings, setAllSettings] = useState<Record<string, Setting[]>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [verRes, setRes] = await Promise.all([
        api.get('/admin/settings/version').catch(() => ({ data: null })),
        api.get('/admin/settings').catch(() => ({ data: null })),
      ]) as any[];

      if (verRes.data) setVersionInfo(verRes.data);
      if (setRes.data) {
        setAllSettings(setRes.data);
        const flat: Record<string, string> = {};
        for (const cat of Object.keys(setRes.data)) {
          for (const s of setRes.data[cat]) {
            flat[`${cat}::${s.key}`] = s.value;
          }
        }
        setEditedValues(flat);
        setOriginalValues(flat);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleChange = (category: string, key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [`${category}::${key}`]: value }));
    setSaveSuccess(false);
  };

  const hasChanges = (category: string) => {
    const settings = allSettings[category] || [];
    return settings.some(s => editedValues[`${category}::${s.key}`] !== originalValues[`${category}::${s.key}`]);
  };

  const hasAnyChanges = Object.keys(allSettings).some(cat => hasChanges(cat));

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes: Array<{ category: string; key: string; value: string }> = [];
      for (const cat of Object.keys(allSettings)) {
        for (const s of allSettings[cat]) {
          const compositeKey = `${cat}::${s.key}`;
          if (editedValues[compositeKey] !== originalValues[compositeKey]) {
            changes.push({ category: cat, key: s.key, value: editedValues[compositeKey] });
          }
        }
      }
      if (changes.length > 0) {
        await api.post('/admin/settings/bulk', { settings: changes });
        setOriginalValues({ ...editedValues });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (category: string) => {
    setResetting(true);
    try {
      await api.post(`/admin/settings/${category}/reset`);
      await fetchAll();
    } catch {} finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Application configuration, version info, and system preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasAnyChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          )}
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-md">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="flex gap-6">
        {/* Tab Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const modified = hasChanges(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isActive ? `${tab.color}20` : `${tab.color}10` }}
                >
                  <tab.icon className="h-3.5 w-3.5" style={{ color: tab.color }} />
                </div>
                <span className="flex-1 truncate">{tab.label}</span>
                {modified && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-red-500/50" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'version' && (
            <VersionTab
              info={versionInfo}
              settings={allSettings['version'] || []}
              editedValues={editedValues}
              onChange={(key, value) => handleChange('version', key, value)}
              onReset={() => handleReset('version')}
              resetting={resetting}
              hasChanges={hasChanges('version')}
            />
          )}
          {activeTab !== 'version' && (
            <SettingsCategoryTab
              category={activeTab}
              settings={allSettings[activeTab] || []}
              editedValues={editedValues}
              onChange={(key, value) => handleChange(activeTab, key, value)}
              onReset={() => handleReset(activeTab)}
              resetting={resetting}
              hasChanges={hasChanges(activeTab)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Version Tab ─────────────────────────────────────────────────────────────

function VersionTab({ info, settings, editedValues, onChange, onReset, resetting, hasChanges }: {
  info: VersionInfo | null;
  settings: Setting[];
  editedValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  resetting: boolean;
  hasChanges: boolean;
}) {
  if (!info) {
    return <p className="text-sm text-muted-foreground">Unable to load version info.</p>;
  }

  const memPercent = parseFloat(info.system.memoryUsagePercent);

  return (
    <div className="space-y-6">
      {/* App Version Banner */}
      <div className="bg-linear-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
            <Package className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{info.app.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{info.app.tagline}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                <Server className="h-3 w-3" /> API v{info.app.apiVersion}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                <Monitor className="h-3 w-3" /> Web v{info.app.webVersion}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                info.app.environment === 'production'
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
              }`}>
                {info.app.environment}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Version Settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-red-500" />
            Version & Display Settings
          </h3>
          <Button variant="outline" size="sm" onClick={onReset} disabled={resetting} className="gap-2 text-xs">
            {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Reset Defaults
          </Button>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 mb-4">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-400">You have unsaved changes. Click &quot;Save Changes&quot; to apply.</span>
          </div>
        )}
        {settings.filter(s => s.key === 'web_version').length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No version settings found. They will appear after first load.</p>
        ) : (
          <div className="space-y-0">
            {settings.filter(s => s.key === 'web_version').map(s => (
              <SettingRow
                key={s.id}
                setting={s}
                value={editedValues[`version::${s.key}`] ?? s.value}
                onChange={(key, value) => onChange(key, value)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Version Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Server} label="API Version" value={`v${info.app.apiVersion}`} color="#ef4444" />
        <InfoCard icon={Monitor} label="Web Version" value={`v${info.app.webVersion}`} color="#3b82f6" />
        <InfoCard icon={Zap} label="Node.js" value={info.runtime.nodeVersion} color="#22c55e" />
        <InfoCard icon={Clock} label="Uptime" value={info.runtime.uptime} color="#f59e0b" />
      </div>

      {/* Runtime & System */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runtime Information */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            Runtime
          </h3>
          <div className="space-y-0">
            <DetailRow label="Node.js" value={info.runtime.nodeVersion} />
            <DetailRow label="Platform" value={`${info.runtime.platform} (${info.runtime.arch})`} />
            <DetailRow label="Process ID" value={String(info.runtime.pid)} />
            <DetailRow label="Uptime" value={info.runtime.uptime} />
            <DetailRow label="Hostname" value={info.system.hostname} />
            <DetailRow label="OS" value={`${info.system.osType} ${info.system.osRelease}`} />
          </div>
        </div>

        {/* System Resources */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-500" />
            System Resources
          </h3>
          <div className="space-y-3">
            <DetailRow label="CPU Model" value={info.system.cpuModel} />
            <DetailRow label="CPU Cores" value={String(info.system.cpus)} />
            <DetailRow label="Load Average" value={info.system.loadAverage.join(' / ')} />
            {/* Memory Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Memory Usage</span>
                <span className="text-xs font-medium text-foreground">{info.system.freeMemoryGB} GB free / {info.system.totalMemoryGB} GB</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    memPercent > 90 ? 'bg-red-500' : memPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{info.system.memoryUsagePercent}% used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Process Memory & Tech Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Memory */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-purple-500" />
            Process Memory
          </h3>
          <div className="space-y-0">
            <DetailRow label="RSS" value={`${info.process.memoryUsageMB.rss} MB`} />
            <DetailRow label="Heap Used" value={`${info.process.memoryUsageMB.heapUsed} MB`} />
            <DetailRow label="Heap Total" value={`${info.process.memoryUsageMB.heapTotal} MB`} />
            <DetailRow label="External" value={`${info.process.memoryUsageMB.external} MB`} />
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-red-500" />
            Technology Stack
          </h3>
          <div className="space-y-0">
            <DetailRow label="Frontend" value={info.stack.frontend} />
            <DetailRow label="Backend" value={info.stack.backend} />
            <DetailRow label="Database" value={`${info.database.provider} + ${info.database.orm}`} />
            <DetailRow label="Auth" value={info.stack.auth} />
            <DetailRow label="Realtime" value={info.stack.realtime} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

// ─── Settings Category Tab ───────────────────────────────────────────────────

function SettingsCategoryTab({ category, settings, editedValues, onChange, onReset, resetting, hasChanges }: {
  category: string;
  settings: Setting[];
  editedValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  resetting: boolean;
  hasChanges: boolean;
}) {
  const tabMeta = TABS.find(t => t.key === category);
  const Icon = tabMeta?.icon || Settings;
  const color = tabMeta?.color || '#6b7280';

  const titles: Record<string, string> = {
    general: 'General Settings',
    email: 'Email Configuration',
    notifications: 'Notification Preferences',
    security: 'Security & Authentication',
    ai: 'AI & Integration Settings',
  };

  const descriptions: Record<string, string> = {
    general: 'Configure application name, language, registration, and general behavior.',
    email: 'Set up SMTP server, email templates, and outgoing mail preferences.',
    notifications: 'Control in-app and email notification behavior.',
    security: 'Manage authentication, password policies, OAuth, and access control.',
    ai: 'Configure AI providers, rate limits, feature toggles, and cost alerts.',
  };

  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{titles[category] || category}</h2>
            <p className="text-xs text-muted-foreground">{descriptions[category] || ''}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} disabled={resetting} className="gap-2 text-xs">
          {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          Reset Defaults
        </Button>
      </div>

      {/* Change indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-400">You have unsaved changes. Click &quot;Save Changes&quot; to apply.</span>
        </div>
      )}

      {/* Settings List */}
      <div className="bg-card border border-border rounded-xl p-5">
        {settings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No settings found for this category.</p>
        ) : (
          <div className="space-y-0">
            {settings.map(s => (
              <SettingRow
                key={s.id}
                setting={s}
                value={editedValues[`${category}::${s.key}`] ?? s.value}
                onChange={(key, value) => onChange(key, value)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
