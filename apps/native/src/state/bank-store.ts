import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EMPTY_BANK, applyBankPage, type BankPage, type BankState, type ConceptMemory } from '../domain';

/**
 * Synced bank content, persisted under its own key so answering a challenge never re-serializes
 * the (larger) cache. Selection reads `bank.items` synchronously; nothing here touches the network.
 */
type BankStore = {
  bank: BankState;
  /** Anonymous per-install identity for bank sync quotas (not linked to a person). */
  installId: string;
  applyPage: (page: BankPage, memories: Record<string, ConceptMemory>) => void;
  reset: () => void;
};

export const useBank = create<BankStore>()(persist((set) => ({
  bank: EMPTY_BANK,
  installId: randomUUID().replaceAll('-', ''),
  applyPage: (page, memories) => set((state) => ({ bank: applyBankPage(state.bank, page, memories, Date.now()) })),
  reset: () => set({ bank: EMPTY_BANK }),
}), { name: 'goomi-bank-v1', storage: createJSONStorage(() => AsyncStorage) }));
