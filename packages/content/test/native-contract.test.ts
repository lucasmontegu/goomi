import { describe, expect, test } from "bun:test";
import { challengeSchema } from "../src/schema";

/**
 * Contract with apps/native: every hand-written on-device challenge must satisfy the shared schema,
 * so bank/study content and starter content stay interchangeable. Loaded dynamically to keep the
 * native sources out of this package's type-check.
 */
const nativeContent = "../../../apps/native/src/domain/content.ts";

describe("native starter content satisfies @goomi/content", () => {
  test("STARTER_CHALLENGES, WORK_CHALLENGE and SLEEP_CHALLENGE parse", async () => {
    const content = (await import(nativeContent)) as Record<string, unknown>;
    const all = [...(content.STARTER_CHALLENGES as unknown[]), content.WORK_CHALLENGE, content.SLEEP_CHALLENGE];
    expect(all.length).toBeGreaterThan(20);
    const failures = all.flatMap((challenge) => {
      const result = challengeSchema.safeParse(challenge);
      return result.success ? [] : [`${(challenge as { id: string }).id}: ${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`];
    });
    expect(failures).toEqual([]);
  });
});
