import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  theme: "dark" | "light";
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  theme: "dark",
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
