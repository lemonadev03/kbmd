"use server";

import {
  db,
  variables,
  sections,
  faqs,
  customRules,
  customRulesHistory,
  phaseGroups,
  exportConfigs,
  userSettings,
  user,
} from "./index";
import { and, eq, asc, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireOrgContext } from "@/lib/org";
import type { ExportConfigPayload } from "@/types/export-config";

export async function getOrganizationBySlug(orgSlug: string) {
  const ctx = await requireOrgContext(orgSlug);
  await db
    .insert(userSettings)
    .values({ userId: ctx.userId, lastOrgId: ctx.orgId })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { lastOrgId: ctx.orgId, updatedAt: new Date() },
    });
  return {
    id: ctx.orgId,
    name: ctx.orgName,
    slug: ctx.orgSlug,
    role: ctx.role,
  };
}

// Variable actions
export async function getVariables(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db.select().from(variables).where(eq(variables.orgId, orgId));
}

export async function createVariable(
  orgSlug: string,
  key: string,
  value: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .insert(variables)
    .values({ orgId, key, value })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function updateVariable(
  orgSlug: string,
  id: string,
  key: string,
  value: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(variables)
    .set({ key, value })
    .where(and(eq(variables.id, id), eq(variables.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function deleteVariable(orgSlug: string, id: string) {
  const { orgId } = await requireAdmin(orgSlug);
  await db
    .delete(variables)
    .where(and(eq(variables.id, id), eq(variables.orgId, orgId)));
  revalidatePath(`/org/${orgSlug}`);
}

// Section actions
export async function getSections(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db
    .select()
    .from(sections)
    .where(eq(sections.orgId, orgId))
    .orderBy(asc(sections.order));
}

export async function reorderSections(
  orgSlug: string,
  params: { orderedIds: string[] }
) {
  const { orgId } = await requireAdmin(orgSlug);
  const { orderedIds } = params;
  if (orderedIds.length === 0) return;

  // neon-http driver doesn't support transactions; use a single atomic UPDATE.
  const existing = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.orgId, orgId));
  const existingIds = new Set(existing.map((r) => r.id));

  const filteredOrdered = orderedIds.filter((id) => existingIds.has(id));
  const missing = existing
    .map((r) => r.id)
    .filter((id) => !filteredOrdered.includes(id));

  const finalOrderedIds = [...filteredOrdered, ...missing];
  if (finalOrderedIds.length === 0) return;

  // In Postgres UPDATE, SET targets can't be qualified (e.g. "sections"."order").
  await db.execute(sql`
    UPDATE ${sections}
    SET "order" = CASE "id"
      ${sql.join(
        finalOrderedIds.map((id, index) => sql`WHEN ${id}::uuid THEN ${index}`),
        sql` `
      )}
      ELSE "order"
    END
    WHERE ${inArray(sections.id, finalOrderedIds)}
    AND "org_id" = ${orgId}::uuid
  `);

  revalidatePath(`/org/${orgSlug}`);
}

export async function createSection(orgSlug: string, name: string) {
  const { orgId } = await requireAdmin(orgSlug);
  const allSections = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.orgId, orgId));
  const result = await db
    .insert(sections)
    .values({ orgId, name, order: allSections.length })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function createSectionInGroup(
  orgSlug: string,
  groupId: string,
  name: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const group = await db
    .select({ id: phaseGroups.id })
    .from(phaseGroups)
    .where(and(eq(phaseGroups.id, groupId), eq(phaseGroups.orgId, orgId)))
    .limit(1);
  if (!group[0]) {
    throw new Error("Invalid phase group");
  }

  const allSections = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.orgId, orgId));
  const sectionsInGroup = await db
    .select({ phaseOrder: sections.phaseOrder })
    .from(sections)
    .where(
      and(eq(sections.phaseGroupId, groupId), eq(sections.orgId, orgId))
    );
  const maxOrder = Math.max(-1, ...sectionsInGroup.map((s) => s.phaseOrder ?? 0));

  const result = await db
    .insert(sections)
    .values({
      orgId,
      name,
      order: allSections.length,
      phaseGroupId: groupId,
      phaseOrder: maxOrder + 1,
    })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function updateSection(
  orgSlug: string,
  id: string,
  name: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(sections)
    .set({ name })
    .where(and(eq(sections.id, id), eq(sections.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function deleteSection(orgSlug: string, id: string) {
  const { orgId } = await requireAdmin(orgSlug);
  await db
    .delete(sections)
    .where(and(eq(sections.id, id), eq(sections.orgId, orgId)));
  revalidatePath(`/org/${orgSlug}`);
}

// FAQ actions
export async function getFaqs(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db
    .select()
    .from(faqs)
    .where(eq(faqs.orgId, orgId))
    .orderBy(asc(faqs.sectionId), asc(faqs.order), asc(faqs.createdAt));
}

export async function getFaqsBySection(orgSlug: string, sectionId: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db
    .select()
    .from(faqs)
    .where(and(eq(faqs.sectionId, sectionId), eq(faqs.orgId, orgId)))
    .orderBy(asc(faqs.order), asc(faqs.createdAt));
}

export async function createFaq(
  orgSlug: string,
  sectionId: string,
  question: string,
  answer: string,
  notes: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const section = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.orgId, orgId)))
    .limit(1);
  if (!section[0]) {
    throw new Error("Invalid section");
  }

  const rows = await db
    .select({ maxOrder: sql<number | null>`max(${faqs.order})` })
    .from(faqs)
    .where(and(eq(faqs.sectionId, sectionId), eq(faqs.orgId, orgId)));
  const nextOrder = (rows[0]?.maxOrder ?? -1) + 1;

  const result = await db
    .insert(faqs)
    .values({ orgId, sectionId, question, answer, notes, order: nextOrder })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function updateFaq(
  orgSlug: string,
  id: string,
  question: string,
  answer: string,
  notes: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(faqs)
    .set({ question, answer, notes, updatedAt: new Date() })
    .where(and(eq(faqs.id, id), eq(faqs.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function deleteFaq(orgSlug: string, id: string) {
  const { orgId } = await requireAdmin(orgSlug);
  await db
    .delete(faqs)
    .where(and(eq(faqs.id, id), eq(faqs.orgId, orgId)));
  revalidatePath(`/org/${orgSlug}`);
}

type FaqUpsertInput = {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
};

export async function applyFaqBatch(
  orgSlug: string,
  params: { upserts: FaqUpsertInput[]; deletes: string[] }
) {
  const { orgId } = await requireAdmin(orgSlug);
  const { upserts, deletes } = params;

  if (upserts.length === 0 && deletes.length === 0) {
    return { upserted: 0, deleted: 0 };
  }

  if (upserts.length > 0) {
    const sectionIds = Array.from(
      new Set(upserts.map((u) => u.sectionId))
    ).filter(Boolean);
    if (sectionIds.length > 0) {
      const validSections = await db
        .select({ id: sections.id })
        .from(sections)
        .where(
          and(eq(sections.orgId, orgId), inArray(sections.id, sectionIds))
        );
      if (validSections.length !== sectionIds.length) {
        throw new Error("Invalid section");
      }
    }
  }

  if (upserts.length > 0) {
    await db
      .insert(faqs)
      .values(
        upserts.map((f) => ({
          id: f.id,
          orgId,
          sectionId: f.sectionId,
          question: f.question,
          answer: f.answer,
          notes: f.notes,
          order: f.order,
        }))
      )
      .onConflictDoUpdate({
        target: faqs.id,
        set: {
          sectionId: sql`excluded.section_id`,
          question: sql`excluded.question`,
          answer: sql`excluded.answer`,
          notes: sql`excluded.notes`,
          order: sql`excluded.order`,
          updatedAt: new Date(),
        },
      });
  }

  if (deletes.length > 0) {
    await db
      .delete(faqs)
      .where(and(eq(faqs.orgId, orgId), inArray(faqs.id, deletes)));
  }

  revalidatePath(`/org/${orgSlug}`);
  return { upserted: upserts.length, deleted: deletes.length };
}

// Export helper - get all data
export async function getAllData(orgSlug: string) {
  const [vars, sects, faqList] = await Promise.all([
    getVariables(orgSlug),
    getSections(orgSlug),
    getFaqs(orgSlug),
  ]);
  return { variables: vars, sections: sects, faqs: faqList };
}

// Custom Rules actions
export async function getCustomRules(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  const rows = await db
    .select()
    .from(customRules)
    .where(eq(customRules.orgId, orgId))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveCustomRules(orgSlug: string, content: string) {
  const { orgId, userId } = await requireAdmin(orgSlug);
  const existing = await getCustomRules(orgSlug);

  // Insert history record before updating (only if there's existing content)
  if (existing && existing.content) {
    try {
      await db.insert(customRulesHistory).values({
        orgId,
        content: existing.content,
        createdBy: userId,
      });
    } catch (error) {
      // Table may not exist yet (migration not run) - continue without history
      const pgError = error as { code?: string };
      if (pgError.code !== "42P01") {
        throw error;
      }
    }
  }

  if (existing) {
    const result = await db
      .update(customRules)
      .set({ content, updatedAt: new Date() })
      .where(
        and(eq(customRules.id, existing.id), eq(customRules.orgId, orgId))
      )
      .returning();
    revalidatePath(`/org/${orgSlug}`);
    return result[0];
  } else {
    const result = await db
      .insert(customRules)
      .values({ orgId, content })
      .returning();
    revalidatePath(`/org/${orgSlug}`);
    return result[0];
  }
}

export async function getCustomRulesHistory(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  try {
    const rows = await db
      .select({
        id: customRulesHistory.id,
        content: customRulesHistory.content,
        createdAt: customRulesHistory.createdAt,
        createdBy: customRulesHistory.createdBy,
        authorName: user.name,
      })
      .from(customRulesHistory)
      .leftJoin(user, eq(customRulesHistory.createdBy, user.id))
      .where(eq(customRulesHistory.orgId, orgId))
      .orderBy(desc(customRulesHistory.createdAt));
    return rows;
  } catch (error) {
    // Table may not exist yet (migration not run)
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return [];
    }
    throw error;
  }
}

export async function restoreCustomRulesVersion(
  orgSlug: string,
  historyId: string
) {
  const { orgId } = await requireAdmin(orgSlug);

  // Get the history record
  try {
    const historyRecord = await db
      .select()
      .from(customRulesHistory)
      .where(
        and(
          eq(customRulesHistory.id, historyId),
          eq(customRulesHistory.orgId, orgId)
        )
      )
      .limit(1);

    if (!historyRecord[0]) {
      throw new Error("History record not found");
    }

    // Save the restored content (this will also create a history entry for the current content)
    return saveCustomRules(orgSlug, historyRecord[0].content);
  } catch (error) {
    // Table may not exist yet (migration not run)
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      throw new Error("History feature not available yet");
    }
    throw error;
  }
}

// Export Config actions
export async function getExportConfigs(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db
    .select()
    .from(exportConfigs)
    .where(eq(exportConfigs.orgId, orgId))
    .orderBy(asc(exportConfigs.name));
}

export async function createExportConfig(
  orgSlug: string,
  name: string,
  config: ExportConfigPayload
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .insert(exportConfigs)
    .values({ orgId, name, config })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function updateExportConfig(
  orgSlug: string,
  id: string,
  name: string,
  config: ExportConfigPayload
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(exportConfigs)
    .set({ name, config, updatedAt: new Date() })
    .where(and(eq(exportConfigs.id, id), eq(exportConfigs.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function deleteExportConfig(orgSlug: string, id: string) {
  const { orgId } = await requireAdmin(orgSlug);
  await db
    .delete(exportConfigs)
    .where(and(eq(exportConfigs.id, id), eq(exportConfigs.orgId, orgId)));
  revalidatePath(`/org/${orgSlug}`);
}

// Phase Group actions
export async function getPhaseGroups(orgSlug: string) {
  const { orgId } = await requireOrgContext(orgSlug);
  return db
    .select()
    .from(phaseGroups)
    .where(eq(phaseGroups.orgId, orgId))
    .orderBy(asc(phaseGroups.order));
}

export async function createPhaseGroup(orgSlug: string, name: string) {
  const { orgId } = await requireAdmin(orgSlug);
  const allGroups = await db
    .select({ id: phaseGroups.id })
    .from(phaseGroups)
    .where(eq(phaseGroups.orgId, orgId));
  const result = await db
    .insert(phaseGroups)
    .values({ orgId, name, order: allGroups.length })
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function updatePhaseGroup(
  orgSlug: string,
  id: string,
  name: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(phaseGroups)
    .set({ name })
    .where(and(eq(phaseGroups.id, id), eq(phaseGroups.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function deletePhaseGroup(orgSlug: string, id: string) {
  const { orgId } = await requireAdmin(orgSlug);
  await db
    .delete(phaseGroups)
    .where(and(eq(phaseGroups.id, id), eq(phaseGroups.orgId, orgId)));
  revalidatePath(`/org/${orgSlug}`);
}

export async function reorderPhaseGroups(
  orgSlug: string,
  params: { orderedIds: string[] }
) {
  const { orgId } = await requireAdmin(orgSlug);
  const { orderedIds } = params;
  if (orderedIds.length === 0) return;

  const existing = await db
    .select({ id: phaseGroups.id })
    .from(phaseGroups)
    .where(eq(phaseGroups.orgId, orgId));
  const existingIds = new Set(existing.map((r) => r.id));

  const filteredOrdered = orderedIds.filter((id) => existingIds.has(id));
  const missing = existing
    .map((r) => r.id)
    .filter((id) => !filteredOrdered.includes(id));

  const finalOrderedIds = [...filteredOrdered, ...missing];
  if (finalOrderedIds.length === 0) return;

  await db.execute(sql`
    UPDATE ${phaseGroups}
    SET "order" = CASE "id"
      ${sql.join(
        finalOrderedIds.map((id, index) => sql`WHEN ${id}::uuid THEN ${index}`),
        sql` `
      )}
      ELSE "order"
    END
    WHERE ${inArray(phaseGroups.id, finalOrderedIds)}
    AND "org_id" = ${orgId}::uuid
  `);

  revalidatePath(`/org/${orgSlug}`);
}

export async function addSectionToGroup(
  orgSlug: string,
  sectionId: string,
  groupId: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const group = await db
    .select({ id: phaseGroups.id })
    .from(phaseGroups)
    .where(and(eq(phaseGroups.id, groupId), eq(phaseGroups.orgId, orgId)))
    .limit(1);
  if (!group[0]) {
    throw new Error("Invalid phase group");
  }

  const section = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.orgId, orgId)))
    .limit(1);
  if (!section[0]) {
    throw new Error("Invalid section");
  }

  // Get max phaseOrder in group
  const sectionsInGroup = await db
    .select()
    .from(sections)
    .where(
      and(eq(sections.phaseGroupId, groupId), eq(sections.orgId, orgId))
    );
  const maxOrder = Math.max(-1, ...sectionsInGroup.map((s) => s.phaseOrder ?? 0));

  const result = await db
    .update(sections)
    .set({ phaseGroupId: groupId, phaseOrder: maxOrder + 1 })
    .where(and(eq(sections.id, sectionId), eq(sections.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function removeSectionFromGroup(
  orgSlug: string,
  sectionId: string
) {
  const { orgId } = await requireAdmin(orgSlug);
  const result = await db
    .update(sections)
    .set({ phaseGroupId: null, phaseOrder: 0 })
    .where(and(eq(sections.id, sectionId), eq(sections.orgId, orgId)))
    .returning();
  revalidatePath(`/org/${orgSlug}`);
  return result[0];
}

export async function reorderSectionsInGroup(
  orgSlug: string,
  params: { groupId: string; orderedSectionIds: string[] }
) {
  const { orgId } = await requireAdmin(orgSlug);
  const { groupId, orderedSectionIds } = params;
  if (orderedSectionIds.length === 0) return;

  await db.execute(sql`
    UPDATE ${sections}
    SET "phase_order" = CASE "id"
      ${sql.join(
        orderedSectionIds.map((id, index) => sql`WHEN ${id}::uuid THEN ${index}`),
        sql` `
      )}
      ELSE "phase_order"
    END
    WHERE ${inArray(sections.id, orderedSectionIds)}
    AND "phase_group_id" = ${groupId}::uuid
    AND "org_id" = ${orgId}::uuid
  `);

  revalidatePath(`/org/${orgSlug}`);
}
