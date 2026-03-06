import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'BrainForge - AI Collaborative Workspace',
  description: 'Manage tasks, brainstorm with AI, create diagrams, plan sprints — all in one workspace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme-aware favicons */}
        <link rel="icon" href="/favicon.ico" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon-light.ico" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" href="/apple-icon.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/apple-icon-light.png" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
