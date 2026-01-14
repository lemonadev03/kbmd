"use server";

import { db, variables, sections, faqs, customRules, phaseGroups } from "./index";
import { eq, asc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Variable actions
export async function getVariables() {
  return db.select().from(variables);
}

export async function createVariable(key: string, value: string) {
  const result = await db.insert(variables).values({ key, value }).returning();
  revalidatePath("/");
  return result[0];
}

export async function updateVariable(id: string, key: string, value: string) {
  const result = await db
    .update(variables)
    .set({ key, value })
    .where(eq(variables.id, id))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function deleteVariable(id: string) {
  await db.delete(variables).where(eq(variables.id, id));
  revalidatePath("/");
}

// Section actions
export async function getSections() {
  return db.select().from(sections).orderBy(asc(sections.order));
}

export async function reorderSections(params: { orderedIds: string[] }) {
  const { orderedIds } = params;
  if (orderedIds.length === 0) return;

  // neon-http driver doesn't support transactions; use a single atomic UPDATE.
  const existing = await db.select({ id: sections.id }).from(sections);
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
  `);

  revalidatePath("/");
}

export async function createSection(name: string) {
  const allSections = await getSections();
  const result = await db
    .insert(sections)
    .values({ name, order: allSections.length })
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function createSectionInGroup(groupId: string, name: string) {
  const allSections = await getSections();
  const sectionsInGroup = await db
    .select({ phaseOrder: sections.phaseOrder })
    .from(sections)
    .where(eq(sections.phaseGroupId, groupId));
  const maxOrder = Math.max(-1, ...sectionsInGroup.map((s) => s.phaseOrder ?? 0));

  const result = await db
    .insert(sections)
    .values({
      name,
      order: allSections.length,
      phaseGroupId: groupId,
      phaseOrder: maxOrder + 1,
    })
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function updateSection(id: string, name: string) {
  const result = await db
    .update(sections)
    .set({ name })
    .where(eq(sections.id, id))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function deleteSection(id: string) {
  await db.delete(sections).where(eq(sections.id, id));
  revalidatePath("/");
}

// FAQ actions
export async function getFaqs() {
  return db
    .select()
    .from(faqs)
    .orderBy(asc(faqs.sectionId), asc(faqs.order), asc(faqs.createdAt));
}

export async function getFaqsBySection(sectionId: string) {
  return db
    .select()
    .from(faqs)
    .where(eq(faqs.sectionId, sectionId))
    .orderBy(asc(faqs.order), asc(faqs.createdAt));
}

export async function createFaq(
  sectionId: string,
  question: string,
  answer: string,
  notes: string
) {
  const rows = await db
    .select({ maxOrder: sql<number | null>`max(${faqs.order})` })
    .from(faqs)
    .where(eq(faqs.sectionId, sectionId));
  const nextOrder = (rows[0]?.maxOrder ?? -1) + 1;

  const result = await db
    .insert(faqs)
    .values({ sectionId, question, answer, notes, order: nextOrder })
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function updateFaq(
  id: string,
  question: string,
  answer: string,
  notes: string
) {
  const result = await db
    .update(faqs)
    .set({ question, answer, notes, updatedAt: new Date() })
    .where(eq(faqs.id, id))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function deleteFaq(id: string) {
  await db.delete(faqs).where(eq(faqs.id, id));
  revalidatePath("/");
}

type FaqUpsertInput = {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
};

export async function applyFaqBatch(params: {
  upserts: FaqUpsertInput[];
  deletes: string[];
}) {
  const { upserts, deletes } = params;

  if (upserts.length === 0 && deletes.length === 0) {
    return { upserted: 0, deleted: 0 };
  }

  if (upserts.length > 0) {
    await db
      .insert(faqs)
      .values(
        upserts.map((f) => ({
          id: f.id,
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
    await db.delete(faqs).where(inArray(faqs.id, deletes));
  }

  revalidatePath("/");
  return { upserted: upserts.length, deleted: deletes.length };
}

// Export helper - get all data
export async function getAllData() {
  const [vars, sects, faqList] = await Promise.all([
    getVariables(),
    getSections(),
    getFaqs(),
  ]);
  return { variables: vars, sections: sects, faqs: faqList };
}

// Custom Rules actions
export async function getCustomRules() {
  const rows = await db.select().from(customRules).limit(1);
  return rows[0] ?? null;
}

export async function saveCustomRules(content: string) {
  const existing = await getCustomRules();

  if (existing) {
    const result = await db
      .update(customRules)
      .set({ content, updatedAt: new Date() })
      .where(eq(customRules.id, existing.id))
      .returning();
    revalidatePath("/");
    return result[0];
  } else {
    const result = await db
      .insert(customRules)
      .values({ content })
      .returning();
    revalidatePath("/");
    return result[0];
  }
}

// Phase Group actions
export async function getPhaseGroups() {
  return db.select().from(phaseGroups).orderBy(asc(phaseGroups.order));
}

export async function createPhaseGroup(name: string) {
  const allGroups = await getPhaseGroups();
  const result = await db
    .insert(phaseGroups)
    .values({ name, order: allGroups.length })
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function updatePhaseGroup(id: string, name: string) {
  const result = await db
    .update(phaseGroups)
    .set({ name })
    .where(eq(phaseGroups.id, id))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function deletePhaseGroup(id: string) {
  await db.delete(phaseGroups).where(eq(phaseGroups.id, id));
  revalidatePath("/");
}

export async function reorderPhaseGroups(params: { orderedIds: string[] }) {
  const { orderedIds } = params;
  if (orderedIds.length === 0) return;

  const existing = await db.select({ id: phaseGroups.id }).from(phaseGroups);
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
  `);

  revalidatePath("/");
}

export async function addSectionToGroup(sectionId: string, groupId: string) {
  // Get max phaseOrder in group
  const sectionsInGroup = await db
    .select()
    .from(sections)
    .where(eq(sections.phaseGroupId, groupId));
  const maxOrder = Math.max(-1, ...sectionsInGroup.map((s) => s.phaseOrder ?? 0));

  const result = await db
    .update(sections)
    .set({ phaseGroupId: groupId, phaseOrder: maxOrder + 1 })
    .where(eq(sections.id, sectionId))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function removeSectionFromGroup(sectionId: string) {
  const result = await db
    .update(sections)
    .set({ phaseGroupId: null, phaseOrder: 0 })
    .where(eq(sections.id, sectionId))
    .returning();
  revalidatePath("/");
  return result[0];
}

export async function reorderSectionsInGroup(params: {
  groupId: string;
  orderedSectionIds: string[];
}) {
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
  `);

  revalidatePath("/");
}
