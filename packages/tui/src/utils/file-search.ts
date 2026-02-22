import * as fs from 'fs';
import * as path from 'path';

const MAX_CHARS = 40_000;
const MAX_LINES_SMALL = 300;
const MAX_LINES_TAIL = 50;

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.hotui', 'coverage']);

export function listFiles(cwd: string): string[] {
  const results: string[] = [];

  function walk(dir: string, depth: number): void {
    if (depth > 6 || results.length >= 2000) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= 2000) return;
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          walk(path.join(dir, entry.name), depth + 1);
        }
      } else if (entry.isFile()) {
        results.push(path.relative(cwd, path.join(dir, entry.name)));
      }
    }
  }

  walk(cwd, 0);
  return results;
}

export function filterFiles(files: string[], filter: string): string[] {
  if (!filter) return files.slice(0, 50);
  const lower = filter.toLowerCase();
  return files
    .filter((f) => path.basename(f).toLowerCase().includes(lower))
    .slice(0, 50);
}

function buildFileBlock(
  relPath: string,
  content: string,
  truncated: boolean,
  totalLines: number,
  headEnd: number,
  tailStart: number,
): string {
  const linesAttr = truncated
    ? `lines="1-${headEnd} + ${tailStart}-${totalLines} of ${totalLines} (truncated)"`
    : `lines="1-${totalLines}"`;
  return `<file path="${relPath}" ${linesAttr}>\n${content}\n</file>`;
}

export function readFileAttachment(absPath: string, relPath: string): string {
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch {
    return `<file path="${relPath}" error="could not read file" />`;
  }

  if (raw.length <= MAX_CHARS) {
    const lines = raw.split('\n');
    return buildFileBlock(relPath, raw, false, lines.length, lines.length, lines.length);
  }

  const lines = raw.split('\n');
  const totalLines = lines.length;
  const headLines = lines.slice(0, MAX_LINES_SMALL);
  const tailLines = lines.slice(Math.max(0, totalLines - MAX_LINES_TAIL));
  const omitted = totalLines - MAX_LINES_SMALL - MAX_LINES_TAIL;
  const tailStart = totalLines - tailLines.length + 1;

  const content =
    headLines.join('\n') +
    `\n[... ${omitted} lines omitted — file too large for full context ...]\n` +
    tailLines.join('\n');

  return buildFileBlock(relPath, content, true, totalLines, MAX_LINES_SMALL, tailStart);
}
