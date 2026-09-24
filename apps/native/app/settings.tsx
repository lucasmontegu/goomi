import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import screenTime from '@/modules/goomi-screen-time';
import { MODE_CONFIG } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { useRuntime } from '@/src/state/runtime';
import { analyticsConfigured, setAnalyticsConsent as applyAnalyticsConsent, trackEvent } from '@/src/services/analytics';
import { billingAvailability, getBillingStatus, restoreBillingPurchases, type BillingStatus } from '@/src/services/billing';
import { deleteAccount, signOut } from '@/src/services/auth';
import { CircleButton, Txt, Title } from '@/src/ui/core';
import { Beads, ListGroup, ListRow, Notice, modeMeta } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { plural } from '@/src/ui/copy';
import { FREQUENCIES, GroupBlock, Segmented, Toggle, frequencyFor } from '@/src/ui/settings-controls';
import { useTheme } from '@/src/ui/use-theme';

const REMINDER_ID = 'goomi-daily-challenge';
const REMINDER_HOUR = 18;
const REMINDER_MINUTE = 30;
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

type ReminderIssue = { kind: 'denied' | 'failed'; message: string } | null;
type RestoreResult = { tone: 'lime' | 'soft' | 'warning'; title: string; body: string } | null;

function reminderTimeLabel() {
  return new Date(2000, 0, 1, REMINDER_HOUR, REMINDER_MINUTE).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function scheduleDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: 'A quick challenge?', body: '5 minutes. A smarter you.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REMINDER_HOUR, minute: REMINDER_MINUTE },
  });
}
async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}
function notificationsAllowed(status: Notifications.NotificationPermissionsStatus) {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export default function Settings() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (section === 'privacy' || section === 'terms') {
    return <Redirect href={`/legal?doc=${section}` as Href} />;
  }
  return <SettingsScreen />;
}

