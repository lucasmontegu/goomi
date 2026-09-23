import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, createInitialLearningState, recordAnswer, type Answer, type Challenge, type LearningState, type Profile, type Settings, type StudyMaterial } from '../domain';

type Store = {
  hydrated: boolean;
  onboardingStep: number;
  profile: Profile;
  settings: Settings;
  learning: LearningState;
  analyticsConsent: boolean;
  devPreview: boolean;
  setDevPreview: (value: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setStep: (step: number) => void;
  completeOnboarding: () => void;
  answer: (challenge: Challenge, answer: Answer) => void;
  addMaterial: (material: StudyMaterial) => void;
  removeMaterial: (id: string) => void;
  saveTopic: (id: Profile['interests'][number]) => void;
  setAnalyticsConsent: (value: boolean) => void;
  reset: () => void;
};
export const useGoomi = create<Store>()(persist((set) => ({
  hydrated: false, onboardingStep: 0, profile: { ...DEFAULT_PROFILE }, settings: { ...DEFAULT_SETTINGS }, learning: createInitialLearningState(), analyticsConsent: false,
  devPreview: false,
  // Development-only, never persisted: lets the simulator reach the app without a store entitlement.
  setDevPreview: (value) => set((state) => ({ devPreview: __DEV__ && value, profile: __DEV__ && value ? { ...state.profile, onboardingComplete: true } : state.profile })),
  updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  setStep: (onboardingStep) => set({ onboardingStep }),
  completeOnboarding: () => set((state) => ({ profile: { ...state.profile, onboardingComplete: true } })),
  answer: (challenge, answer) => set((state) => ({ learning: recordAnswer(state.learning, challenge, answer, Date.now()) })),
  addMaterial: (material) => set((state) => ({ learning: { ...state.learning, materials: [material, ...state.learning.materials.filter((m) => m.id !== material.id)] } })),
  removeMaterial: (id) => set((state) => ({ learning: { ...state.learning, materials: state.learning.materials.filter((m) => m.id !== id) } })),
  saveTopic: (id) => set((state) => ({ learning: { ...state.learning, savedTopicIds: state.learning.savedTopicIds.includes(id) ? state.learning.savedTopicIds.filter((topic) => topic !== id) : [...state.learning.savedTopicIds, id] } })),
  setAnalyticsConsent: (analyticsConsent) => set({ analyticsConsent }),
  reset: () => set({ onboardingStep: 0, profile: { ...DEFAULT_PROFILE }, settings: { ...DEFAULT_SETTINGS }, learning: createInitialLearningState(), analyticsConsent: false, devPreview: false }),
}), { name: 'goomi-v1', storage: createJSONStorage(() => AsyncStorage), partialize: ({ hydrated, devPreview, ...state }) => state, onRehydrateStorage: () => () => useGoomi.setState({ hydrated: true }) }));
