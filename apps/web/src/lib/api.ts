const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions extends RequestInit {
  token?: string;
  skipAuthRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token, skipAuthRetry, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for requests that have a body
    if (fetchOptions.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Try to get token from localStorage
      const stored = typeof window !== 'undefined' ? localStorage.getItem('brainforge_tokens') : null;
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        } catch {}
      }
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (res.status === 401) {
      // For auth endpoints (login, register, etc.), don't try refresh — just throw the error
      if (skipAuthRetry) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'Invalid credentials');
      }

      // Try refresh for other endpoints
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed}`;
        const retryRes = await fetch(`${this.baseUrl}${endpoint}`, { ...fetchOptions, headers });
        if (!retryRes.ok) {
          const errData = await retryRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${retryRes.status}`);
        }
        return retryRes.json();
      }
      // Clear and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('brainforge_tokens');
        localStorage.removeItem('brainforge_user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${res.status}`);
    }

    // For text responses (e.g. markdown export)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/')) {
      return (await res.text()) as unknown as T;
    }

    return res.json();
  }

  private async tryRefresh(): Promise<string | null> {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('brainforge_tokens') : null;
      if (!stored) return null;
      const tokens = JSON.parse(stored);

      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const newTokens = data.data;
      localStorage.setItem('brainforge_tokens', JSON.stringify(newTokens));
      return newTokens.accessToken;
    } catch {
      return null;
    }
  }

  get<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // SSE streaming
  async *streamPost(endpoint: string, body: unknown): AsyncGenerator<string> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('brainforge_tokens') : null;
    const token = stored ? JSON.parse(stored).accessToken : '';

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.content) yield json.content;
            if (json.error) throw new Error(json.error);
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    }
  }
}

export const api = new ApiClient(API_BASE);
