import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openLegal, SUPPORT_EMAIL, type LegalPage } from '@/src/services/legal';
import { CircleButton, Icon, Reveal, Tactile, Txt, Title } from '@/src/ui/core';
import { Doodle, Surface } from '@/src/ui/kit';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Section = {
  heading: string;
  body?: string[];
  bullets?: string[];
  action?: { label: string; href: string };
};
type Document = { eyebrow: string; title: string; lead: string; pose: Pose; tone: 'lime' | 'lavender' | 'mint'; sections: Section[] };

/**
 * Help, bundled so it works offline. Every statement here describes what this build of Goomi actually
 * does; keep it in step with the code. The privacy policy and terms live on goomi.app (see
 * src/services/legal.ts), the same pages the stores link to.
 */
const HELP: Document = {
  eyebrow: 'HELP',
  title: 'Little answers to good questions.',
  lead: 'How Goomi moments, unlocks and purchases actually work.',
  pose: 'think',
  tone: 'lime',
  sections: [
    {
      heading: 'How Goomi moments work',
      body: [
        'You pick apps with Apple’s picker and turn on Goomi moments. When you open one of those apps, iOS shows Goomi’s shield. Answer a short challenge in Goomi, then head back to your app.',
        'On iOS 26.5 and later, the button on the shield opens Goomi for you. On earlier versions, open Goomi yourself and your challenge will be waiting.',
      ],
    },
    {
      heading: 'What “minutes between moments” means',
      body: [
        'After a challenge, your selected apps open for a usage budget, say 5 minutes. That’s 5 minutes of actual use, added up across all your selected apps, not 5 minutes on the clock. When it’s used up, the shield comes back.',
        'There’s also a safety window. If you stop using those apps, they re-lock when the window ends anyway: three times your budget, never shorter than 15 minutes and never longer than 90. iOS decides the exact timing, so it can drift a little.',
      ],
    },
    {
      heading: 'If Screen Time was turned off',
      body: [
        'If Screen Time access for Goomi is switched off, moments pause. Open Screen Time in Goomi and tap Reconnect. If iOS doesn’t ask again, allow access for Goomi in iOS Settings, then come back.',
      ],
      action: { label: 'Open Screen Time', href: '/screen-time' },
    },
    {
      heading: 'Screen Time on other devices',
      body: [
        'App moments need a physical iPhone on iOS 17.4 or later. On Simulator, Android and the web, Goomi can’t connect to Screen Time, but challenges, study and progress all still work.',
      ],
    },
    {
      heading: 'Restoring purchases',
      body: [
        'Subscribed before? In Settings, under Subscription, tap Restore purchases. Goomi asks the App Store for an active Goomi Plus on your Apple ID and tells you what it found.',
      ],
      action: { label: 'Open Settings', href: '/settings' },
    },
    {
      heading: 'Reminders not showing up?',
      body: ['The daily reminder needs notifications allowed for Goomi in iOS Settings. Turn the reminder off and on again in Goomi’s Settings to reschedule it.'],
    },
    {
      heading: 'Still stuck?',
      body: [`Write to ${SUPPORT_EMAIL} and we’ll get back to you. For account or purchase questions, send it from the email you use in Goomi.`],
      action: { label: 'Email support', href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Goomi help')}` },
    },
  ],
};

const MORE: { page: LegalPage; label: string }[] = [
  { page: 'privacy', label: 'Privacy Policy' },
  { page: 'terms', label: 'Terms of Use' },
];

export default function Legal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const content = HELP;
  const dark = t.scheme === 'dark';

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48, paddingHorizontal: 20 }}
    >
      <View style={styles.column}>
        <CircleButton icon="arrow-back" label="Back" dark={dark} onPress={() => router.back()} />

        <Surface theme={t} tone={content.tone} style={styles.hero}>
          <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
            <Txt size={11} weight="bold" color={t.muted} style={{ letterSpacing: 1.6 }}>{content.eyebrow}</Txt>
            <View accessible accessibilityRole="header"><Title color={t.text}>{content.title}</Title></View>
            <Txt size={14} color={t.muted} style={{ lineHeight: 21 }}>{content.lead}</Txt>
          </View>
          <View style={styles.heroArt}>
            <Mascot pose={content.pose} size={104} motion="still" />
            <Doodle kind="spark" size={24} color={t.text} style={{ position: 'absolute', left: -6, top: 0, transform: [{ rotate: '-20deg' }] }} />
          </View>
        </Surface>

        <View style={{ gap: 30, marginTop: 30 }}>
          {content.sections.map((section, index) => <Reveal key={section.heading} delay={Math.min(index, 4) * 40}>
            <SectionBlock section={section} theme={t} />
          </Reveal>)}
        </View>

        <View style={[styles.more, { borderTopColor: t.line }]}>
          <Txt size={12} weight="bold" color={t.muted} style={{ letterSpacing: 0.4 }}>Also here</Txt>
          <View style={styles.moreRow}>
            {MORE.map((item) => <Tactile
              key={item.page}
              label={item.label}
              onPress={() => void openLegal(item.page)}
              style={[styles.morePill, { backgroundColor: t.raised, borderColor: t.line }]}
            >
              <Txt size={13} weight="semibold" color={t.text}>{item.label}</Txt>
            </Tactile>)}
          </View>
        </View>
      </View>
    </ScrollView>
  </View>;
}

function SectionBlock({ section, theme: t }: { section: Section; theme: Theme }) {
  return <View style={{ gap: 10 }}>
    <View accessible accessibilityRole="header"><Txt size={18} weight="bold" color={t.text} style={{ letterSpacing: -0.3 }}>{section.heading}</Txt></View>
    {section.body?.map((paragraph) => <Txt key={paragraph} size={15} color={t.text} style={styles.paragraph} selectable>{paragraph}</Txt>)}
    {section.bullets && <View style={{ gap: 10, marginTop: 2 }}>
      {section.bullets.map((bullet) => <View key={bullet} style={styles.bullet}>
        <View style={[styles.bulletDot, { backgroundColor: palette.lime, borderColor: t.scheme === 'dark' ? 'transparent' : 'rgba(15,15,16,0.14)' }]} />
        <Txt size={15} color={t.text} style={[styles.paragraph, { flex: 1 }]} selectable>{bullet}</Txt>
      </View>)}
    </View>}
    {section.action && <Tactile
      label={section.action.label}
      onPress={() => {
        const { href } = section.action!;
        // mailto: opens Mail; the address is in the body, selectable, in case no mail app is set up.
        if (href.startsWith('mailto:')) void Linking.openURL(href).catch(() => {});
        else router.navigate(href as Href);
      }}
      style={[styles.link, { backgroundColor: t.soft }]}
    >
      <Txt size={14} weight="semibold" color={t.text} style={{ flex: 1 }}>{section.action.label}</Txt>
      <Icon name="chevron-forward" size={17} color={t.muted} />
    </Tactile>}
  </View>;
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  hero: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', padding: 20, paddingRight: 12, gap: 8, borderRadius: radius.object, overflow: 'visible' },
  heroArt: { width: 104, alignItems: 'center', justifyContent: 'flex-end', marginBottom: -4 },
  title: { letterSpacing: -0.8, lineHeight: 31 },
  paragraph: { lineHeight: 24, maxWidth: 560 },
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bulletDot: { width: 9, height: 9, borderRadius: 5, marginTop: 8, borderWidth: StyleSheet.hairlineWidth },
  link: { marginTop: 4, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: radius.row, borderCurve: 'continuous' },
  more: { marginTop: 40, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  moreRow: { flexDirection: 'row', gap: 10 },
  morePill: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
});
