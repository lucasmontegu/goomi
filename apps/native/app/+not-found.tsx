import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from '@/src/ui/core';
import { Doodle } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { useTheme } from '@/src/ui/use-theme';

export default function NotFound() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20, paddingHorizontal: 28, justifyContent: 'space-between' }}>
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View>
        <Mascot pose="think" size={210} motion="think" />
        <Doodle kind="spark" size={34} color={t.text} style={{ position: 'absolute', right: -6, top: 10 }} />
      </View>
      <Txt weight="display" size={18} color={t.muted}>Hmm, where did that go?</Txt>
      <Txt size={28} weight="bold" color={t.text} style={{ textAlign: 'center', letterSpacing: -0.9, lineHeight: 34 }}>This page wandered off</Txt>
      <Txt size={14} color={t.muted} style={{ textAlign: 'center', maxWidth: 290 }}>The link may be old, or it points somewhere Goomi doesn’t know yet.</Txt>
    </View>
    <Button title="Take me home" icon="arrow-forward" onPress={() => router.replace('/' as Href)} />
  </View>;
}
