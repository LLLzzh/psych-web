import { create } from "zustand";
import { getStudentProfile, type StudentProfile } from "../apis/profile";

interface ProfileState {
  profile: StudentProfile | null;
  isLoading: boolean;
  setProfile: (profile: StudentProfile) => void;
  loadProfile: () => Promise<StudentProfile | null>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null, isLoading: false }),
  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await getStudentProfile();
      set({ profile, isLoading: false });
      return profile;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
