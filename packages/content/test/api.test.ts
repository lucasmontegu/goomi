import { describe, expect, test } from "bun:test";
import { API, API_ERRORS, STUDY_STAGES, materialDetailSchema, routePath } from "../src/api";

describe("HTTP contract route table", () => {
  test("paths are built from the table: params encoded, undefined query values dropped", () => {
    expect(routePath(API.getMaterial, { id: "a/b c" })).toBe("/v1/materials/a%2Fb%20c");
    expect(routePath(API.addMaterialPages, { id: "m1" })).toBe("/v1/materials/m1/pages");
    expect(routePath(API.bank, {}, { lang: "es", limit: 50, cursor: undefined })).toBe("/v1/bank?lang=es&limit=50");
  });

  test("one route per method + path; error statuses are client or server errors", () => {
    const keys = Object.values(API).map((route) => `${route.method} ${route.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const status of Object.values(API_ERRORS)) expect(status >= 400 && status < 600).toBe(true);
  });

  test("an older app tolerates stages and error codes added later", () => {
    const detail = { id: "m1", title: "Bio", status: "failed", lang: null, error: "some_future_code", progress: { stage: "future-stage", step: STUDY_STAGES.length + 1, total: STUDY_STAGES.length + 1 } };
    expect(materialDetailSchema.safeParse(detail).success).toBe(true);
  });
});
