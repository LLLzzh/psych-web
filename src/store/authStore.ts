import { create } from "zustand";
import { type UserInfo } from "../apis/login";
import { persist } from "zustand/middleware";

interface AuthState {
  userId: string;
  token: string;
  info: UserInfo | null;
  setAuth: (userId: string, token: string, info: UserInfo) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: "",
      token: "",
      info: null,
      setAuth: (userId, token, info) => set({ userId, token, info }),
      clearAuth: () => set({ userId: "", token: "", info: null }),
      isAuthenticated: () => {
        const { userId, token } = get();
        return !!userId && !!token;
      },
    }),
    {
      name: "auth-storage", // unique name for localStorage
    }
  )
);
