import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface AgentProfileConfig {
  provider: string;
  model: string;
  description?: string;
}

export interface AgentConfig {
  defaultProfile: string;
  profiles: Record<string, AgentProfileConfig>;
}

const CONFIG_DIRECTORY = path.join(os.homedir(), '.hotui');
export const CONFIG_PATH = path.join(CONFIG_DIRECTORY, 'config.json');

const DEFAULT_CONFIG: AgentConfig = {
  defaultProfile: 'claude',
  profiles: {
    mock: {
      provider: 'mock',
      model: 'mock-1',
      description: 'In-memory mock provider for local demos',
    },
    claude: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      description: 'Anthropic Claude Sonnet (default)',
    },
    openai: {
      provider: 'openai',
      model: 'gpt-4o',
      description: 'OpenAI GPT-4o',
    },
  },
};

export async function loadAgentConfig(configPath: string = CONFIG_PATH): Promise<AgentConfig> {
  try {
    const contents = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(contents) as AgentConfig;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_CONFIG;
    }

    throw error;
  }
}

export function resolveProfile(config: AgentConfig, profileName?: string): AgentProfileConfig {
  const name = profileName ?? config.defaultProfile;
  const profile = config.profiles[name];
  if (profile) {
    return profile;
  }

  return config.profiles[config.defaultProfile] ?? DEFAULT_CONFIG.profiles.mock;
}

export function getDefaultConfig(): AgentConfig {
  return DEFAULT_CONFIG;
}
