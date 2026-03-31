import { create } from "zustand";
import { type ConfigPayload } from "../protocol/message";

type Theme = "light" | "dark";

interface ConfigState {
  config: ConfigPayload | null;
  theme: Theme;
  backgroundImage: string;
  modelView: string;
  setConfig: (cfg: ConfigPayload) => void;
  clearConfig: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setBackgroundImage: (url: string) => void;
  setModelView: (url: string) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  theme: "light",
  backgroundImage: "",
  modelView: "",
  setConfig: (cfg: ConfigPayload) => set({ config: cfg }),
  clearConfig: () => set({ config: null }),
  setTheme: (theme: Theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setBackgroundImage: (url: string) => set({ backgroundImage: url }),
  setModelView: (url: string) => set({ modelView: url }),
}));
