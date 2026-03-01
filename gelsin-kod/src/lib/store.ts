import { create } from 'zustand';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // actions
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: false,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setRole: (role) => set({ role }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, isAuthenticated: false });
  },

  fetchProfile: async (userId: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ user: data as User, role: data.role, isAuthenticated: true });
    }
    set({ isLoading: false });
  },
}));

// ── TASK STORE ──
import { Task } from '@/types';

interface TaskState {
  nearbyTasks: Task[];
  myTasks: Task[];       // ev sahibi: kendi talepleri
  activeTasks: Task[];   // fixer: kabul ettiği işler
  isLoading: boolean;

  setNearbyTasks: (tasks: Task[]) => void;
  setMyTasks: (tasks: Task[]) => void;
  setActiveTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  nearbyTasks: [],
  myTasks: [],
  activeTasks: [],
  isLoading: false,

  setNearbyTasks: (tasks) => set({ nearbyTasks: tasks }),
  setMyTasks: (tasks) => set({ myTasks: tasks }),
  setActiveTasks: (tasks) => set({ activeTasks: tasks }),

  addTask: (task) => set((state) => ({
    myTasks: [task, ...state.myTasks],
  })),

  updateTask: (taskId, updates) => set((state) => ({
    myTasks: state.myTasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
    nearbyTasks: state.nearbyTasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
  })),
}));
