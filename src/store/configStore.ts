import { create } from "zustand";
import { type ConfigPayload } from "../protocol/message";

interface ConfigState {
  config: ConfigPayload | null;
  setConfig: (cfg: ConfigPayload) => void;
  clearConfig: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  setConfig: (cfg: ConfigPayload) => set({ config: cfg }),
  clearConfig: () => set({ config: null }),
}));