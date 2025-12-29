// Zustand store for user profile and preferences
// UI preferences and user settings only
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  preferences: {
    theme?: "light" | "dark";
    currency?: string;
  };
  setPreference: <K extends keyof UserState["preferences"]>(
    key: K,
    value: UserState["preferences"][K]
  ) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      preferences: {},
      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),
    }),
    {
      name: "user-preferences",
    }
  )
);
