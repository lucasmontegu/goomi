import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Tactile, Txt, type IconName } from '@/src/ui/core';
import { usePalette } from '@/src/ui/theme';
import { useGoomi } from '@/src/state/store';
const items: { name: string; label: string; icon: IconName; active: IconName }[] = [{ name: 'index', label: 'Home', icon: 'home-outline', active: 'home' }, { name: 'explore', label: 'Explore', icon: 'search-outline', active: 'search' }, { name: 'stats', label: 'Stats', icon: 'stats-chart-outline', active: 'stats-chart' }, { name: 'profile', label: 'You', icon: 'person-outline', active: 'person' }];
export default function TabLayout() {
  const c = usePalette(useGoomi((s) => s.settings.appearance)); const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background } }} tabBar={({ state, navigation }) => <View style={{ backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 14), paddingTop: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', alignItems: 'center' }}>{items.map((item, i) => {
    const route = state.routes.find((r) => r.name === item.name)!; const selected = state.routes[state.index]?.name === item.name;
    return <View key={item.name} style={{ flexDirection: 'row', flex: i === 1 ? 2 : 1, alignItems: 'center' }}><Tactile label={item.label} onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigation.navigate(item.name); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name={selected ? item.active : item.icon} size={22} color={selected ? c.text : c.muted} /><Txt size={9} weight={selected ? 'bold' : 'medium'} color={selected ? c.text : c.muted}>{item.label}</Txt></Tactile>{i === 1 && <View style={{ flex: 1, alignItems: 'center' }}><Tactile label="Add something to learn" onPress={() => router.push('/add')} style={{ width: 49, height: 49, borderRadius: 25, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}><Icon name="add" color={c.background} size={26} /></Tactile></View>}</View>;
  })}</View>}>{items.map((item) => <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />)}</Tabs>;
}
