import '@/global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { BalsamiqSans_400Regular, BalsamiqSans_700Bold } from '@expo-google-fonts/balsamiq-sans';
import { useGoomi } from '@/src/state/store';
import { useAppLifecycle } from '@/src/state/runtime';
import { useContentSync } from '@/src/services/content-sync';
import { palette } from '@/src/ui/theme';

void SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: 'index' };
export default function Layout() {
  const [fontsLoaded, error] = useFonts({ Jakarta: PlusJakartaSans_400Regular, JakartaMedium: PlusJakartaSans_500Medium, JakartaSemibold: PlusJakartaSans_600SemiBold, JakartaBold: PlusJakartaSans_700Bold, Balsamiq: BalsamiqSans_400Regular, BalsamiqBold: BalsamiqSans_700Bold });
  const hydrated = useGoomi((s) => s.hydrated);
  useAppLifecycle();
  useContentSync();
  useEffect(() => { if ((fontsLoaded || error) && hydrated) void SplashScreen.hideAsync(); }, [fontsLoaded, error, hydrated]);
  if ((!fontsLoaded && !error) || !hydrated) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><KeyboardProvider><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ivory }, animation: 'slide_from_right' }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
    <Stack.Screen name="account" options={{ animation: 'fade', gestureEnabled: false }} />
    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    <Stack.Screen name="challenge" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="add" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.72, 1], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
    <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
    <Stack.Screen name="library" />
    <Stack.Screen name="material/[id]" />
    <Stack.Screen name="languages" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
    <Stack.Screen name="topic/[id]" />
    <Stack.Screen name="settings" />
    <Stack.Screen name="screen-time" options={{ presentation: 'modal' }} />
    <Stack.Screen name="legal" />
    <Stack.Screen name="goal" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.55], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
    <Stack.Screen name="mode" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.62], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
  </Stack></KeyboardProvider></SafeAreaProvider></GestureHandlerRootView>;
}
