/**
 * Fetches a job posting page and returns cleaned HTML text suitable for LLM extraction.
 * Strips script, style, nav, header, footer, and SVG elements to reduce token cost.
 */
export async function fetchJobPage(url: string): Promise<{ html: string; cleanedText: string }> {
  const parsed = new URL(url); // throws on invalid URL
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are allowed.`);
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; HoTUI/0.1; +https://github.com/hotui)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const cleanedText = stripHtmlForExtraction(html);
  return { html, cleanedText };
}

/**
 * Strips non-content HTML elements and tags, returning plain text
 * suitable for sending to an LLM. Removes scripts, styles, nav, etc.
 */
function stripHtmlForExtraction(html: string): string {
  let text = html;

  // Remove script, style, nav, header, footer, svg, noscript blocks
  const blockTags = ['script', 'style', 'nav', 'header', 'footer', 'svg', 'noscript', 'iframe'];
  for (const tag of blockTags) {
    text = text.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), '');
    // Self-closing variants
    text = text.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove all remaining HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();

  // Truncate to ~50k chars to avoid blowing up LLM context
  const MAX_CHARS = 50_000;
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + '\n[...truncated]';
  }

  return text;
}
