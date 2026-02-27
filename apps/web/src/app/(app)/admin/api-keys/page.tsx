'use client';

import { Key, Lock, Info } from 'lucide-react';

export default function AdminAPIKeysPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of AI API keys configured by users.</p>
      </div>

      {/* Info Card */}
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Key className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">User-Managed API Keys</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            API keys are managed individually by each user through their settings page. 
            Keys are encrypted at rest and never stored in plain text.
          </p>
          <div className="flex items-start gap-3 text-left bg-muted/50 rounded-lg p-4 mt-4">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Security Note</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admin users cannot view or access user API keys. Key counts per user are visible in the Users management page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-left bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Supported Providers</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                OpenAI, Claude, Gemini, Groq, Mistral, DeepSeek, OpenRouter, Ollama, Copilot, and Custom providers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
