import { Redirect } from 'expo-router';
import { useGoomi } from '@/src/state/store';
export default function Index() { const complete = useGoomi((s) => s.profile.onboardingComplete); return <Redirect href={complete ? '/(tabs)' : '/onboarding'} />; }
