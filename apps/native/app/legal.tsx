import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleButton, Icon, Reveal, Tactile, Txt } from '@/src/ui/core';
import { Doodle, Surface } from '@/src/ui/kit';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Doc = 'privacy' | 'terms' | 'help';
type Section = {
  heading: string;
  body?: string[];
  bullets?: string[];
  link?: { label: string; url: string };
  action?: { label: string; href: string };
};
type Document = { eyebrow: string; title: string; lead: string; pose: Pose; tone: 'lime' | 'lavender' | 'mint'; sections: Section[] };

const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';

/** Every statement here describes what this build of Goomi actually does. Keep it in step with the code. */
const DOCS: Record<Doc, Document> = {
  privacy: {
    eyebrow: 'PRIVACY',
    title: 'Your learning stays yours.',
    lead: 'Goomi is built to keep what you learn on your phone. Here is exactly what that means.',
    pose: 'read',
    tone: 'lavender',
    sections: [
      {
        heading: 'What stays on this phone',
        body: [
          'Your progress, answers, interests, goals and settings are saved on this device in Goomi’s local storage. Goomi doesn’t send them to a Goomi server, and this version has no sign-in.',
        ],
      },
      {
        heading: 'Your study materials',
        body: [
          'Text you paste and the PDFs, slides and photos you add are processed on your iPhone. Goomi reads them with Apple’s PDFKit and on-device Vision text recognition.',
          'The extracted text and the concepts Goomi finds are saved with the rest of your learning data on this phone.',
        ],
      },
      {
        heading: 'Screen Time',
        body: [
          'When you choose apps, Apple’s picker hands Goomi private tokens instead of app names. Those tokens stay on this phone, shared only between Goomi and its Screen Time extensions.',
          'Goomi can see how many apps, categories and websites you picked, never which ones. It doesn’t read your Screen Time history, and you can turn off its access in iOS Settings at any time.',
        ],
      },
      {
        heading: 'Purchases',
        body: [
          'Subscriptions are processed by Apple. Goomi uses RevenueCat to check whether Goomi Plus is active. RevenueCat receives your purchase information and an anonymous app ID, not your learning data.',
        ],
      },
      {
        heading: 'Anonymous analytics',
        body: [
          'Analytics is off unless you turn it on in Settings. When it’s on, Goomi sends a short, fixed list of product events to PostHog, such as “a challenge was completed” or “the mode changed”.',
        ],
        bullets: [
          'Events never include your answers, notes, document names, goals or anything you type.',
          'No person profile is created, and location lookup from your IP address is turned off.',
          'If this build isn’t configured for analytics, nothing is sent at all.',
        ],
      },
      {
        heading: 'Reminders',
        body: ['The daily reminder is scheduled on this phone as a local notification. No push server is involved.'],
      },
      {
        heading: 'Clearing your data',
        body: [
          'Settings → Reset Goomi on this phone removes everything Goomi saved here. Deleting the app does the same. Your subscription lives with your Apple ID and is managed in the App Store.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'TERMS',
    title: 'The short, honest version.',
    lead: 'How Goomi and Goomi Plus work, without the fine-print maze.',
    pose: 'read',
    tone: 'mint',
    sections: [
      {
        heading: 'Using Goomi',
        body: [
          'Goomi turns the moments before a scroll into short learning moments. App moments rely on Apple’s Screen Time, which you can switch off at any time. They’re a friendly nudge, not a lock that can’t be bypassed.',
        ],
      },
      {
        heading: 'Goomi Plus subscriptions',
        bullets: [
          'Goomi Plus is an auto-renewing subscription. Payment is charged to your Apple ID when you confirm the purchase.',
          'It renews automatically unless you cancel at least 24 hours before the end of the current period. Renewal is charged within the 24 hours before the period ends.',
          'Prices and plan lengths shown in the paywall come from the App Store, in your local currency.',
          'A free trial, when offered, depends on your App Store eligibility. If you subscribe during a trial, the unused part of it ends.',
          'You can manage or cancel your subscription in your App Store account settings.',
        ],
        link: { label: 'Manage subscriptions', url: APPLE_SUBSCRIPTIONS },
      },
      {
        heading: 'Restoring a purchase',
        body: ['Reinstalled Goomi or moved to a new iPhone with the same Apple ID? Use Restore purchases in Settings.'],
        action: { label: 'Open Settings', href: '/settings' },
      },
      {
        heading: 'Apple’s standard terms',
        body: ['Your use of Goomi is also covered by Apple’s standard Licensed Application End User License Agreement.'],
        link: { label: 'Apple’s standard EULA', url: APPLE_EULA },
      },
    ],
  },
  help: {
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
    ],
  },
};

const ORDER: Doc[] = ['help', 'privacy', 'terms'];
const LABELS: Record<Doc, string> = { help: 'Help', privacy: 'Privacy', terms: 'Terms' };

export default function Legal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: string }>();
  const doc: Doc = params.doc === 'privacy' || params.doc === 'terms' ? params.doc : 'help';
  const content = DOCS[doc];
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
            <View accessible accessibilityRole="header"><Txt size={26} weight="bold" color={t.text} style={styles.title}>{content.title}</Txt></View>
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
            {ORDER.filter((item) => item !== doc).map((item) => <Tactile
              key={item}
              label={LABELS[item]}
              onPress={() => router.setParams({ doc: item })}
              style={[styles.morePill, { backgroundColor: t.raised, borderColor: t.line }]}
            >
              <Txt size={13} weight="semibold" color={t.text}>{LABELS[item]}</Txt>
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
    {section.link && <Tactile
      label={section.link.label}
      onPress={() => void Linking.openURL(section.link!.url).catch(() => {})}
      style={[styles.link, { backgroundColor: t.soft }]}
    >
      <Txt size={14} weight="semibold" color={t.text} style={{ flex: 1 }}>{section.link.label}</Txt>
      <Icon name="open-outline" size={17} color={t.muted} />
    </Tactile>}
    {section.action && <Tactile
      label={section.action.label}
      onPress={() => router.navigate(section.action!.href as Href)}
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
