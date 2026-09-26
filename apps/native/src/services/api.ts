import * as Network from 'expo-network';
import { INSTALL_ID_HEADER, apiErrorSchema, routePath, type ApiErrorCode, type ApiRoute, type RouteBody, type RouteParams, type RouteQuery, type RouteResponse } from '@goomi/content';
import { authClient } from '@/lib/auth-client';
import { ENV } from '../env';
import { bankHydrated, useBank } from '../state/bank-store';

/**
 * The only way the app talks to Goomi's server: routes come from the contract's `API` table and
 * every response is parsed with its route's schema before anything reads it. Failures throw
 * ApiRequestError so TanStack Query (and callers) see one error shape.
 */
/** Failures the device detects itself, never sent by the server. */
export type ClientErrorCode = 'offline' | 'unreachable' | 'invalid_response' | 'unknown';
/** Every code a caller may see; an older app can still get a server code it doesn't know. */
export type ApiErrorKind = ApiErrorCode | ClientErrorCode;
export type ApiError = { status: number; code: ApiErrorKind | (string & {}); message: string };

export class ApiRequestError extends Error implements ApiError {
  constructor(readonly status: number, readonly code: ApiError['code'], message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const serverUrl = () => ENV.EXPO_PUBLIC_SERVER_URL?.replace(/\/$/, '');
/** Whether this build can reach Goomi's server at all (AI study still needs Plus + sign-in). */
export const apiConfigured = () => Boolean(serverUrl());

/** 4xx answers are final (auth, quota, validation); retrying only repeats them. */
export const isFinalError = (error: unknown) => error instanceof ApiRequestError && error.status >= 400 && error.status < 500;

async function unreachable(): Promise<ApiRequestError> {
  // A failed fetch with a working connection means Goomi's server is down or unreachable, not that the phone is offline.
  const online = await Network.getNetworkStateAsync().then((state) => state.isInternetReachable !== false && state.isConnected !== false).catch(() => false);
  return online
    ? new ApiRequestError(0, 'unreachable', 'Goomi’s server didn’t answer. Try again in a bit, or keep this one on your phone.')
    : new ApiRequestError(0, 'offline', 'Connect to the internet and try again, or keep this one on your phone.');
}

type Input<R extends ApiRoute> = { signal?: AbortSignal }
  & (keyof RouteParams<R> extends never ? { params?: undefined } : { params: RouteParams<R> })
  & ([RouteQuery<R>] extends [never] ? { query?: undefined } : { query: RouteQuery<R> })
  & ([RouteBody<R>] extends [never] ? { body?: undefined } : { body: RouteBody<R> });

/** Routes without params, query or body can be called with no input. */
type Args<R extends ApiRoute> = keyof RouteParams<R> extends never
  ? [RouteQuery<R>] extends [never] ? [RouteBody<R>] extends [never] ? [input?: Input<R>] : [input: Input<R>] : [input: Input<R>]
  : [input: Input<R>];

export async function apiRequest<R extends ApiRoute>(route: R, ...[input]: Args<R>): Promise<RouteResponse<R>> {
  const { params, query, body, signal } = (input ?? {}) as { params?: Record<string, string>; query?: Record<string, string | number | undefined>; body?: unknown; signal?: AbortSignal };
  const base = serverUrl();
  if (!base) throw new ApiRequestError(0, 'study.disabled', 'Goomi’s server isn’t configured in this build.');
  // The install id is persisted: a fresh random one would count against another device's quota.
  await bankHydrated();
  const cookie = await authClient.getCookie().catch(() => '');
  const headers: Record<string, string> = { Accept: 'application/json', [INSTALL_ID_HEADER]: useBank.getState().installId };
  if (cookie) headers.Cookie = cookie;
  const json = body !== undefined && !(body instanceof FormData);
  if (json) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${base}${routePath(route, (params ?? {}) as RouteParams<R>, query)}`, {
      method: route.method, headers, credentials: 'omit', signal,
      body: body === undefined ? undefined : json ? JSON.stringify(body) : (body as FormData),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw await unreachable();
  }
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    throw new ApiRequestError(response.status, parsed.success ? parsed.data.error.code : 'unknown', parsed.success ? parsed.data.error.message : 'Something went wrong. Try again later.');
  }
  const parsed = route.response.safeParse(payload);
  if (!parsed.success) throw new ApiRequestError(response.status, 'invalid_response', 'Goomi’s server sent something this version of the app can’t read. Try updating Goomi.');
  return parsed.data as RouteResponse<R>;
}
