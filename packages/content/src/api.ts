import { z } from "zod";
import { challengeSchema, topicIdSchema, type Challenge } from "./schema";

/**
 * HTTP contract between apps/server and apps/native (ADR-001 §11). `API` at the bottom is the route
 * table both sides are built from: the server registers each handler from its route (params, query
 * and body parsed, the response sent through its schema so nothing extra leaks) and the device calls
 * routes by name (the response parsed before it touches local state). Paths, methods and statuses
 * live only here.
 */

export const API_LANGS = ["en", "es", "pt-BR"] as const;
export const apiLangSchema = z.enum(API_LANGS);
export type ApiLang = z.infer<typeof apiLangSchema>;

/** Anonymous devices identify with a random install id sent as `x-goomi-install`. */
export const INSTALL_ID_HEADER = "x-goomi-install";
export const installIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

/** Upload limits both sides enforce; the server is the authority. */
export const STUDY_UPLOAD_LIMITS = {
  maxTitleChars: 120,
  maxPagesPerDocument: 50,
  maxCharsPerDocument: 100_000,
  minCharsPerDocument: 200,
  maxImagesPerRequest: 10,
  maxImageBytes: 1_500_000,
  imageTypes: ["image/jpeg", "image/png"],
} as const;

// ─── Errors ─────────────────────────────────────────────────────────────────────────────────────
/** Every error the server sends, with its HTTP status. Handlers name a code; the status follows from it. */
export const API_ERRORS = {
  "auth.required": 401, "identity.required": 400, "plus.required": 403, "study.disabled": 503, "consent.required": 422,
  rate_limited: 429, "quota.documents": 429, "quota.pages": 429, "quota.ocr": 429, "quota.spend": 429, "quota.concurrent": 429,
  "material.not_found": 404, "material.no_text": 422, "material.too_large": 413, "material.started": 409,
  invalid: 400, unauthorized: 401, unavailable: 503, not_found: 404, internal: 500,
} as const;
export type ApiErrorCode = keyof typeof API_ERRORS;
export const API_ERROR_CODES = Object.keys(API_ERRORS) as ApiErrorCode[];
/** `code` stays a plain string on the wire so an older app tolerates codes added later. */
export const apiErrorSchema = z.object({ error: z.object({ code: z.string().max(64), message: z.string().max(500) }) });
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

/** Challenges from the network: invalid entries are dropped, never trusted. */
export const challengeListSchema = z.array(z.unknown()).max(500).transform((items): Challenge[] => items.flatMap((item) => {
  const parsed = challengeSchema.safeParse(item);
  return parsed.success ? [parsed.data] : [];
}));

// ─── GET /v1/bank ───────────────────────────────────────────────────────────────────────────────
export const bankQuerySchema = z.object({
  lang: apiLangSchema,
  /** Opaque sync cursor: the last `seq` seen (a bigint as digits). */
  cursor: z.string().regex(/^\d{1,19}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Comma-separated topic ids. */
  topics: z.string().max(400).optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : []))
    .pipe(z.array(topicIdSchema).max(20)),
});
export type BankQueryInput = z.input<typeof bankQuerySchema>;

export const bankResponseSchema = z.object({
  items: challengeListSchema,
  retired: z.array(z.string().max(200)).max(200),
  cursor: z.string().regex(/^\d{1,19}$/),
  hasMore: z.boolean(),
  quota: z.object({ remainingToday: z.number().int().min(0) }),
});
export type BankResponse = z.output<typeof bankResponseSchema>;

// ─── Study materials ────────────────────────────────────────────────────────────────────────────
export const materialKindSchema = z.enum(["pdf", "image", "slides", "text"]);
export const materialStatusSchema = z.enum(["queued", "processing", "ready", "failed"]);
export type MaterialKind = z.infer<typeof materialKindSchema>;
export type MaterialStatus = z.infer<typeof materialStatusSchema>;
const materialIdSchema = z.string().min(1).max(64);

/**
 * Stages of the study pipeline, in order (packages/ai runs them; `progress.step` counts them).
 * Before the first stage a material is `uploaded` (no job yet) or `queued` (job waiting).
 */
export const STUDY_STAGES = ["structure", "embed", "extract", "link", "generate", "judge", "publish"] as const;
export type StudyStage = (typeof STUDY_STAGES)[number];

/** Why a material ended `failed` (`material.error`). Stays a plain string on the wire, like error codes. */
export const MATERIAL_ERRORS = ["no_questions", "processing_failed", "quota.spend"] as const;
export type MaterialErrorCode = (typeof MATERIAL_ERRORS)[number];

export const createMaterialRequestSchema = z.object({
  title: z.string().trim().min(1).max(STUDY_UPLOAD_LIMITS.maxTitleChars),
  kind: materialKindSchema,
  consentVersion: z.string().max(32),
  pages: z.array(z.object({
    n: z.number().int().min(1).max(STUDY_UPLOAD_LIMITS.maxPagesPerDocument),
    text: z.string().max(STUDY_UPLOAD_LIMITS.maxCharsPerDocument),
  })).min(1).max(STUDY_UPLOAD_LIMITS.maxPagesPerDocument),
  /** Pages the device could not read; their images may be sent to /pages before /start. */
  ocrPages: z.array(z.number().int().min(1).max(STUDY_UPLOAD_LIMITS.maxPagesPerDocument)).max(STUDY_UPLOAD_LIMITS.maxPagesPerDocument).default([]),
});
export type CreateMaterialRequest = z.input<typeof createMaterialRequestSchema>;

