import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string | null;
  hasPassword?: boolean;
  isAdmin?: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,

  setAuth: (user, tokens) => {
    localStorage.setItem('brainforge_tokens', JSON.stringify(tokens));
    localStorage.setItem('brainforge_user', JSON.stringify(user));
    set({ user, tokens, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('brainforge_tokens');
    localStorage.removeItem('brainforge_user');
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...partial };
      localStorage.setItem('brainforge_user', JSON.stringify(updated));
      set({ user: updated });
    }
  },

  hydrate: () => {
    try {
      const tokens = localStorage.getItem('brainforge_tokens');
      const user = localStorage.getItem('brainforge_user');
      if (tokens && user) {
        const parsedTokens = JSON.parse(tokens);
        // Check if access token is expired by decoding JWT payload
        try {
          const payload = JSON.parse(atob(parsedTokens.accessToken.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Access token expired — still hydrate (refresh will handle it)
            // but if refresh token is also expired, clear everything
            if (parsedTokens.refreshToken) {
              const refreshPayload = JSON.parse(atob(parsedTokens.refreshToken.split('.')[1]));
              if (refreshPayload.exp && refreshPayload.exp * 1000 < Date.now()) {
                localStorage.removeItem('brainforge_tokens');
                localStorage.removeItem('brainforge_user');
                return;
              }
            }
          }
        } catch {
          // If token decode fails, still try to hydrate
        }
        set({
          tokens: parsedTokens,
          user: JSON.parse(user),
          isAuthenticated: true,
        });
      }
    } catch {
      localStorage.removeItem('brainforge_tokens');
      localStorage.removeItem('brainforge_user');
    }
  },
}));
