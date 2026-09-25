import { API_ERRORS, routeParamSchema, type ApiErrorCode, type ApiRoute, type RouteParams } from "@goomi/content";
import type { EvlogVariables } from "evlog/hono";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";

/**
 * Server adapter for the route table in @goomi/content: a handler receives parsed input and returns
 * the response body; the path, method, success status and error statuses all come from the contract.
 */

/** A refusal the client should see: `{ error: { code, message } }` with the code's status (API_ERRORS). */
export class ApiFailure extends Error {
  constructor(readonly code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiFailure";
  }
}

export function refuse(code: ApiErrorCode, message: string): never {
  throw new ApiFailure(code, message);
}

export const errorBody = (code: ApiErrorCode, message: string) => ({ error: { code, message } });

/** The one place an error becomes a response; internals never reach the client. */
export function errorResponse(error: unknown, c: Context): Response {
  if (error instanceof ApiFailure) return c.json(errorBody(error.code, error.message), API_ERRORS[error.code]);
  if (error instanceof HTTPException) return error.getResponse();
  const log = (c as unknown as Context<EvlogVariables>).get("log") as EvlogVariables["Variables"]["log"] | undefined;
  if (log) log.error(error instanceof Error ? error : new Error(String(error)));
  else console.error(error);
  return c.json(errorBody("internal", "Something went wrong. Try again later."), 500);
}

type Parsed<S> = S extends z.ZodType ? z.output<S> : undefined;
export type RouteInput<R extends ApiRoute> = {
  params: RouteParams<R>;
  query: R extends { query: infer Q } ? Parsed<Q> : undefined;
  /** Parsed JSON; multipart routes read `c.req.parseBody()` themselves. */
  body: R extends { body: infer B } ? Parsed<B> : undefined;
};
/** Returns the response body (sent through the route's schema), or a ready Response. */
export type RouteHandler<R extends ApiRoute> = (c: Context, input: RouteInput<R>) => Promise<z.input<R["response"]> | Response>;

const JSON_BODY_BYTES = 1024 * 1024;

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  return refuse("invalid", issue ? `${issue.path.join(".") || "request"}: ${issue.message}`.slice(0, 500) : "Invalid request.");
}

/**
 * Registers `handler` for `route`. Bodies are size-capped while they stream in (before parsing);
 * JSON bodies get 1 MB unless `maxBodyBytes` says otherwise.
 */
export function on<R extends ApiRoute>(app: Hono, route: R, handler: RouteHandler<R>, options: { maxBodyBytes?: number } = {}) {
  const run = async (c: Context) => {
    const params: Record<string, string> = {};
    for (const [name, value] of Object.entries(c.req.param() as Record<string, string>)) params[name] = parse(routeParamSchema, value);
    const query = route.query ? parse(route.query, c.req.query()) : undefined;
    const body = route.body && route.body !== "multipart" ? parse(route.body, await c.req.json().catch(() => null)) : undefined;
    // The handler may still pick another 2xx with c.status() (e.g. 200 for a duplicate upload).
    c.status(route.status);
    const result = await handler(c, { params, query, body } as RouteInput<R>);
    if (result instanceof Response) return result;
    if (route.status === 204) return c.body(null);
    // Unknown keys are stripped by the schema, so nothing extra leaks.
    return c.json(route.response.parse(result) as object);
  };
  if (!route.body) return app.on(route.method, route.path, run);
  const limit = bodyLimit({
    maxSize: options.maxBodyBytes ?? JSON_BODY_BYTES,
    onError: (c) => errorResponse(new ApiFailure("material.too_large", "This request is too large."), c),
  });
  return app.on(route.method, route.path, limit, run);
}
