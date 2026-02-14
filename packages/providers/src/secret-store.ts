export interface SecretStore {
  getSecret(key: string): Promise<string | undefined>;
}

export class EnvSecretStore implements SecretStore {
  constructor(private readonly prefix?: string) {}

  async getSecret(key: string): Promise<string | undefined> {
    const normalizedKey = this.prefix ? `${this.prefix}_${key}` : key;
    const resolvedKey = normalizedKey.toUpperCase();
    return process.env[resolvedKey];
  }
}

export class KeychainSecretStore implements SecretStore {
  // The implementation will integrate with the system keychain later.
  async getSecret(_key: string): Promise<string | undefined> {
    throw new Error('KeychainSecretStore is not implemented yet.');
  }
}
