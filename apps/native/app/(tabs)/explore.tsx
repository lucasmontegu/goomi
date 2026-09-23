import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STARTER_CHALLENGES, TOPICS, topicPath, type TopicId } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { Icon, ProgressLine, Tactile, Txt } from '@/src/ui/core';
import { Chip, Doodle, Surface, TopScrim } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP } from '@/src/ui/props';
import { plural } from '@/src/ui/copy';
import { fonts, palette, radius } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Filter = 'all' | 'yours' | 'languages' | 'local';
const EXPLORABLE = TOPICS.filter((topic) => topic.id !== 'focus' && topic.id !== 'study');

export default function Explore() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useGoomi((state) => state.profile);
  const learning = useGoomi((state) => state.learning);
  const updateProfile = useGoomi((state) => state.updateProfile);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const paths = useMemo(() => Object.fromEntries(EXPLORABLE.map((topic) => [topic.id, topicPath(learning, topic.id)])), [learning]);
  const local = STARTER_CHALLENGES.filter((challenge) => challenge.country === profile.country);
  const featured = EXPLORABLE.filter((topic) => profile.interests.includes(topic.id))
    .sort((a, b) => (paths[a.id]!.learned / paths[a.id]!.total) - (paths[b.id]!.learned / paths[b.id]!.total))[0] ?? EXPLORABLE[0]!;
  const needle = query.trim().toLocaleLowerCase();
  const visible = EXPLORABLE.filter((topic) => {
    if (needle && !`${topic.name} ${topic.subtitle} ${topic.id}`.toLocaleLowerCase().includes(needle)) return false;
    if (filter === 'yours') return profile.interests.includes(topic.id);
    if (filter === 'languages') return topic.id === 'languages';
    if (filter === 'local') return local.some((challenge) => challenge.topicId === topic.id);
    return true;
  });
  const toggleInterest = (id: TopicId) => updateProfile({ interests: profile.interests.includes(id) ? profile.interests.filter((item) => item !== id) : [...profile.interests, id] });
  const featuredPath = paths[featured.id]!;

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 48, gap: 22 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt size={34} weight="bold" color={t.text} style={{ letterSpacing: -0.7, lineHeight: 38 }}>Explore</Txt>
          <View style={{ alignSelf: 'flex-start' }}>
            <Txt weight="display" size={26} color={t.text} style={{ lineHeight: 32 }}>a bigger you</Txt>
            <Doodle kind="underline" size={22} width={150} color={palette.lime} style={{ position: 'absolute', bottom: -8, left: -6, zIndex: -1 }} />
          </View>
        </View>
        <Mascot pose="globe" size={112} motion="breathe" />
      </View>

      <View style={[styles.search, { backgroundColor: t.soft }]}>
        <Icon name="search" size={18} color={t.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search topics" placeholderTextColor={t.faint} returnKeyType="search" clearButtonMode="while-editing"
          accessibilityLabel="Search topics" style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: t.text, minHeight: 46 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {([['all', 'All'], ['yours', 'Your interests'], ['languages', 'Languages'], ['local', 'Close to home']] as const).map(([id, label]) =>
          <Chip key={id} label={label} selected={filter === id} onPress={() => setFilter(id)} theme={t} />)}
      </ScrollView>

      {!needle && filter === 'all' && <Tactile label={`Continue ${featured.name}`} onPress={() => router.push(`/topic/${featured.id}` as Href)} style={[styles.feature, { backgroundColor: t.scheme === 'dark' ? t.lavenderSoft : '#EEE8FF' }]}>
        <View style={{ flex: 1, gap: 6, zIndex: 1 }}>
          <Txt size={11} weight="bold" color={t.muted} style={{ letterSpacing: 1.2 }}>PICKED FOR YOU</Txt>
          <Txt size={24} weight="bold" color={t.text} style={{ letterSpacing: -0.6, lineHeight: 29 }}>{featured.name}</Txt>
          <Txt size={13} color={t.muted}>{featured.subtitle}</Txt>
          <View style={[styles.startPill, { backgroundColor: t.inverse }]}>
            <Txt size={13} weight="bold" color={t.onInverse}>{featuredPath.learned ? 'Continue' : 'Start'} · {plural(featuredPath.total - featuredPath.learned || featuredPath.total, 'discovery', 'discoveries')}</Txt>
          </View>
        </View>
        <View style={styles.featureArt}>
          <Prop name={TOPIC_PROP[featured.id]} size={132} />
        </View>
      </Tactile>}

      <View style={{ gap: 4 }}>
        <Txt size={19} weight="bold" color={t.text}>{filter === 'yours' ? 'Your interests' : filter === 'languages' ? 'Language packs' : filter === 'local' ? `Close to home · ${profile.country}` : 'All subjects'}</Txt>
        <Txt size={12} color={t.muted}>{visible.length ? `${plural(visible.length, 'path')} · each one has a clear finish line` : 'Nothing matches that yet.'}</Txt>
      </View>

      <View style={{ gap: 10 }}>
        {visible.map((topic) => {
          const path = paths[topic.id]!;
          const saved = profile.interests.includes(topic.id);
          const done = path.learned === path.total;
          return <Tactile key={topic.id} label={`${topic.name}. ${path.learned} of ${path.total} learned`} onPress={() => router.push(`/topic/${topic.id}` as Href)} style={[styles.topic, { backgroundColor: t.raised }]}>
            <View style={[styles.topicArt, { backgroundColor: t.scheme === 'dark' ? t.soft : `${topic.color}55` }]}><Prop name={TOPIC_PROP[topic.id]} size={50} /></View>
            <View style={{ flex: 1, gap: 6 }}>
              <View>
                <Txt size={15} weight="bold" color={t.text}>{topic.name}</Txt>
                <Txt size={12} color={t.muted} lines={1}>{topic.subtitle}</Txt>
              </View>
              <View style={[styles.row, { gap: 8 }]}>
                <View style={{ flex: 1 }}><ProgressLine value={path.learned / path.total} track={t.soft} height={5} /></View>
                <Txt size={11} weight="semibold" color={done ? t.accentText : t.muted} style={{ fontVariant: ['tabular-nums'] }}>{done ? 'Complete' : `${path.learned}/${path.total}`}</Txt>
              </View>
            </View>
            <Tactile label={saved ? `Remove ${topic.name} from your interests` : `Add ${topic.name} to your interests`} onPress={() => toggleInterest(topic.id)} style={[styles.save, { backgroundColor: saved ? palette.lime : t.soft }]}>
              <Icon name={saved ? 'heart' : 'heart-outline'} size={17} color={saved ? palette.ink : t.muted} />
            </Tactile>
          </Tactile>;
        })}
      </View>

      {filter !== 'local' && !needle && local.length > 0 && <Surface theme={t} tone="mint" style={styles.local}>
        <Prop name="globe" size={64} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={11} weight="bold" color={t.muted} style={{ letterSpacing: 1.2 }}>CLOSE TO HOME</Txt>
          <Txt size={16} weight="bold" color={t.text}>{profile.country}, a little closer</Txt>
          <Txt size={12} color={t.muted}>{plural(local.length, 'discovery', 'discoveries')} shaped by where you’re from.</Txt>
        </View>
        <Tactile label="Show local topics" onPress={() => setFilter('local')} style={[styles.round, { backgroundColor: t.inverse }]}><Icon name="arrow-forward" size={18} color={t.onInverse} /></Tactile>
      </Surface>}

      {!needle && (filter === 'all' || filter === 'languages') && <Surface theme={t} style={{ padding: 16, gap: 12 }}>
        <View style={styles.row}>
          <Prop name="chat" size={48} />
          <View style={{ flex: 1 }}>
            <Txt size={16} weight="bold" color={t.text}>Your language packs</Txt>
            <Txt size={12} color={t.muted}>{profile.learningLanguages.length ? 'Short words and phrases, woven into your moments.' : 'Pick a language and Goomi will weave it in.'}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {profile.learningLanguages.map((language) => <Chip key={language} label={language} selected theme={t} />)}
          <Chip label={profile.learningLanguages.length ? 'Edit' : 'Choose languages'} icon="add" onPress={() => router.push('/languages' as Href)} theme={t} />
        </View>
      </Surface>}

      <View style={styles.end}>
        <Mascot pose="read" size={96} motion="breathe" />
        <Txt weight="display" size={17} color={t.text} style={{ textAlign: 'center' }}>That’s everything for now.</Txt>
        <Txt size={12} color={t.muted} style={{ textAlign: 'center', maxWidth: 260 }}>No endless scroll here. Pick one path and let it stick.</Txt>
      </View>
    </ScrollView>
    <TopScrim theme={t} />
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: radius.row, borderCurve: 'continuous' },
  feature: { flexDirection: 'row', minHeight: 190, borderRadius: radius.object, borderCurve: 'continuous', padding: 20, overflow: 'hidden' },
  featureArt: { position: 'absolute', right: -10, bottom: -6, transform: [{ rotate: '-8deg' }] },
  startPill: { alignSelf: 'flex-start', marginTop: 10, minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, paddingRight: 12, borderRadius: radius.card, borderCurve: 'continuous', boxShadow: '0 8px 24px -18px rgba(38,44,20,0.35)' },
  topicArt: { width: 72, height: 72, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  save: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  local: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  end: { alignItems: 'center', gap: 6, paddingTop: 12 },
});
