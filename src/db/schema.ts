import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

export const variables = pgTable("variables", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  value: text("value").notNull().default(""),
});

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customRules = pgTable("custom_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
