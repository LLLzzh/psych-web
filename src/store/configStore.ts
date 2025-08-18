import { create } from "zustand";

interface ConfigState {
  config: any | null;
  setConfig: (cfg: any) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  setConfig: (cfg) => set({ config: cfg }),
}));