import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";
import { api, refreshAccessToken } from "@/services/api";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (data) => {
        const { user, accessToken } = await api.post<AuthResponse>(
          "/auth/login",
          data,
        );
        set({ user, token: accessToken, isAuthenticated: true });
        const me = await api.get<User>("/users/me");
        set({ user: me });
      },

      register: async (data) => {
        const { user, accessToken } = await api.post<AuthResponse>(
          "/auth/register",
          data,
        );
        set({ user, token: accessToken, isAuthenticated: true });
        const me = await api.get<User>("/users/me");
        set({ user: me });
      },

      logout: async () => {
        await api.post("/auth/logout").catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
      },

      refresh: () => refreshAccessToken(),

      fetchMe: async () => {
        const user = await api.get<User>("/users/me");
        set({ user });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "investpro-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
