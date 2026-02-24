import { create } from 'zustand';

interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
}

interface TeamState {
  teams: Team[];
  activeTeam: Team | null;
  setTeams: (teams: Team[]) => void;
  setActiveTeam: (team: Team) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, data: Partial<Team>) => void;
  removeTeam: (id: string) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  activeTeam: null,

  setTeams: (teams) => {
    set({ teams });
    if (teams.length > 0 && !get().activeTeam) {
      const saved = localStorage.getItem('brainforge_active_team');
      const active = saved ? teams.find(t => t.id === saved) : null;
      set({ activeTeam: active || teams[0] });
    }
  },

  setActiveTeam: (team) => {
    localStorage.setItem('brainforge_active_team', team.id);
    set({ activeTeam: team });
  },

  addTeam: (team) => set(s => ({ teams: [...s.teams, team] })),

  updateTeam: (id, data) => set(s => ({
    teams: s.teams.map(t => t.id === id ? { ...t, ...data } : t),
    activeTeam: s.activeTeam?.id === id ? { ...s.activeTeam, ...data } : s.activeTeam,
  })),

  removeTeam: (id) => set(s => ({
    teams: s.teams.filter(t => t.id !== id),
    activeTeam: s.activeTeam?.id === id ? (s.teams.filter(t => t.id !== id)[0] || null) : s.activeTeam,
  })),
}));
