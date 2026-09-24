import type { Database } from "./index";

/**
 * Removes everything Goomi derived from a user's documents. Called when a user deletes their
 * account (Better Auth `user.deleteUser.beforeDelete`); materials cascade to pages, sections,
 * chunks, challenges and jobs. Cost records are kept for accounting but detached from the user.
 */
export async function purgeUserContent(db: Database, userId: string) {
  return db.$transaction([
    db.material.deleteMany({ where: { userId } }),
    db.concept.deleteMany({ where: { userId } }),
    db.job.deleteMany({ where: { userId } }),
    db.entitlement.deleteMany({ where: { userId } }),
    db.usageCounter.deleteMany({ where: { subject: userId } }),
    db.aiUsage.updateMany({ where: { userId }, data: { userId: null } }),
  ]);
}

/** Deletes one material and any concept left without a mention in the user's remaining notes. */
export async function deleteMaterial(db: Database, userId: string, materialId: string) {
  return db.$transaction(async (tx) => {
    const deleted = await tx.material.deleteMany({ where: { id: materialId, userId } });
    if (!deleted.count) return false;
    await tx.conceptMention.deleteMany({ where: { materialId } });
    await tx.concept.deleteMany({ where: { userId, mentions: { none: {} } } });
    return true;
  });
}
