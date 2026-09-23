import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MODE_CONFIG } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { useProgress, useRuntime } from '@/src/state/runtime';
import { Icon, Tactile, Txt } from '@/src/ui/core';
import { Figure, ListGroup, ListRow, Notice, modeMeta, TopScrim } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { plural } from '@/src/ui/copy';
import { fonts, radius } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

const DAY_MS = 86_400_000;

export default function Profile() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useGoomi((state) => state.profile);
  const settings = useGoomi((state) => state.settings);
  const learning = useGoomi((state) => state.learning);
  const devPreview = useGoomi((state) => state.devPreview);
  const updateProfile = useGoomi((state) => state.updateProfile);
  const billing = useRuntime((state) => state.billingStatus);
  const progress = useProgress();
  const [editing, setEditing] = useState(false);
  const firstAnswer = learning.history[0]?.answeredAt;
  const weeks = firstAnswer ? Math.max(1, Math.ceil((Date.now() - firstAnswer) / (7 * DAY_MS))) : 0;
  const materials = learning.materials.filter((material) => material.status === 'ready').length;
  const mode = modeMeta(settings.mode);
  const expiresAt = billing?.expiresAt ? new Date(billing.expiresAt) : null;
  const trialEnding = settings.subscription === 'trial' && expiresAt && expiresAt.getTime() - Date.now() < 3 * DAY_MS;
  const permission = settings.screenTimePermission;
  const subscriptionLabel = devPreview ? 'Dev preview' : settings.subscription === 'trial' ? 'Plus · trial' : settings.subscription === 'active' ? 'Plus' : settings.subscription === 'expired' ? 'Paused' : 'Not active';

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 48, gap: 22 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Tactile label="Settings" onPress={() => router.push('/settings' as Href)} style={[styles.gear, { backgroundColor: t.soft }]}><Icon name="settings-outline" size={20} color={t.text} /></Tactile>
      </View>

      {/* Identity: Goomi sits in its own little stage, tinted by the current mode. */}
      <View style={{ alignItems: 'center', gap: 12, marginTop: -30 }}>
        <View style={[styles.avatar, { backgroundColor: t.scheme === 'dark' ? t.soft : `${mode.tint}66` }]}>
          <View style={[styles.cushion, { backgroundColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)' }]} />
          <Mascot pose={settings.mode === 'sleep' ? 'sleep' : settings.mode === 'study' ? 'read' : 'wave'} size={130} motion="breathe" shadow={false} style={{ marginBottom: -6 }} />
        </View>
        {editing
          ? <TextInput autoFocus defaultValue={profile.name} placeholder="Your name" placeholderTextColor={t.faint} maxLength={40} returnKeyType="done"
              onEndEditing={(event) => { updateProfile({ name: event.nativeEvent.text.trim() }); setEditing(false); }}
              style={[styles.nameInput, { color: t.text, backgroundColor: t.soft }]} accessibilityLabel="Your name" />
          : <Tactile label="Edit your name" onPress={() => setEditing(true)} style={[styles.row, { gap: 6, minHeight: 44 }]}>
              <Txt size={24} weight="bold" color={t.text} style={{ letterSpacing: -0.6 }}>{profile.name.trim() || 'Add your name'}</Txt>
              <Icon name="pencil" size={15} color={t.faint} />
            </Tactile>}
        <View style={[styles.modeTag, { backgroundColor: t.soft }]}>
          <Icon name={mode.icon} size={14} color={t.text} />
          <Txt size={12} weight="semibold" color={t.text}>{MODE_CONFIG[settings.mode].title} mode · {MODE_CONFIG[settings.mode].description.toLowerCase()}</Txt>
        </View>
      </View>

      <View style={[styles.figures, { backgroundColor: t.raised }]}>
        <Figure theme={t} value={String(progress.thingsLearned)} label="things learned" size={24} />
        <View style={[styles.divider, { backgroundColor: t.line }]} />
        <Figure theme={t} value={String(weeks)} label={weeks === 1 ? 'week curious' : 'weeks curious'} size={24} />
        <View style={[styles.divider, { backgroundColor: t.line }]} />
        <Figure theme={t} value={progress.retentionPercent === null ? '—' : `${progress.retentionPercent}%`} label="retention" size={24} />
      </View>

      {trialEnding && <Notice theme={t} tone="warning" icon="time-outline" title={`Your trial ends ${expiresAt!.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`}
        body={billing?.willRenew ? 'Goomi Plus continues automatically after that. You can change this anytime in your App Store settings.' : 'Renewal is off, so Plus pauses after that. Your learning stays saved.'}
        action="Manage subscription" onAction={() => router.push('/settings' as Href)} />}
      {settings.subscription === 'expired' && <Notice theme={t} tone="lavender" icon="moon-outline" title="Your Plus has paused" body="Everything you learned is still here." action="Renew Goomi Plus" onAction={() => router.push({ pathname: '/paywall', params: { source: 'profile' } } as Href)} />}
      {permission === 'revoked' && <Notice theme={t} tone="warning" icon="hourglass-outline" title="Screen Time was turned off" body="Goomi can’t meet you before your apps until it’s reconnected." action="Reconnect" onAction={() => router.push('/screen-time' as Href)} />}

      <ListGroup theme={t} title="YOUR GOOMI">
        <ListRow theme={t} icon={mode.icon} title="Mode" value={MODE_CONFIG[settings.mode].title} onPress={() => router.push('/mode' as Href)} />
        <ListRow theme={t} icon="hourglass-outline" title="Screen Time" value={permission === 'authorized' ? 'Connected' : permission === 'unavailable' ? 'iPhone only' : permission === 'revoked' ? 'Turned off' : 'Not connected'} onPress={() => router.push('/screen-time' as Href)} />
        <ListRow theme={t} icon="pulse-outline" title="Intervention frequency" value={`Every ${settings.unlockMinutes} min`} onPress={() => router.push('/settings' as Href)} last />
      </ListGroup>

      <ListGroup theme={t} title="LEARNING">
        <ListRow theme={t} icon="flag-outline" title="Daily goal & goals" value={`${profile.dailyGoal} a day`} onPress={() => router.push('/goal' as Href)} />
        <ListRow theme={t} icon="heart-outline" title="Interests" value={profile.interests.length ? plural(profile.interests.length, 'topic') : 'None yet'} onPress={() => router.navigate('/(tabs)/explore' as Href)} />
        <ListRow theme={t} icon="chatbubbles-outline" title="Languages" value={profile.learningLanguages.join(', ') || 'None yet'} onPress={() => router.push('/languages' as Href)} />
        <ListRow theme={t} icon="book-outline" title="Study materials" value={materials ? plural(materials, 'set') : 'Add notes'} onPress={() => router.push('/library' as Href)} last />
      </ListGroup>

      <ListGroup theme={t} title="APP">
        <ListRow theme={t} icon="sparkles" title="Goomi Plus" value={subscriptionLabel} tone="accent" onPress={() => router.push('/settings' as Href)} />
        <ListRow theme={t} icon="notifications-outline" title="Reminders" value={settings.reminders ? 'On' : 'Off'} onPress={() => router.push('/settings' as Href)} />
        <ListRow theme={t} icon="contrast-outline" title="Appearance" value={settings.appearance === 'system' ? 'System' : settings.appearance === 'dark' ? 'Dark' : 'Light'} onPress={() => router.push('/settings' as Href)} />
        <ListRow theme={t} icon="help-buoy-outline" title="Help & support" onPress={() => router.push('/legal?doc=help' as Href)} />
        <ListRow theme={t} icon="shield-checkmark-outline" title="Privacy" onPress={() => router.push('/legal?doc=privacy' as Href)} last />
      </ListGroup>

      <Txt weight="display" size={15} color={t.faint} style={{ textAlign: 'center' }}>Small moments. A sharper you.</Txt>
    </ScrollView>
    <TopScrim theme={t} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  cushion: { position: 'absolute', bottom: -30, width: 170, height: 70, borderRadius: 60 },
  nameInput: { minWidth: 220, minHeight: 48, borderRadius: radius.row, paddingHorizontal: 16, textAlign: 'center', fontFamily: fonts.bold, fontSize: 20 },
  modeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 30, borderRadius: radius.pill },
  figures: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 18, borderRadius: radius.card, borderCurve: 'continuous', boxShadow: '0 10px 30px -18px rgba(38,44,20,0.18)' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
