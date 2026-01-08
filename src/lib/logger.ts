import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { WriteStream } from 'fs';

export interface LoggerOptions {
  runsDir?: string;
  filename?: string;
}

export class JsonlLogger {
  private stream: WriteStream | null = null;
  private filepath: string;
  private closed: boolean = false;

  constructor(options: LoggerOptions = {}) {
    const runsDir = options.runsDir ?? './runs';

    if (options.filename && (options.filename.includes('/') || options.filename.includes('\\'))) {
      this.filepath = options.filename;
      this.ensureDirectory(dirname(options.filename));
    } else {
      const filename = options.filename ?? this.generateFilename();
      this.filepath = join(runsDir, filename);
      this.ensureDirectory(runsDir);
    }

    this.stream = createWriteStream(this.filepath, { flags: 'a' });
  }

  private generateFilename(): string {
    const now = new Date();
    const iso = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
    return `${iso}.jsonl`;
  }

  private ensureDirectory(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  log(line: string): void {
    if (this.closed || !this.stream) return;
    this.stream.write(line + '\n');
  }

  logObject(obj: unknown): void {
    if (this.closed || !this.stream) return;
    try {
      const json = JSON.stringify(obj);
      this.stream.write(json + '\n');
    } catch {
      // Silently ignore serialization errors
    }
  }

  getFilepath(): string {
    return this.filepath;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.closed || !this.stream) {
        resolve();
        return;
      }
      this.closed = true;
      this.stream.end(() => {
        this.stream = null;
        resolve();
      });
    });
  }

  isClosed(): boolean {
    return this.closed;
  }
}

export function createLogger(options?: LoggerOptions): JsonlLogger {
  return new JsonlLogger(options);
}
