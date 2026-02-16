import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { CoreEvent, SessionUsageTotals } from './events';
import { Redactor } from './utils/redact';

export interface SessionStoreOptions {
  directory: string;
  sessionId?: string;
  redactor?: Redactor;
}

export class SessionStore {
  readonly filePath: string;
  readonly sessionId: string;
  private readonly directoryReady: Promise<void>;
  private readonly redactor: Redactor;

  constructor(options: SessionStoreOptions) {
    this.sessionId = (options.sessionId ?? new Date().toISOString()).replace(/[:.]/g, '-');
    this.filePath = path.join(options.directory, `${this.sessionId}.jsonl`);
    this.directoryReady = fs
      .mkdir(options.directory, { recursive: true })
      .then(() => undefined);
    this.redactor = options.redactor ?? new Redactor();
  }

  async append(event: CoreEvent): Promise<void> {
    await this.directoryReady;
    const safeEvent = this.redactor.redactObject(event);
    const line = `${JSON.stringify(safeEvent)}\n`;
    await fs.appendFile(this.filePath, line, 'utf8');
  }

  async *replay(): AsyncIterable<CoreEvent> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        yield JSON.parse(line) as CoreEvent;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }

      throw error;
    }
  }

  async computeUsageTotals(): Promise<SessionUsageTotals> {
    let totals: SessionUsageTotals = { inputTokens: 0, outputTokens: 0, turns: 0 };
    for await (const event of this.replay()) {
      if (event.type === 'session_usage') {
        totals = { ...event.totals };
      }
    }
    return totals;
  }
}
