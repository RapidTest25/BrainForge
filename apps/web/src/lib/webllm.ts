'use client';

import { CreateMLCEngine, MLCEngine, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

// Available local models (small enough for browser, good quality)
export const LOCAL_MODELS = [
  { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', name: 'SmolLM2 360M', contextWindow: 2048, size: '~250 MB' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', contextWindow: 8192, size: '~700 MB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 3B', contextWindow: 8192, size: '~1.8 GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B', contextWindow: 32768, size: '~1 GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', contextWindow: 8192, size: '~1.4 GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini 3.8B', contextWindow: 4096, size: '~2.2 GB' },
  { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B', contextWindow: 2048, size: '~630 MB' },
];

export type LoadingStatus = {
  stage: 'idle' | 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  text: string;
};

let engineInstance: MLCEngine | null = null;
let currentModelId: string | null = null;
let loadingPromise: Promise<MLCEngine> | null = null;

export function isWebGPUSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'gpu' in navigator;
}

export async function loadLocalModel(
  modelId: string,
  onProgress?: (status: LoadingStatus) => void
): Promise<MLCEngine> {
  // If already loaded with the same model, return existing engine
  if (engineInstance && currentModelId === modelId) {
    onProgress?.({ stage: 'ready', progress: 100, text: 'Model ready' });
    return engineInstance;
  }

  // If already loading the same model, wait for it
  if (loadingPromise && currentModelId === modelId) {
    return loadingPromise;
  }

  // Unload previous model if different
  if (engineInstance && currentModelId !== modelId) {
    engineInstance.unload();
    engineInstance = null;
    currentModelId = null;
  }

  currentModelId = modelId;
  onProgress?.({ stage: 'loading', progress: 0, text: 'Initializing...' });

  loadingPromise = CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      onProgress?.({
        stage: 'loading',
        progress: Math.round(report.progress * 100),
        text: report.text || 'Loading model...',
      });
    },
  });

  try {
    engineInstance = await loadingPromise;
    onProgress?.({ stage: 'ready', progress: 100, text: 'Model ready' });
    return engineInstance;
  } catch (err: any) {
    currentModelId = null;
    loadingPromise = null;
    onProgress?.({ stage: 'error', progress: 0, text: err.message || 'Failed to load model' });
    throw err;
  }
}

export async function chatWithLocalModel(
  engine: MLCEngine,
  messages: ChatCompletionMessageParam[],
  systemPrompt?: string
): Promise<string> {
  const fullMessages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  const reply = await engine.chat.completions.create({
    messages: fullMessages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return reply.choices[0]?.message?.content || '';
}

export function getLoadedModelId(): string | null {
  return currentModelId;
}

export function isModelLoaded(): boolean {
  return engineInstance !== null;
}
