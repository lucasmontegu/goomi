import { ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studyExtraction } from '@/modules/goomi-study';
import { Tactile, Txt } from '@/src/ui/core';
import { Doodle, ListGroup, ListRow, Notice } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop, type PropName } from '@/src/ui/props';
import { radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Source = 'pdf' | 'camera' | 'image' | 'text';

/** The center "+" action. Study sources lead; shaping actions sit quietly underneath. */
export default function Add() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const open = (source: Source) => router.replace({ pathname: '/compose', params: { source } } as unknown as Href);

  // Form sheets size their content; a flex root collapses to zero height, so the ScrollView is the root.
  return <ScrollView
      style={{ backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
    >
      {/* Headline on the left, Goomi peeking over the tiles on the right. */}
      <View style={styles.hero}>
        <View style={{ flex: 1, paddingBottom: 18 }}>
          <Txt weight="displayBold" size={27} color={t.text} style={styles.headline}>{'What should we\nlearn from?'}</Txt>
          <Txt size={13} color={t.muted} style={{ marginTop: 8, maxWidth: 230 }}>
            Goomi finds the definitions inside and turns them into quick recall moments.
          </Txt>
        </View>
        <View style={styles.peek}>
          <Mascot pose="read" size={104} motion="peek" shadow={false} />
          <Doodle kind="spark" size={24} color={t.text} style={{ position: 'absolute', left: -10, top: 6, transform: [{ rotate: '-20deg' }] }} />
        </View>
      </View>

      {/* Asymmetric two-column: one tall hero tile, two stacked, one wide. */}
      <View style={styles.grid}>
        <SourceTile
          theme={t} tall prop="doc" background={t.raised} raised
          title="Upload a PDF" caption="Lecture notes, handouts, readings"
          onPress={() => open('pdf')}
        />
        <View style={styles.stack}>
          <SourceTile theme={t} prop="camera" background={t.lavenderSoft} title="Snap a page" caption="Notebook or whiteboard" onPress={() => open('camera')} />
          <SourceTile theme={t} prop="photo" background={t.mintSoft} title="Screenshots" caption="Or slides, up to 10" onPress={() => open('image')} />
        </View>
      </View>
      <Tactile label="Paste text or notes" onPress={() => open('text')} style={[styles.wide, { backgroundColor: t.soft }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={16} weight="bold" color={t.text}>Paste text</Txt>
          <Txt size={12} color={t.muted}>Notes, a chapter, a list of definitions</Txt>
        </View>
        <View style={{ transform: [{ rotate: '-8deg' }] }}><Prop name="pencil" size={52} /></View>
      </Tactile>

      {!studyExtraction.isAvailable && <View style={{ marginTop: 12 }}>
        <Notice
          theme={t} icon="phone-portrait-outline"
          title="Files and photos need the iPhone app"
          body="Goomi reads PDFs and pictures on-device in the Goomi iPhone build. Pasting text works everywhere."
        />
      </View>}

      <ListGroup theme={t} title="Or shape what Goomi brings you" style={{ marginTop: 28 }}>
        <ListRow theme={t} icon="compass-outline" title="Add a topic" detail="Something you’re curious about" onPress={() => router.dismissTo('/(tabs)/explore' as Href)} />
        <ListRow theme={t} icon="flag-outline" title="Add a learning goal" detail="How many discoveries a day feels right" onPress={() => router.replace('/goal' as Href)} />
        <ListRow theme={t} icon="chatbubbles-outline" title="Create a language pack" detail="Pick the languages you want to practice" onPress={() => router.replace('/languages' as Href)} last />
      </ListGroup>
    </ScrollView>;
}

function SourceTile({ theme, prop, title, caption, background, onPress, tall, raised }: {
  theme: Theme; prop: PropName; title: string; caption: string; background: string; onPress: () => void; tall?: boolean; raised?: boolean;
}) {
  return <Tactile
    label={title}
    onPress={onPress}
    style={[
      tall ? styles.tall : styles.tile,
      { backgroundColor: background },
      raised && { boxShadow: `0 12px 30px -18px ${theme.shadow}` },
    ]}
  >
    <View style={tall ? { transform: [{ rotate: '-6deg' }], marginLeft: -4 } : styles.tileArt}>
      <Prop name={prop} size={tall ? 84 : 46} />
    </View>
    <View style={{ gap: 2 }}>
      <Txt size={tall ? 18 : 15} weight="bold" color={theme.text} style={{ letterSpacing: tall ? -0.3 : 0 }}>{title}</Txt>
      <Txt size={12} color={theme.muted} lines={2}>{caption}</Txt>
    </View>
  </Tactile>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end' },
  headline: { lineHeight: 32, transform: [{ rotate: '-1.5deg' }] },
  peek: { width: 104, marginBottom: -14, marginRight: 4 },
  grid: { flexDirection: 'row', gap: 12, zIndex: 2 },
  stack: { flex: 1, gap: 12 },
  tall: { flex: 1.08, minHeight: 232, borderRadius: radius.object, borderCurve: 'continuous', padding: 18, justifyContent: 'space-between' },
  tile: { flex: 1, minHeight: 110, borderRadius: radius.card, borderCurve: 'continuous', padding: 14, justifyContent: 'flex-end' },
  tileArt: { position: 'absolute', right: 10, top: 8 },
  wide: { marginTop: 12, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 14, borderRadius: radius.card, borderCurve: 'continuous' },
});
