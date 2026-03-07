import type { ModelProvider, ProviderChatRequest } from '@hotui/providers';

/** Structured job metadata extracted by the LLM. */
export interface JobMetadata {
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  salary: string | null;
  externalJobId: string | null;
  requirements: string | null;
  postedDate: string | null;
  applicationUrl: string | null;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a precise job posting metadata extractor. Given the text content of a job posting web page, extract structured metadata and return ONLY a valid JSON object with no additional text, markdown, or explanation.

Return exactly this JSON shape (use null for fields that cannot be determined):
{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location (city, state, remote, etc.)",
  "description": "Full job description text",
  "salary": "Salary or compensation range if mentioned",
  "externalJobId": "Job ID/reference number if visible on the page",
  "requirements": "Qualifications, requirements, and skills needed",
  "postedDate": "Date the job was posted if available",
  "applicationUrl": "Direct application URL if different from the page URL"
}

Rules:
- Return ONLY the JSON object. No markdown code fences, no explanation.
- Use null (not empty string) for fields that are not found.
- For "description", include the full job description text, not just a summary.
- For "requirements", combine all listed qualifications, skills, education, and experience requirements.
- For "postedDate", normalize to ISO date format (YYYY-MM-DD) if possible.`;

/**
 * Uses an LLM provider to extract structured job metadata from page text.
 */
export async function extractJobMetadata(
  pageText: string,
  provider: ModelProvider,
  model: string,
): Promise<JobMetadata> {
  const request: ProviderChatRequest = {
    model,
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `Extract job metadata from this page content:\n\n${pageText}` },
    ],
    temperature: 0,
  };

  let fullMessage = '';

  for await (const event of provider.streamChat(request)) {
    if (event.type === 'assistant_token_delta') {
      fullMessage += event.token;
    }
    if (event.type === 'assistant_message_end') {
      fullMessage = event.message;
    }
    if (event.type === 'error') {
      throw new Error(`Provider error during extraction: ${event.error.message}`);
    }
  }

  // Strip markdown code fences if the LLM wraps them despite instructions
  let jsonStr = fullMessage.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr) as JobMetadata;
    return {
      title: parsed.title ?? null,
      company: parsed.company ?? null,
      location: parsed.location ?? null,
      description: parsed.description ?? null,
      salary: parsed.salary ?? null,
      externalJobId: parsed.externalJobId ?? null,
      requirements: parsed.requirements ?? null,
      postedDate: parsed.postedDate ?? null,
      applicationUrl: parsed.applicationUrl ?? null,
    };
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON. Response:\n${fullMessage.slice(0, 500)}`,
    );
  }
}
