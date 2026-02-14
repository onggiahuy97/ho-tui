export class Redactor {
  private readonly secrets: string[];

  constructor(secrets: string[] = []) {
    this.secrets = secrets.filter((secret) => Boolean(secret));
  }

  redactText(value: string): string {
    if (this.secrets.length === 0) {
      return value;
    }

    let result = value;
    for (const secret of this.secrets) {
      const pattern = new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(pattern, '[REDACTED]');
    }

    return result;
  }

  redactObject<T>(value: T): T {
    const serialized = JSON.stringify(value);
    const redacted = this.redactText(serialized);
    return JSON.parse(redacted) as T;
  }
}