/**
 * Also the answer to a repeated upload of the same text (`duplicate`), so an interrupted upload
 * resumes: `ocrPages` lists the page images still missing and `started` says whether /start ran.
 */
export const createMaterialResponseSchema = z.object({
  id: materialIdSchema,
  status: materialStatusSchema,
  duplicate: z.boolean().optional(),
  started: z.boolean(),
  ocrPages: z.array(z.number().int()),
});
export type CreateMaterialResponse = z.output<typeof createMaterialResponseSchema>;

export const ocrPagesResponseSchema = z.object({
  pages: z.array(z.object({ n: z.number().int(), chars: z.number().int().min(0), legibility: z.string().max(32) })),
});

/** Idempotent: starting a started material answers with its current status. */
export const startMaterialResponseSchema = z.object({ id: materialIdSchema, status: materialStatusSchema });

/** `stage` is a StudyStage, `uploaded` or `queued`; a plain string so an older app tolerates new stages. */
export const materialProgressSchema = z.object({ stage: z.string().max(32), step: z.number().int().min(0), total: z.number().int().min(1) });
export type MaterialProgress = z.output<typeof materialProgressSchema>;

export const materialDetailSchema = z.object({
  id: materialIdSchema,
  title: z.string().max(STUDY_UPLOAD_LIMITS.maxTitleChars),
  status: materialStatusSchema,
  lang: z.string().max(8).nullable(),
  /** A MaterialErrorCode, never a raw error message. */
  error: z.string().max(64).nullable(),
  progress: materialProgressSchema,
  challenges: challengeListSchema.optional(),
});
export type MaterialDetail = z.output<typeof materialDetailSchema>;

export const materialListSchema = z.object({
  materials: z.array(z.object({
    id: materialIdSchema,
    title: z.string().max(STUDY_UPLOAD_LIMITS.maxTitleChars),
    kind: materialKindSchema,
    status: materialStatusSchema,
    lang: z.string().max(8).nullable(),
    error: z.string().max(64).nullable(),
    createdAt: z.iso.datetime(),
    challengeCount: z.number().int().min(0),
  })).max(100),
});
export type MaterialList = z.output<typeof materialListSchema>;

// ─── Route table ────────────────────────────────────────────────────────────────────────────────
export type ApiMethod = "GET" | "POST" | "DELETE";
/**
 * One endpoint. `body: "multipart"` is form data the handler reads itself. `status` is the success
 * status; a handler may answer another 2xx (e.g. a duplicate upload is 200, a new one 201).
 */
export type ApiRoute = {
  method: ApiMethod;
  path: `/${string}`;
  query?: z.ZodType;
  body?: z.ZodType | "multipart";
  response: z.ZodType;
  status: 200 | 201 | 202 | 204;
};
const route = <const R extends ApiRoute>(definition: R) => definition;

export const API = {
  bank: route({ method: "GET", path: "/v1/bank", query: bankQuerySchema, response: bankResponseSchema, status: 200 }),
  listMaterials: route({ method: "GET", path: "/v1/materials", response: materialListSchema, status: 200 }),
  createMaterial: route({ method: "POST", path: "/v1/materials", body: createMaterialRequestSchema, response: createMaterialResponseSchema, status: 201 }),
  /** Page images (`n` + `image` pairs) for pages listed in `ocrPages`; before /start only. */
  addMaterialPages: route({ method: "POST", path: "/v1/materials/:id/pages", body: "multipart", response: ocrPagesResponseSchema, status: 200 }),
  startMaterial: route({ method: "POST", path: "/v1/materials/:id/start", response: startMaterialResponseSchema, status: 202 }),
  getMaterial: route({ method: "GET", path: "/v1/materials/:id", response: materialDetailSchema, status: 200 }),
  deleteMaterial: route({ method: "DELETE", path: "/v1/materials/:id", response: z.null(), status: 204 }),
} as const;
export type ApiRouteName = keyof typeof API;

type PathParamNames<P extends string> = P extends `${string}:${infer Name}/${infer Rest}` ? Name | PathParamNames<`/${Rest}`>
  : P extends `${string}:${infer Name}` ? Name : never;
export type RouteParams<R extends ApiRoute> = { [K in PathParamNames<R["path"]>]: string };
export type RouteQuery<R extends ApiRoute> = R extends { query: infer Q extends z.ZodType } ? z.input<Q> : never;
export type RouteBody<R extends ApiRoute> = R extends { body: infer B extends z.ZodType } ? z.input<B> : R extends { body: "multipart" } ? FormData : never;
export type RouteResponse<R extends ApiRoute> = z.output<R["response"]>;
/** Path parameters (ids) are opaque tokens of this shape. */
export const routeParamSchema = z.string().min(1).max(64);

/** The request URL path (+ query string) for a route: params encoded, undefined query values left out. */
export function routePath<R extends ApiRoute>(route: R, params: RouteParams<R>, query?: Record<string, string | number | undefined>): string {
  const path = route.path.replace(/:([A-Za-z]+)/g, (_, name: string) => encodeURIComponent((params as Record<string, string>)[name] ?? ""));
  const entries = Object.entries(query ?? {}).filter((entry): entry is [string, string | number] => entry[1] !== undefined);
  return entries.length ? `${path}?${new URLSearchParams(entries.map(([key, value]): [string, string] => [key, String(value)]))}` : path;
}
