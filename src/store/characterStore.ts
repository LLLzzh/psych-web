import { create } from "zustand";
import type { Character } from "../types/character";

interface CharacterState {
  selectedCharacter: Character | null;
  selectCharacter: (character: Character) => void;
  clearSelectedCharacter: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  selectedCharacter: null,
  selectCharacter: (selectedCharacter) => set({ selectedCharacter }),
  clearSelectedCharacter: () => set({ selectedCharacter: null }),
}));
