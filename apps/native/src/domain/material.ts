import type { MaterialDetail, MaterialErrorCode, MaterialProgress } from "@goomi/content";
import type { StudyMaterial } from "./types";

/** An AI-study material as the server reports it (`API.getMaterial`). */
export type RemoteMaterial = MaterialDetail;

/** The local library entry for an AI-processed material; its questions live on the device once ready. */
export function aiMaterial(remote: RemoteMaterial, previous: Pick<StudyMaterial, "id" | "kind" | "createdAt" | "text">): StudyMaterial {
  const ready = remote.status === "ready" && (remote.challenges?.length ?? 0) > 0;
  const failed = remote.status === "failed" || (remote.status === "ready" && !ready);
  const count = remote.challenges?.length ?? 0;
  return {
    ...previous, title: remote.title, remoteId: remote.id, processingMethod: "ai",
    status: ready ? "ready" : failed ? "failed" : "processing",
    progress: remote.progress, concepts: [], challenges: ready ? remote.challenges! : [],
    message: ready ? `${count} ${count === 1 ? "question" : "questions"} from your notes, each checked against the passage it came from.`
      : failed ? AI_ERRORS[remote.error as MaterialErrorCode] ?? AI_ERRORS.processing_failed
      : "Goomi is preparing questions from your notes. You can close this; it keeps going.",
  };
}

/** How many concepts a ready material teaches: extracted definitions on-device, distinct question concepts for AI study. */
export function conceptCount(material: Pick<StudyMaterial, "status" | "processingMethod" | "concepts" | "challenges">): number {
  if (material.status !== "ready") return 0;
  return material.processingMethod === "ai" ? new Set(material.challenges.map((challenge) => challenge.conceptId)).size : material.concepts.length;
}

/** The server no longer has it (deleted elsewhere, or an upload abandoned for a day): settle instead of polling forever. */
export const goneMaterial = (previous: StudyMaterial): StudyMaterial =>
  ({ ...previous, status: "failed", challenges: [], message: AI_ERRORS.gone });

/** The steps the user sees while a material is prepared; server stages map onto them in order. */
export const STUDY_PHASES = ["Reading your notes", "Finding the key ideas", "Writing questions", "Checking them against your notes"] as const;

/** Which of STUDY_PHASES the server's stage is in (0 before the pipeline starts). */
export function studyPhase(progress?: Pick<MaterialProgress, "stage">): 0 | 1 | 2 | 3 {
  switch (progress?.stage) {
    case "extract": case "link": return 1;
    case "generate": return 2;
    case "judge": case "publish": return 3;
    default: return 0;
  }
}

const AI_ERRORS: Record<MaterialErrorCode | "gone", string> = {
  no_questions: "Goomi couldn’t find enough to ask about in this one. Notes with explanations and definitions work best.",
  processing_failed: "Something went wrong while preparing this one. Nothing else was affected. Try again later.",
  "quota.spend": "You’ve reached this month’s AI study allowance. Your other materials still work.",
  gone: "Goomi’s server no longer has this one, so it couldn’t be finished. Add it again to try once more.",
};
