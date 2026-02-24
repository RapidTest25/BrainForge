import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
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
        set({
          tokens: JSON.parse(tokens),
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
