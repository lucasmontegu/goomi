import { Redirect, Tabs, router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGoomi } from '@/src/state/store';
import { Icon, Tactile, Txt, type IconName } from '@/src/ui/core';
import { palette } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

const items: { name: string; label: string; icon: IconName; active: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', active: 'home' },
  { name: 'explore', label: 'Explore', icon: 'compass-outline', active: 'compass' },
  { name: 'stats', label: 'Stats', icon: 'stats-chart-outline', active: 'stats-chart' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', active: 'person' },
];

export default function TabLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const onboarded = useGoomi((state) => state.profile.onboardingComplete);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.background }, animation: 'none' }} tabBar={({ state, navigation }) => {
    const press = (name: string, key: string, focused: boolean) => {
      const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) { if (useGoomi.getState().settings.haptics) void Haptics.selectionAsync(); navigation.navigate(name); }
    };
    return <View style={[styles.bar, { backgroundColor: t.background, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      {items.map((item, i) => {
        const route = state.routes.find((r) => r.name === item.name)!;
        const focused = state.routes[state.index]?.name === item.name;
        return <View key={item.name} style={{ flexDirection: 'row', flex: i === 1 ? 2 : 1 }}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label} onPress={() => press(item.name, route.key, focused)} style={styles.item}>
            <Icon name={focused ? item.active : item.icon} size={23} color={focused ? t.text : t.faint} />
            <Txt size={10} weight={focused ? 'bold' : 'medium'} color={focused ? t.text : t.faint}>{item.label}</Txt>
          </Pressable>
          {i === 1 && <View style={styles.item}>
            <Tactile label="Add something to learn" onPress={() => router.push('/add' as Href)} style={[styles.add, { backgroundColor: t.inverse }]}>
              <Icon name="add" color={t.onInverse} size={28} />
            </Tactile>
          </View>}
        </View>;
      })}
    </View>;
  }}>
    {items.map((item) => <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />)}
  </Tabs>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  add: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 18px -8px ${palette.ink}` },
});
