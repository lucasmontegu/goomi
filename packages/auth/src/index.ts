import { expo } from "@better-auth/expo";
import { purgeUserContent, type Database } from "@goomi/db";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  /** Native iOS bundle ID; the `aud` of id tokens from Sign in with Apple on iPhone. */
  APPLE_APP_BUNDLE_IDENTIFIER?: string;
  /** Apple Services ID (web redirect flow). Also accepted as an id-token audience. */
  APPLE_CLIENT_ID?: string;
  /** ES256 JWT from the Sign in with Apple key. Only the web redirect flow needs it. */
  APPLE_CLIENT_SECRET?: string;
  /** Google "Web application" client ID; the `aud` of id tokens when the app passes webClientId. */
  GOOGLE_CLIENT_ID?: string;
  /** Google "iOS" client ID; accepted as an additional id-token audience. */
  GOOGLE_IOS_CLIENT_ID?: string;
  /** Only the web redirect flow needs it. */
  GOOGLE_CLIENT_SECRET?: string;
};

function present(...values: (string | undefined)[]): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => !!value);
}

/**
 * Apple and Google are enabled only when their IDs are configured, so an unconfigured
 * environment answers "provider not found" instead of accepting tokens for no audience.
 * The mobile app signs in with native id tokens (`signIn.social({ idToken })`), which are
 * verified against the provider's JWKS, issuer, audience and max age.
 */
function socialProviders(env: AuthConfig): BetterAuthOptions["socialProviders"] {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};

  const appleAudience = present(env.APPLE_APP_BUNDLE_IDENTIFIER, env.APPLE_CLIENT_ID);
  if (appleAudience.length) {
    providers.apple = {
      // The Services ID drives the web flow; natively the bundle ID is the only client.
      clientId: env.APPLE_CLIENT_ID?.trim() || appleAudience[0]!,
      clientSecret: env.APPLE_CLIENT_SECRET?.trim() || "",
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER?.trim() || undefined,
      // Accept both the iOS bundle ID (native) and the Services ID (web) as `aud`.
      audience: appleAudience,
    };
  }

  const googleAudience = present(env.GOOGLE_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID);
  if (googleAudience.length) {
    providers.google = {
      // First entry is the primary client for redirect flows; all entries are valid `aud` values.
      clientId: googleAudience,
      clientSecret: env.GOOGLE_CLIENT_SECRET?.trim() || "",
    };
  }

  return providers;
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
) {
  return betterAuth({
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,
      ...desktopOrigins,
      "goomi://",
      "exp://",
      "http://localhost:8081",
      // Apple's web redirect flow posts the callback from this origin.
      "https://appleid.apple.com",
    ],
    // Kept for the web; the mobile app only offers Apple and Google.
    emailAndPassword: { enabled: true },
    socialProviders: socialProviders(env),
    user: {
      // Required by App Store Review Guideline 5.1.1(v): accounts created in-app can be deleted in-app.
      // Without a password, deletion requires a fresh session (session.freshAge); the app re-authenticates.
      deleteUser: {
        enabled: true,
        // Study materials, chunks, concepts and quotas use a plain userId (no FK), so purge them explicitly.
        beforeDelete: async (user) => { await purgeUserContent(database, user.id); },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [expo()],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
