import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    brainstormSessions: number;
    diagrams: number;
    goals: number;
  };
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,

  setProjects: (projects) => {
    set({ projects });
    const saved = localStorage.getItem('brainforge_active_project');
    if (saved) {
      const active = projects.find(p => p.id === saved);
      if (active) set({ activeProject: active });
    }
  },

  setActiveProject: (project) => {
    if (project) {
      localStorage.setItem('brainforge_active_project', project.id);
    } else {
      localStorage.removeItem('brainforge_active_project');
    }
    set({ activeProject: project });
  },

  addProject: (project) => set(s => ({ projects: [...s.projects, project] })),

  updateProject: (id, data) => set(s => ({
    projects: s.projects.map(p => p.id === id ? { ...p, ...data } : p),
    activeProject: s.activeProject?.id === id ? { ...s.activeProject, ...data } : s.activeProject,
  })),

  removeProject: (id) => set(s => ({
    projects: s.projects.filter(p => p.id !== id),
    activeProject: s.activeProject?.id === id ? null : s.activeProject,
  })),
}));
