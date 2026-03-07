import { eq } from 'drizzle-orm';
import type { ModelProvider } from '@hotui/providers';
import { fetchJobPage } from './fetcher';
import { extractJobMetadata } from './extractor';
import type { JobMetadata } from './extractor';
import { jobPostings } from './db/schema';
import type { JobPosting, NewJobPosting } from './db/schema';
import type { JobsDatabase } from './db';
import { createDatabase } from './db';

export type { JobMetadata } from './extractor';
export type { JobPosting, NewJobPosting } from './db/schema';
export type { JobsDatabase } from './db';
export { createDatabase } from './db';
export { fetchJobPage } from './fetcher';
export { extractJobMetadata } from './extractor';
export { jobPostings } from './db/schema';

export interface ParseAndSaveOptions {
  url: string;
  provider: ModelProvider;
  model: string;
  db: JobsDatabase;
  /** If true, update existing record when source_url already exists. Default: true. */
  upsert?: boolean;
  /** Called with status messages during processing. */
  onProgress?: (message: string) => void;
}

/**
 * Fetches a job posting URL, extracts metadata using an LLM, and saves to the database.
 * Returns the saved (or existing) JobPosting record.
 */
export async function parseAndSaveJob(options: ParseAndSaveOptions): Promise<JobPosting> {
  const { url, provider, model, db, upsert = true, onProgress } = options;

  // 1. Check for existing record
  onProgress?.('Checking for existing record…');
  const existing = await db
    .select()
    .from(jobPostings)
    .where(eq(jobPostings.sourceUrl, url))
    .limit(1);

  if (existing.length > 0 && !upsert) {
    onProgress?.('Job already exists in database (skipping).');
    return existing[0];
  }

  // 2. Fetch the page
  onProgress?.(`Fetching ${url}…`);
  const { html, cleanedText } = await fetchJobPage(url);

  // 3. Extract metadata via LLM
  onProgress?.('Extracting job metadata with LLM…');
  const metadata: JobMetadata = await extractJobMetadata(cleanedText, provider, model);

  // 4. Insert or update
  const record: NewJobPosting = {
    title: metadata.title,
    company: metadata.company,
    location: metadata.location,
    description: metadata.description,
    salary: metadata.salary,
    externalJobId: metadata.externalJobId,
    requirements: metadata.requirements,
    postedDate: metadata.postedDate,
    applicationUrl: metadata.applicationUrl,
    sourceUrl: url,
    rawHtml: html,
    updatedAt: new Date(),
  };

  if (existing.length > 0 && upsert) {
    onProgress?.('Updating existing record…');
    const updated = await db
      .update(jobPostings)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(jobPostings.sourceUrl, url))
      .returning();
    onProgress?.('Job posting updated successfully.');
    return updated[0];
  }

  onProgress?.('Saving to database…');
  const inserted = await db.insert(jobPostings).values(record).returning();
  onProgress?.('Job posting saved successfully.');
  return inserted[0];
}
