"use server";

import { db, variables, sections, faqs } from "./index";
import { eq, asc } from "drizzle-orm";
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

export async function createSection(name: string) {
  const allSections = await getSections();
  const result = await db
    .insert(sections)
    .values({ name, order: allSections.length })
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
  return db.select().from(faqs);
}

export async function getFaqsBySection(sectionId: string) {
  return db.select().from(faqs).where(eq(faqs.sectionId, sectionId));
}

export async function createFaq(
  sectionId: string,
  question: string,
  answer: string,
  notes: string
) {
  const result = await db
    .insert(faqs)
    .values({ sectionId, question, answer, notes })
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

// Export helper - get all data
export async function getAllData() {
  const [vars, sects, faqList] = await Promise.all([
    getVariables(),
    getSections(),
    getFaqs(),
  ]);
  return { variables: vars, sections: sects, faqs: faqList };
}
