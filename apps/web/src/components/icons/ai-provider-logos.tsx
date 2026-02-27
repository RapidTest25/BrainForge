import { cn } from '@/lib/utils';
import { SiOpenai, SiAnthropic, SiGooglegemini, SiGithubcopilot } from 'react-icons/si';
import type { IconType } from 'react-icons';

interface LogoProps {
  className?: string;
}

// ── Wrapper for react-icons ──
function makeReactIconLogo(Icon: IconType) {
  return function ReactIconLogo({ className }: LogoProps) {
    return <Icon className={cn('h-5 w-5', className)} />;
  };
}

// Brand logos from react-icons (Simple Icons)
export const OpenAILogo = makeReactIconLogo(SiOpenai);
export const ClaudeLogo = makeReactIconLogo(SiAnthropic);
export const GeminiLogo = makeReactIconLogo(SiGooglegemini);
export const CopilotLogo = makeReactIconLogo(SiGithubcopilot);

// ── Groq Logo (no Simple Icon available) ──
export function GroqLogo({ className }: LogoProps) {
  return (
    <svg className={cn('h-5 w-5', className)} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.001 12c0 3.312-2.687 6-5.999 6s-5.999-2.688-5.999-6 2.687-6 5.999-6 5.999 2.688 5.999 6zm-5.999-4.8c-2.65 0-4.8 2.15-4.8 4.8s2.15 4.8 4.8 4.8 4.8-2.15 4.8-4.8-2.15-4.8-4.8-4.8zm0 3.6c-.662 0-1.2.538-1.2 1.2s.538 1.2 1.2 1.2.6-.538 1.2-1.2-.538-1.2-1.2-1.2zM21.6 6h-2.4V3.6c0-.662-.538-1.2-1.2-1.2s-1.2.538-1.2 1.2V6h-1.2V3.6c0-.662-.538-1.2-1.2-1.2H13.2c-.662 0-1.2.538-1.2 1.2V6h-1.2V3.6c0-.662-.538-1.2-1.2-1.2H8.4c-.662 0-1.2.538-1.2 1.2V6H4.8c-.662 0-1.2.538-1.2 1.2v2.4h2.4v1.2H3.6v1.2h2.4v1.2H3.6v1.2c0 .662.538 1.2 1.2 1.2h2.4v2.4c0 .662.538 1.2 1.2 1.2h1.2c.662 0 1.2-.538 1.2-1.2V18h1.2v2.4c0 .662.538 1.2 1.2 1.2h1.2c.662 0 1.2-.538 1.2-1.2V18h1.2v2.4c0 .662.538 1.2 1.2 1.2s1.2-.538 1.2-1.2V18h2.4c.662 0 1.2-.538 1.2-1.2v-1.2h-2.4v-1.2h2.4v-1.2h-2.4v-1.2h2.4V7.2c0-.662-.538-1.2-1.2-1.2z" />
    </svg>
  );
}

// ── OpenRouter Logo (no Simple Icon available) ──
export function OpenRouterLogo({ className }: LogoProps) {
  return (
    <svg className={cn('h-5 w-5', className)} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.683 8.31v7.38l7.306 4.22 7.306-4.22V8.31L11.989 4.09 4.683 8.31zm7.306-5.903L20.614 7.15v9.702l-8.625 4.742L3.364 16.85V7.15l8.625-4.743zm-3.72 7.547a1.44 1.44 0 1 0 0-2.88 1.44 1.44 0 0 0 0 2.88zm7.44 0a1.44 1.44 0 1 0 0-2.88 1.44 1.44 0 0 0 0 2.88zm-7.86 2.88c.54 1.8 2.16 3.12 4.14 3.12s3.6-1.32 4.14-3.12H8.849z" />
    </svg>
  );
}

// ── Provider Logo Map ──
export const PROVIDER_LOGOS: Record<string, React.FC<LogoProps>> = {
  OPENAI: OpenAILogo,
  CLAUDE: ClaudeLogo,
  GEMINI: GeminiLogo,
  GROQ: GroqLogo,
  OPENROUTER: OpenRouterLogo,
  COPILOT: CopilotLogo,
};

export function ProviderLogo({ provider, className, style }: { provider: string; className?: string; style?: React.CSSProperties }) {
  const Logo = PROVIDER_LOGOS[provider.toUpperCase()];
  if (!Logo) return <div className={cn('h-5 w-5 rounded bg-muted', className)} style={style} />;
  return <span style={style}><Logo className={className} /></span>;
}
