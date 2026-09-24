import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json stays the source of truth; this only adds config that depends on the environment.
 *
 * Google Sign-In on iOS needs the reversed iOS client ID registered as a URL scheme. That ID only
 * exists once a Google "iOS" OAuth client is created, so the plugin is added only when
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. Without it the app still builds and the Google button
 * shows as unavailable. Changing the value requires a new prebuild + native build.
 */
const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

function googleIosUrlScheme(clientId: string | undefined): string | null {
  const id = clientId?.trim();
  if (!id || !id.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  return `com.googleusercontent.apps.${id.slice(0, -GOOGLE_CLIENT_SUFFIX.length)}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = googleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const plugins = [...(config.plugins ?? [])];
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  return {
    ...config,
    name: config.name ?? 'Goomi',
    slug: config.slug ?? 'goomi',
    plugins,
    extra: {
      ...config.extra,
      // Read at runtime so the app never calls the Google SDK in a build without the URL scheme.
      googleSignInNative: !!iosUrlScheme,
    },
  };
};
