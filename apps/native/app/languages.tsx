import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoomi } from '@/src/state/store';
import { Icon, Tactile, Txt, type IconName, Title } from '@/src/ui/core';
import { Doodle, Notice } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { PillButton } from '@/src/ui/study-kit';
import { plural } from '@/src/ui/copy';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'French', 'Italian', 'German', 'Japanese'];
/** Languages with curated practice today. Everything else is a saved preference. */
const CURATED = new Set(['Spanish']);

/** "Create language pack": choose what to practice. Honest about what's ready now. */
export default function Languages() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const selected = useGoomi((state) => state.profile.learningLanguages);
  const nativeLanguage = useGoomi((state) => state.profile.nativeLanguage);
  const updateProfile = useGoomi((state) => state.updateProfile);

  function toggle(language: string) {
    // Keep any value this list doesn't know about (e.g. from onboarding), only flip this one.
    updateProfile({ learningLanguages: selected.includes(language) ? selected.filter((item) => item !== language) : [...selected, language] });
  }

  const curatedPicked = selected.some((language) => CURATED.has(language));
  const waiting = selected.filter((language) => !CURATED.has(language));

  // Form sheets size their content; a flex root collapses to zero height, so the ScrollView is the root.
  return <ScrollView
      style={{ backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 28, paddingHorizontal: 22, paddingBottom: insets.bottom + 24, gap: 22 }}
    >
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Title color={t.text} style={{ transform: [{ rotate: '-1.5deg' }] }}>
            Which languages are calling you?
          </Title>
          <Txt size={13} color={t.muted} style={{ marginTop: 8 }}>
            Pick any. Goomi mixes them into your moments.
          </Txt>
        </View>
        <View>
          <Mascot pose="globe" size={104} motion="peek" shadow={false} />
          <Doodle kind="loop" size={28} color={t.text} style={{ position: 'absolute', left: -14, top: 0 }} />
        </View>
      </View>

      <View style={styles.chips} accessibilityRole="list">
        {LANGUAGES.map((language) => <LanguageChip
          key={language} theme={t} label={language}
          selected={selected.includes(language)}
          icon={selected.includes(language) ? 'checkmark' : CURATED.has(language) ? 'sparkles-outline' : undefined}
          onPress={() => toggle(language)}
        />)}
      </View>

      {nativeLanguage && LANGUAGES.includes(nativeLanguage) && <Txt size={12} color={t.faint} style={{ marginTop: -8 }}>
        You told Goomi you speak {nativeLanguage}. Pick it too if you’d like to brush up.
      </Txt>}

      <Notice
        theme={t} tone={curatedPicked ? 'lime' : 'soft'} icon="sparkles-outline"
        title={curatedPicked ? 'Spanish practice is ready now' : 'Spanish has practice ready today'}
        body={waiting.length
          ? `${waiting.join(', ')} ${waiting.length === 1 ? 'is' : 'are'} saved as ${waiting.length === 1 ? 'a preference' : 'preferences'} and will shape the packs Goomi builds next.`
          : 'Other languages are saved as preferences and shape the packs Goomi builds next.'}
        action={curatedPicked ? undefined : 'Add Spanish'}
        onAction={curatedPicked ? undefined : () => toggle('Spanish')}
      />

      <View style={{ gap: 8 }}>
        <PillButton theme={t} title="Done" onPress={() => router.back()} />
        <Txt size={12} color={t.muted} style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {selected.length ? `${plural(selected.length, 'language')} picked · change anytime` : 'Nothing picked. Curiosity-only is fine too.'}
        </Txt>
      </View>
    </ScrollView>;
}

/** Kit chip, sized to a 44pt tap target and exposing its selected state. */
function LanguageChip({ theme: t, label, selected, icon, onPress }: { theme: Theme; label: string; selected: boolean; icon?: IconName; onPress: () => void }) {
  return <Tactile
    label={`${label}${selected ? ', selected' : ''}`} onPress={onPress}
    style={[styles.chip, { backgroundColor: selected ? palette.lime : t.raised, borderColor: selected ? palette.lime : t.line }]}
  >
    {icon && <Icon name={icon} size={15} color={selected ? palette.ink : t.muted} />}
    <Txt size={14} weight={selected ? 'bold' : 'semibold'} color={selected ? palette.ink : t.text}>{label}</Txt>
  </Tactile>;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
