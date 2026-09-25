import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authClient } from '@/lib/auth-client';
import { useGoomi, type Account } from '../state/store';
import { applyBillingStatus } from '../state/runtime';
import { setBillingUser } from './billing';

/**
 * Sign in with Apple / Google through native id tokens, verified by Better Auth on the server
 * (`signIn.social({ provider, idToken })`). The session cookie is kept by the Better Auth Expo
 * client in SecureStore; the zustand store only keeps the non-secret identity (id, name, email).
 *
 * Native SDKs are loaded lazily so a build without them (or without Google credentials) shows
 * the option as unavailable instead of crashing at import time.
 */

export type AuthProvider = Account['provider'];
export type AuthError = { code: string; message: string; cancelled: boolean };
export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthError };
export type ProviderAvailability = { available: boolean; reason: string | null };

const PROVIDER_LABEL: Record<AuthProvider, string> = { apple: 'Apple', google: 'Google' };

function fail(code: string, message: string, cancelled = false): { ok: false; error: AuthError } {
  return { ok: false, error: { code, message, cancelled } };
}
const cancelledResult = () => fail('cancelled', 'Sign-in was cancelled.', true);

/* ---------------------------------------------------------------- Apple */

type AppleModule = typeof import('expo-apple-authentication');
let appleModule: Promise<AppleModule> | null = null;
function apple(): Promise<AppleModule> {
  appleModule ??= import('expo-apple-authentication').catch((error: unknown) => { appleModule = null; throw error; });
  return appleModule;
}

export async function appleAvailability(): Promise<ProviderAvailability> {
  if (Platform.OS !== 'ios') return { available: false, reason: 'Sign in with Apple is available on iPhone.' };
  try {
    const available = await (await apple()).isAvailableAsync();
    return available ? { available: true, reason: null } : { available: false, reason: 'Sign in with Apple isn’t available on this device.' };
  } catch {
    return { available: false, reason: 'Sign in with Apple isn’t included in this build yet.' };
  }
}

/** 32 random bytes, hex. Sent raw to both Apple and the server (see signInWithApple). */
async function createNonce(): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function signInWithApple(): Promise<AuthResult<Account>> {
  const availability = await appleAvailability();
  if (!availability.available) return fail('unavailable', availability.reason!);
  let AppleAuthentication: AppleModule;
  try { AppleAuthentication = await apple(); } catch { return fail('unavailable', 'Sign in with Apple isn’t included in this build yet.'); }

  // Replay protection. The same raw nonce goes to Apple and to Better Auth, whose Apple verifier
  // accepts the token's `nonce` claim when it equals the raw value or its SHA-256 hex digest.
  let nonce: string;
  try { nonce = await createNonce(); } catch { return fail('nonce_failed', 'Something went wrong starting sign-in. Please try again.'); }

  let credential: Awaited<ReturnType<AppleModule['signInAsync']>>;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce,
    });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'ERR_REQUEST_CANCELED') return cancelledResult();
    return fail(code ?? 'apple_failed', 'Apple couldn’t complete sign-in. Please try again.');
  }
  if (!credential.identityToken) return fail('no_token', 'Apple didn’t return a sign-in token. Please try again.');

  // Apple shares the name (and email) only on the very first authorization, so pass it along now.
  const firstName = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;
  return completeSignIn('apple', {
    token: credential.identityToken,
    nonce,
    user: firstName || lastName || credential.email
      ? { name: firstName || lastName ? { firstName, lastName } : undefined, email: credential.email ?? undefined }
      : undefined,
  });
}

/* ---------------------------------------------------------------- Google */

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let googleModule: Promise<GoogleModule> | null = null;
let googleConfigured = false;

const googleIosClientId = () => process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';
const googleWebClientId = () => process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

/** Synchronous configuration check; the native module itself is checked on use. */
export function googleAvailability(): ProviderAvailability {
  if (Platform.OS !== 'ios') return { available: false, reason: 'Google sign-in is available on iPhone.' };
  if (!googleIosClientId() || !googleWebClientId()) return { available: false, reason: 'Google sign-in isn’t set up in this build yet.' };
  // The Google SDK aborts the app if its URL scheme is missing, which is only added at prebuild.
  if (Constants.expoConfig?.extra?.googleSignInNative !== true) return { available: false, reason: 'Google sign-in needs a new build of the app.' };
  return { available: true, reason: null };
}

async function google(): Promise<GoogleModule> {
  googleModule ??= import('@react-native-google-signin/google-signin').catch((error: unknown) => { googleModule = null; throw error; });
  const module = await googleModule;
  if (!googleConfigured) {
    // webClientId makes Google issue the id token for the server's audience (GOOGLE_CLIENT_ID).
    module.GoogleSignin.configure({ iosClientId: googleIosClientId(), webClientId: googleWebClientId(), scopes: ['email', 'profile'] });
    googleConfigured = true;
  }
  return module;
}

export async function signInWithGoogle(): Promise<AuthResult<Account>> {
  const availability = googleAvailability();
  if (!availability.available) return fail('unavailable', availability.reason!);
  let module: GoogleModule;
  try { module = await google(); } catch { return fail('unavailable', 'Google sign-in isn’t included in this build yet.'); }
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = module;

  let idToken: string | null;
  try {
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return cancelledResult();
    idToken = response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return cancelledResult();
      if (error.code === statusCodes.IN_PROGRESS) return fail('in_progress', 'Google sign-in is already open.');
    }
    return fail('google_failed', 'Google couldn’t complete sign-in. Please try again.');
  }
  if (!idToken) return fail('no_token', 'Google didn’t return a sign-in token. Please try again.');
  return completeSignIn('google', { token: idToken });
}

