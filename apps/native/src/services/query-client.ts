import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { isFinalError } from './api';

/**
 * TanStack Query drives every server read and write (see content-sync.ts). The persisted zustand
 * stores stay the offline source of truth; queries fetch, dedupe, retry and refresh them.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (count, error) => !isFinalError(error) && count < 2, refetchOnReconnect: true, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

// "Window focus" on a phone is the app coming back to the foreground.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => subscription.remove();
});

// Queries pause offline and resume on reconnect instead of burning retries.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => setOnline(state.isConnected !== false));
  return () => subscription.remove();
});
