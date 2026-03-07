import { pgTable, uuid, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }),
  company: varchar('company', { length: 500 }),
  location: varchar('location', { length: 500 }),
  description: text('description'),
  salary: varchar('salary', { length: 300 }),
  externalJobId: varchar('external_job_id', { length: 300 }),
  requirements: text('requirements'),
  postedDate: varchar('posted_date', { length: 200 }),
  applicationUrl: text('application_url'),
  sourceUrl: text('source_url').notNull().unique(),
  rawHtml: text('raw_html'),
  active: integer('active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type JobPosting = typeof jobPostings.$inferSelect;
export type NewJobPosting = typeof jobPostings.$inferInsert;
