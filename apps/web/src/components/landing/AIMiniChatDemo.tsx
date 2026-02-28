// components/landing/AIMiniChatDemo.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;
import { Sparkles, Send } from 'lucide-react';
import type { HeroScene } from './useHeroTimeline';

interface AIMiniChatDemoProps {
  controls: AnimationControls;
  scene: HeroScene;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const CONVERSATION: ChatMessage[] = [
  { role: 'user', text: 'Break down the auth flow into tasks' },
  {
    role: 'ai',
    text: 'Here are 5 tasks for the auth flow:\n\n1. Setup JWT token service\n2. Create login/register endpoints\n3. Add password hashing\n4. Build OAuth2 Google flow\n5. Add refresh token rotation',
  },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-0.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1 w-1 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function AIMiniChatDemo({ controls, scene }: AIMiniChatDemoProps) {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedAIText, setDisplayedAIText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scene === 'A') {
      setVisibleMessages([]);
      setIsTyping(false);
      setDisplayedAIText('');
    }
  }, [scene]);

  useEffect(() => {
    if (scene !== 'D') return;
    const timeouts: NodeJS.Timeout[] = [];

    timeouts.push(
      setTimeout(() => setVisibleMessages([CONVERSATION[0]]), 300)
    );

    timeouts.push(
      setTimeout(() => setIsTyping(true), 700)
    );

    timeouts.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages([CONVERSATION[0], CONVERSATION[1]]);

        const fullText = CONVERSATION[1].text;
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          charIndex += 3;
          if (charIndex >= fullText.length) {
            setDisplayedAIText(fullText);
            clearInterval(typeInterval);
          } else {
            setDisplayedAIText(fullText.slice(0, charIndex));
          }
        }, 20);

        timeouts.push(typeInterval as unknown as NodeJS.Timeout);
      }, 1200)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [scene]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleMessages, displayedAIText, isTyping]);

  return (
    <motion.div
      animate={controls}
      className="w-45 sm:w-55 shrink-0 border-l border-border bg-card flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 sm:px-3 py-2 border-b border-border">
        <div className="h-4 w-4 rounded bg-linear-to-br from-primary to-[#a78bfa] flex items-center justify-center">
          <Sparkles className="h-2.5 w-2.5 text-white" />
        </div>
        <span className="text-[9px] sm:text-[10px] font-semibold text-foreground/80">AI Assistant</span>
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-2.5 py-2 space-y-1.5 max-h-45 sm:max-h-50">
        {visibleMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] as const }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-37.5 sm:max-w-42.5 rounded-lg px-2 py-1.5 text-[8px] sm:text-[9px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-muted text-foreground/80 rounded-bl-sm'
              }`}
            >
              <span className="whitespace-pre-line">
                {msg.role === 'ai' ? displayedAIText || '' : msg.text}
              </span>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-muted rounded-lg px-2.5 py-1.5 rounded-bl-sm">
              <TypingDots />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-2 sm:px-2.5 py-2 border-t border-border">
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-md px-2 py-1.5">
          <span className="text-[8px] sm:text-[9px] text-muted-foreground flex-1">Ask AI anything...</span>
          <Send className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