function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useGoomi((state) => state.settings);
  const profile = useGoomi((state) => state.profile);
  const analyticsConsent = useGoomi((state) => state.analyticsConsent);
  const updateSettings = useGoomi((state) => state.updateSettings);
  const setAnalyticsConsent = useGoomi((state) => state.setAnalyticsConsent);
  const reset = useGoomi((state) => state.reset);
  const shield = useRuntime((state) => state.screenTime);
  const billingState = useRuntime((state) => state.billing);

  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderIssue, setReminderIssue] = useState<ReminderIssue>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult>(null);
  const [resetting, setResetting] = useState(false);
  const account = useGoomi((state) => state.account);
  const [accountBusy, setAccountBusy] = useState<'sign-out' | 'delete' | null>(null);
  const [accountResult, setAccountResult] = useState<(NonNullable<RestoreResult> & { manage?: boolean }) | null>(null);

  const availability = billingAvailability();
  const frequency = frequencyFor(settings.unlockMinutes, settings.intensity);
  const dark = t.scheme === 'dark';

  // Reconcile reminders and subscription details every time Settings comes into view.
  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      if (useGoomi.getState().settings.reminders) {
        try {
          const permission = await Notifications.getPermissionsAsync();
          if (!alive) return;
          if (!notificationsAllowed(permission)) {
            setReminderIssue({ kind: 'denied', message: 'Notifications are off for Goomi, so the daily reminder can’t appear.' });
          } else {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            if (!scheduled.some((request) => request.identifier === REMINDER_ID)) await scheduleDailyReminder();
            if (alive) setReminderIssue(null);
          }
        } catch { /* Surfaced when the user changes the switch. */ }
      }
      if (billingAvailability().available) {
        const result = await getBillingStatus();
        if (alive && result.ok) setBilling(result.value);
      }
    })();
    return () => { alive = false; };
  }, []));

  function setFrequency(minutes: number) {
    const next = FREQUENCIES.find((item) => item.minutes === minutes)!;
    updateSettings({ intensity: next.intensity, unlockMinutes: next.minutes });
  }

  async function setReminders(on: boolean) {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderIssue(null);
    try {
      if (!on) {
        await cancelDailyReminder();
        updateSettings({ reminders: false });
        return;
      }
      let permission = await Notifications.getPermissionsAsync();
      if (!notificationsAllowed(permission) && permission.canAskAgain) {
        permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
      }
      if (!notificationsAllowed(permission)) {
        updateSettings({ reminders: false });
        setReminderIssue({ kind: 'denied', message: 'Goomi isn’t allowed to send notifications. Turn them on in Settings, then try again.' });
        return;
      }
      await scheduleDailyReminder();
      updateSettings({ reminders: true });
    } catch (error) {
      updateSettings({ reminders: false });
      setReminderIssue({ kind: 'failed', message: errorMessage(error, 'The reminder couldn’t be scheduled. Please try again.') });
    } finally {
      setReminderBusy(false);
    }
  }

  function setAnalytics(value: boolean) {
    setAnalyticsConsent(value);
    void applyAnalyticsConsent(value);
  }

  async function openManageSubscription() {
    const url = billing?.managementURL ?? APPLE_SUBSCRIPTIONS_URL;
    try {
      await Linking.openURL(url);
    } catch {
      setRestoreResult({ tone: 'warning', title: 'Couldn’t open subscriptions', body: 'Open the App Store, tap your profile picture, then Subscriptions.' });
    }
  }

  async function restore() {
    if (restoring) return;
    setRestoring(true);
    setRestoreResult(null);
    const result = await restoreBillingPurchases();
    setRestoring(false);
    if (!result.ok) {
      setRestoreResult({ tone: 'warning', title: 'Restore didn’t finish', body: result.error.message });
      return;
    }
    setBilling(result.value);
    trackEvent('purchases_restored', { active: result.value.hasPlus });
    if (result.value.hasPlus) {
      updateSettings({ subscription: result.value.isTrial ? 'trial' : 'active' });
      setRestoreResult({ tone: 'lime', title: 'Goomi Plus is back', body: 'Your subscription was restored on this phone.' });
    } else {
      const current = useGoomi.getState().settings.subscription;
      if (current !== 'not-configured') updateSettings({ subscription: 'expired' });
      setRestoreResult({ tone: 'soft', title: 'Nothing to restore', body: 'There’s no active Goomi Plus subscription on this Apple ID.' });
    }
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign out of Goomi?',
      'Your progress stays on this phone. To use Goomi Plus here again, sign back in or restore purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void performSignOut() },
      ],
    );
  }

  async function performSignOut() {
    setAccountBusy('sign-out');
    setAccountResult(null);
    await signOut();
    setAccountBusy(null);
    setAccountResult({ tone: 'soft', title: 'Signed out', body: 'Your Goomi stays on this phone. Sign in anytime to save it again.' });
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your Goomi account?',
      'This permanently deletes your account and unlinks your Goomi Plus subscription from it. Your progress on this phone stays.\n\nDeleting your account doesn’t cancel an App Store subscription. To stop being charged, cancel it in your App Store subscriptions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'App Store subscriptions', onPress: () => void openManageSubscription() },
        { text: 'Delete account', style: 'destructive', onPress: () => void performDeleteAccount() },
      ],
    );
  }

  async function performDeleteAccount() {
    setAccountBusy('delete');
    setAccountResult(null);
    const result = await deleteAccount();
    setAccountBusy(null);
    if (result.ok) {
      setAccountResult({ tone: 'soft', title: 'Your account was deleted', body: 'If you subscribed to Goomi Plus, cancel it in your App Store subscriptions to stop renewals.', manage: true });
    } else if (!result.error.cancelled) {
      setAccountResult({ tone: 'warning', title: 'Account not deleted', body: result.error.message });
    }
  }

  function confirmReset() {
    Alert.alert(
      'Reset Goomi on this phone?',
      'This clears your progress, study notes and settings here, and turns off Goomi’s app moments. Your subscription isn’t affected. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => void performReset() },
      ],
    );
  }

  async function performReset() {
    setResetting(true);
    if (shield?.enabled) await screenTime.disable().catch(() => {});
    await cancelDailyReminder().catch(() => {});
    await applyAnalyticsConsent(false).catch(() => {});
    reset();
    router.replace('/onboarding');
  }

  const screenTimeValue = settings.screenTimePermission === 'unavailable' ? 'iPhone only'
    : settings.screenTimePermission === 'revoked' ? 'Turned off'
    : settings.screenTimePermission === 'denied' ? 'Not allowed'
    : settings.screenTimePermission === 'not-requested' ? 'Not connected'
    : shield?.enabled ? 'On'
    : shield && shield.applicationCount + shield.categoryCount + shield.webDomainCount === 0 ? 'Choose apps'
    : 'Paused';

  const subscription = subscriptionSummary(settings.subscription, billing);
  const hasPlus = settings.subscription === 'active' || settings.subscription === 'trial';
  const languages = profile.learningLanguages.length ? profile.learningLanguages.join(', ') : 'None yet';

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 28 }}
    >
      <View>
        <CircleButton icon="arrow-back" label="Back" dark={dark} onPress={() => router.back()} />
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: 6 }}>
            <Title color={t.text} large>Settings</Title>
            <Txt weight="display" size={16} color={t.muted} style={{ transform: [{ rotate: '-1.5deg' }] }}>Make Goomi fit your day.</Txt>
          </View>
          <Mascot pose="think" size={96} motion="breathe" />
        </View>
      </View>

      <ListGroup theme={t} title="Goomi">
        <ListRow
          theme={t}
          icon={modeMeta(settings.mode).icon}
          title="Mode"
          detail={MODE_CONFIG[settings.mode].description}
          value={MODE_CONFIG[settings.mode].title}
          onPress={() => router.push('/mode' as Href)}
        />
        <GroupBlock
          theme={t}
          title="How often Goomi shows up"
          detail={`A moment after about ${plural(frequency.minutes, 'minute')} of use in your selected apps.`}
        >
          <Segmented
            theme={t}
            label="Intervention frequency"
            value={frequency.minutes}
            onChange={setFrequency}
            options={FREQUENCIES.map((item) => ({ value: item.minutes, label: item.label }))}
          />
        </GroupBlock>
        <ListRow
          theme={t}
          icon="hourglass-outline"
          title="Screen Time"
          detail={settings.screenTimePermission === 'revoked' ? 'Screen Time was turned off. Tap to reconnect.' : 'Apps, permission and app moments'}
          value={screenTimeValue}
          tone={settings.screenTimePermission === 'revoked' ? 'danger' : undefined}
          onPress={() => router.push('/screen-time' as Href)}
          last
        />
      </ListGroup>

      <ListGroup theme={t} title="Learning">
        <ListRow
          theme={t}
          icon="flag-outline"
          title="Daily goal"
          value={`${plural(profile.dailyGoal, 'discovery', 'discoveries')} a day`}
          onPress={() => router.push('/goal' as Href)}
        />
        <ListRow theme={t} icon="chatbubbles-outline" title="Languages" value={languages} onPress={() => router.push('/languages' as Href)} />
        <ListRow
          theme={t}
          icon="compass-outline"
          title="Interests"
          value={plural(profile.interests.length, 'topic')}
          onPress={() => router.navigate('/(tabs)/explore' as Href)}
          last
        />
      </ListGroup>

      <View style={{ gap: 10 }}>
        <ListGroup theme={t} title="Experience">
          <ListRow
            theme={t}
            icon="phone-portrait-outline"
            title="Haptics"
            detail="Little taps as you play and answer"
            trailing={<Toggle theme={t} label="Haptics" value={settings.haptics} onValueChange={(haptics) => updateSettings({ haptics })} />}
          />
          <ListRow
            theme={t}
            icon="notifications-outline"
            title="Daily reminder"
            detail={settings.reminders ? `Every day at ${reminderTimeLabel()}` : 'A friendly nudge once a day'}
            trailing={reminderBusy
              ? <Beads />
              : <Toggle theme={t} label="Daily reminder" value={settings.reminders} onValueChange={(on) => void setReminders(on)} />}
            last
          />
        </ListGroup>
        {reminderIssue && <Notice
          theme={t}
          tone="warning"
          icon="notifications-off-outline"
          title={reminderIssue.kind === 'denied' ? 'Notifications are off' : 'Reminder not set'}
          body={reminderIssue.message}
          action={reminderIssue.kind === 'denied' ? 'Open Settings' : undefined}
          onAction={reminderIssue.kind === 'denied' ? () => void Linking.openSettings() : undefined}
        />}
      </View>

      <ListGroup theme={t} title="Appearance">
        <GroupBlock theme={t} title="Theme" last>
          <Segmented
            theme={t}
            label="Appearance"
            value={settings.appearance}
            onChange={(appearance) => updateSettings({ appearance })}
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </GroupBlock>
      </ListGroup>

      <ListGroup theme={t} title="Privacy">
        <ListRow
          theme={t}
          icon="analytics-outline"
          title="Share anonymous usage analytics"
          detail={analyticsConfigured()
            ? 'Off unless you turn it on. Never includes answers, notes or document names.'
            : 'Analytics isn’t configured in this build, so nothing is sent either way.'}
          trailing={<Toggle theme={t} label="Share anonymous usage analytics" value={analyticsConsent} onValueChange={setAnalytics} />}
        />
        <ListRow theme={t} icon="shield-checkmark-outline" title="Privacy" detail="What stays on this phone, and what doesn’t" onPress={() => router.push('/legal?doc=privacy' as Href)} last />
      </ListGroup>

      <View style={{ gap: 10 }}>
        <ListGroup theme={t} title="Account">
          {account ? <>
            <ListRow theme={t} icon={account.provider === 'apple' ? 'logo-apple' : 'logo-google'} title={account.email ?? account.name ?? 'Signed in'} detail={`Signed in with ${account.provider === 'apple' ? 'Apple' : 'Google'}`} />
            <ListRow
              theme={t}
              icon="log-out-outline"
              title={accountBusy === 'sign-out' ? 'Signing out…' : 'Sign out'}
              trailing={accountBusy === 'sign-out' ? <Beads /> : undefined}
              onPress={accountBusy ? undefined : confirmSignOut}
            />
            <ListRow
              theme={t}
              icon="person-remove-outline"
              tone="danger"
              title={accountBusy === 'delete' ? 'Deleting account…' : 'Delete account'}
              detail="Deletes your account and unlinks Goomi Plus from it"
              trailing={accountBusy === 'delete' ? <Beads /> : undefined}
              onPress={accountBusy ? undefined : confirmDeleteAccount}
              last
            />
          </> : <ListRow
            theme={t}
            icon="person-circle-outline"
            tone="accent"
            title="Save your Goomi"
            detail="Keep your profile and Plus with your account"
            onPress={() => router.push('/account?source=profile' as Href)}
            last
          />}
        </ListGroup>
        {accountResult && <Notice
          theme={t}
          tone={accountResult.tone}
          icon={accountResult.tone === 'warning' ? 'alert-circle-outline' : 'information-circle-outline'}
          title={accountResult.title}
          body={accountResult.body}
          action={accountResult.manage ? 'App Store subscriptions' : undefined}
          onAction={accountResult.manage ? () => void openManageSubscription() : undefined}
        />}
      </View>

      <View style={{ gap: 10 }}>
        <ListGroup theme={t} title="Subscription">
          <ListRow theme={t} icon="sparkles" tone={hasPlus ? 'accent' : undefined} title={subscription.title} detail={subscription.detail} />
          {!hasPlus && <ListRow theme={t} icon="star-outline" title="Goomi Plus" detail="See plans and what’s included" onPress={() => router.push('/paywall?source=profile' as Href)} />}
          <ListRow theme={t} icon="card-outline" title="Manage subscription" detail="Change or cancel in your App Store account" onPress={() => void openManageSubscription()} />
          <ListRow
            theme={t}
            icon="refresh-outline"
            title="Restore purchases"
            detail={restoring ? 'Checking with the App Store…' : undefined}
            trailing={restoring ? <Beads /> : undefined}
            onPress={restoring ? undefined : () => void restore()}
            last
          />
        </ListGroup>
        {!availability.available && availability.reason && billingState !== 'checked' && <Notice theme={t} icon="information-circle-outline" title="Subscriptions" body={availability.reason} />}
        {restoreResult && <Notice
          theme={t}
          tone={restoreResult.tone}
          icon={restoreResult.tone === 'lime' ? 'checkmark-circle-outline' : restoreResult.tone === 'warning' ? 'alert-circle-outline' : 'information-circle-outline'}
          title={restoreResult.title}
          body={restoreResult.body}
        />}
      </View>

      <ListGroup theme={t} title="Help">
        <ListRow theme={t} icon="help-buoy-outline" title="Help & support" detail="How moments, unlocks and purchases work" onPress={() => router.push('/legal?doc=help' as Href)} />
        <ListRow theme={t} icon="document-text-outline" title="Terms" onPress={() => router.push('/legal?doc=terms' as Href)} last />
      </ListGroup>

      <ListGroup theme={t} title="Danger zone">
        <ListRow
          theme={t}
          icon="trash-outline"
          tone="danger"
          title={resetting ? 'Resetting…' : 'Reset Goomi on this phone'}
          detail="Clears progress, study notes and settings"
          trailing={resetting ? <Beads /> : undefined}
          onPress={resetting ? undefined : confirmReset}
          last
        />
      </ListGroup>

      <Txt size={11} color={t.faint} style={{ textAlign: 'center' }}>
        {`Goomi ${Constants.expoConfig?.version ?? ''}`.trim()}
      </Txt>
    </ScrollView>
  </View>;
}

function subscriptionSummary(subscription: 'not-configured' | 'trial' | 'active' | 'expired', billing: BillingStatus | null): { title: string; detail: string } {
  const date = billing?.expiresAt ? formatDate(billing.expiresAt) : null;
  if (subscription === 'active') {
    return { title: 'Goomi Plus', detail: date ? (billing?.willRenew ? `Renews ${date}` : `Ends ${date} · won’t renew`) : 'Active' };
  }
  if (subscription === 'trial') {
    return { title: 'Goomi Plus · free trial', detail: date ? (billing?.willRenew ? `Trial ends ${date}, then your plan begins` : `Trial ends ${date} · won’t renew`) : 'Trial active' };
  }
  if (subscription === 'expired') {
    return { title: 'Goomi Plus has ended', detail: 'Your progress stays on this phone. Come back anytime.' };
  }
  return { title: 'No subscription yet', detail: 'You’re not subscribed to Goomi Plus.' };
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12 },
  title: { letterSpacing: -1, lineHeight: 38 },
});
