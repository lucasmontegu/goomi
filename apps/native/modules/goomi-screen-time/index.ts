import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type ScreenTimeAuthorization = 'notDetermined' | 'denied' | 'approved' | 'unavailable';
export type ScreenTimeStatus = {
  supported: boolean;
  authorization: ScreenTimeAuthorization;
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
  enabled: boolean;
  shielded: boolean;
  pendingChallenge: boolean;
  /** Wall-clock safety expiry, not a live usage countdown. */
  unlockEndsAt: number | null;
  usageBudgetMinutes: number | null;
  canOpenFromShield: boolean;
};
type NativeScreenTime = {
  getStatus(): Promise<ScreenTimeStatus>;
  requestAuthorization(): Promise<ScreenTimeStatus>;
  presentPicker(): Promise<ScreenTimeStatus>;
  enable(): Promise<ScreenTimeStatus>;
  disable(): Promise<ScreenTimeStatus>;
  unlock(minutes: number): Promise<ScreenTimeStatus>;
};
const native = Platform.OS === 'ios'
  ? requireOptionalNativeModule<NativeScreenTime>('GoomiScreenTime') : null;
const unavailable: ScreenTimeStatus = {
  supported: false, authorization: 'unavailable', applicationCount: 0,
  categoryCount: 0, webDomainCount: 0, enabled: false, shielded: false,
  pendingChallenge: false, unlockEndsAt: null, usageBudgetMinutes: null,
  canOpenFromShield: false,
};
function requireDevice(): NativeScreenTime {
  if (!native) throw new Error('Screen Time requires Goomi’s iOS development build on a physical iPhone.');
  return native;
}
export const screenTime = {
  getStatus: () => native?.getStatus() ?? Promise.resolve(unavailable),
  requestAuthorization: () => requireDevice().requestAuthorization(),
  presentPicker: () => requireDevice().presentPicker(),
  enable: () => requireDevice().enable(),
  disable: () => requireDevice().disable(),
  unlock: (minutes = 5) => requireDevice().unlock(minutes),
};
export default screenTime;
