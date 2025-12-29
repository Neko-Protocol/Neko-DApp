// Zustand store for session state
// Session information and temporary UI state
import { create } from "zustand";

interface SessionState {
  sessionId?: string;
  isAuthenticated: boolean;
  setSession: (sessionId: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: undefined,
  isAuthenticated: false,
  setSession: (sessionId) => set({ sessionId, isAuthenticated: true }),
  clearSession: () => set({ sessionId: undefined, isAuthenticated: false }),
}));
