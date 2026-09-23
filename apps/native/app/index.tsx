import { Redirect, type Href } from 'expo-router';
import { useGoomi } from '@/src/state/store';

/** Cold start lands by state; the splash stays up until the store has hydrated (see _layout). */
export default function Index() {
  const complete = useGoomi((s) => s.profile.onboardingComplete);
  return <Redirect href={(complete ? '/(tabs)' : '/onboarding') as Href} />;
}