/* ---------------------------------------------------------------- Server session */

type IdTokenPayload = { token: string; nonce?: string; user?: { name?: { firstName?: string; lastName?: string }; email?: string } };
type BetterAuthErrorShape = { code?: string; message?: string; status?: number } | null | undefined;

function serverError(provider: AuthProvider, error: BetterAuthErrorShape): { ok: false; error: AuthError } {
  const code = error?.code ?? (error?.status ? `http_${error.status}` : 'server_error');
  const label = PROVIDER_LABEL[provider];
  switch (code) {
    case 'PROVIDER_NOT_FOUND':
    case 'ID_TOKEN_NOT_SUPPORTED':
      return fail(code, `Continue with ${label} isn’t switched on for Goomi yet. Please try the other option or skip for now.`);
    case 'INVALID_TOKEN':
      return fail(code, `${label} couldn’t confirm it’s you. Please try again.`);
    case 'USER_EMAIL_NOT_FOUND':
      return fail(code, `Goomi needs the email from your ${label} account to save your Goomi. Please try again.`);
    case 'OAUTH_LINK_ERROR':
      return fail(code, 'This email already has a Goomi account with a different sign-in. Use that option instead.');
    case 'EMAIL_NOT_VERIFIED':
      return fail(code, `Your ${label} email isn’t verified yet. Verify it with ${label}, then try again.`);
    default:
      if (error?.status === 429) return fail(code, 'Too many attempts. Please wait a moment and try again.');
      return fail(code, 'Goomi couldn’t reach its server. Check your connection and try again.');
  }
}

async function completeSignIn(provider: AuthProvider, idToken: IdTokenPayload): Promise<AuthResult<Account>> {
  let result: { data: unknown; error: BetterAuthErrorShape };
  try {
    result = await authClient.signIn.social({ provider, idToken }) as { data: unknown; error: BetterAuthErrorShape };
  } catch {
    return fail('network', 'Goomi couldn’t reach its server. Check your connection and try again.');
  }
  const user = (result.data as { user?: { id?: string; name?: string | null; email?: string | null } } | null)?.user;
  if (result.error || !user?.id) return serverError(provider, result.error);

  const account: Account = { id: user.id, name: user.name?.trim() || null, email: user.email ?? null, provider };
  useGoomi.getState().setAccount(account);
  // Tie the RevenueCat customer to the account so Plus follows it to a new phone. Billing may be
  // unavailable (simulator, no key); that never blocks the account itself.
  const billing = await setBillingUser(account.id);
  if (billing.ok) applyBillingStatus(billing.value);
  return { ok: true, value: account };
}

/** The server's view of the session; null when signed out. Errors (offline) keep the local account. */
export async function getSession(): Promise<AuthResult<{ userId: string; email: string | null } | null>> {
  try {
    const { data, error } = await authClient.getSession();
    if (error) return serverError(useGoomi.getState().account?.provider ?? 'apple', error);
    if (!data?.user) return { ok: true, value: null };
    return { ok: true, value: { userId: data.user.id, email: data.user.email ?? null } };
  } catch {
    return fail('network', 'Goomi couldn’t reach its server. Check your connection and try again.');
  }
}

async function forgetLocalAccount(provider: AuthProvider | undefined) {
  // The Expo client clears its SecureStore cookie before the request is sent, so this works offline too.
  await authClient.signOut().catch(() => {});
  if (provider === 'google') {
    try { await (await google()).GoogleSignin.signOut(); } catch { /* not signed in with the SDK */ }
  }
  useGoomi.getState().clearAccount();
  const billing = await setBillingUser(null);
  if (billing.ok) applyBillingStatus(billing.value);
}

export async function signOut(): Promise<AuthResult<null>> {
  await forgetLocalAccount(useGoomi.getState().account?.provider);
  return { ok: true, value: null };
}

/**
 * Deletes the Better Auth user (sessions and linked accounts). Social-only accounts need a recent
 * sign-in; if the session is older than the server's freshAge, the provider sheet is shown once more
 * to confirm it's really the owner, then deletion is retried.
 * Store subscriptions are not cancelled by this: that happens in the App Store.
 */
export async function deleteAccount(): Promise<AuthResult<null>> {
  const account = useGoomi.getState().account;
  if (!account) return fail('signed_out', 'You’re not signed in.');

  const attempt = async () => {
    try { return await authClient.deleteUser({}) as { error: BetterAuthErrorShape }; }
    catch { return { error: { code: 'network' } as BetterAuthErrorShape }; }
  };

  // SESSION_EXPIRED: older than freshAge. 401: the session is gone (expired or revoked elsewhere).
  const needsFreshSignIn = (e: BetterAuthErrorShape) => e?.code === 'SESSION_EXPIRED' || e?.status === 401 || e?.code === 'UNAUTHORIZED';
  let { error } = await attempt();
  if (needsFreshSignIn(error)) {
    const again = account.provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    if (!again.ok) return again.error.cancelled ? again : fail(again.error.code, `To delete your account, confirm it’s you with ${PROVIDER_LABEL[account.provider]} first. ${again.error.message}`);
    ({ error } = await attempt());
  }
  if (error) {
    if (error.code === 'network') return fail('network', 'Goomi couldn’t reach its server. Your account wasn’t deleted. Check your connection and try again.');
    return fail(error.code ?? 'delete_failed', 'Your account couldn’t be deleted right now. Please try again.');
  }
  await forgetLocalAccount(account.provider);
  return { ok: true, value: null };
}
