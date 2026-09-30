import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * The privacy policy, terms and account deletion page live on goomi.app, the single source of truth
 * that App Store Connect and Google Play also link to. They open in an in-app browser, in Spanish or
 * Portuguese when the phone is set to one of those languages (the site publishes all three).
 */
export type LegalPage = 'privacy' | 'terms' | 'delete-account';

const SITE_URL = 'https://goomi.app';

/** Same address the site's legal pages list (apps/web/src/landing/config.ts). */
export const SUPPORT_EMAIL = 'support@goomi.app';

function languagePrefix(): string {
  let language = '';
  try { language = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase(); } catch { /* no Intl */ }
  return language === 'es' || language === 'pt' ? `/${language}` : '';
}

export function legalUrl(page: LegalPage): string {
  return `${SITE_URL}${languagePrefix()}/${page}`;
}

export async function openLegal(page: LegalPage): Promise<void> {
  const url = legalUrl(page);
  try {
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}
