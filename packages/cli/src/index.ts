#!/usr/bin/env node
import 'dotenv/config';
import { AnthropicProvider, EnvSecretStore, ModelProvider, MockProvider, OpenAIProvider } from '@hotui/providers';
import {
  AgentRuntime,
  CoreEvent,
  EventBus,
  loadAgentConfig,
  Redactor,
  resolveProfile,
  SessionStore,
  SessionUsageTotals,
} from '@hotui/core';
import { renderApp } from '@hotui/tui';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

interface RunCommandOptions {
  profileName?: string;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === 'run') {
    await runCommand(rest);
    return;
  }

  // `hotui tui`, `hotui --profile=claude`, or just `hotui` → launch interactive TUI
  if (command === 'tui') {
    await launchTui(rest);
    return;
  }

  // No command or unknown flags → default to TUI
  const allArgs = command ? [command, ...rest] : rest;
  await launchTui(allArgs);
}

async function runCommand(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const prompt = await readPrompt(args);
  if (!prompt) {
    console.error('A prompt is required. Provide it as an argument or via stdin.');
    process.exit(1);
  }

  const config = await loadAgentConfig();
  const profile = resolveProfile(config, options.profileName);
  const provider = createProvider(profile.provider);
  const secrets = await loadKnownSecrets(profile.provider);
  const redactor = new Redactor(secrets);

  const sessionDirectory = path.join(process.cwd(), '.hotui', 'sessions');
  const sessionStore = new SessionStore({ directory: sessionDirectory, redactor });
  const eventBus = new EventBus();
  const runtime = new AgentRuntime({
    provider,
    sessionStore,
    eventBus,
    defaultModel: profile.model,
  });

  await runWithStreaming(runtime, prompt, profile.model);
  console.error(`\nSession persisted to ${sessionStore.filePath}`);
}

async function launchTui(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const config = await loadAgentConfig();
  const profile = resolveProfile(config, options.profileName);
  const provider = createProvider(profile.provider);
  const secrets = await loadKnownSecrets(profile.provider);
  const redactor = new Redactor(secrets);

  const sessionDirectory = path.join(process.cwd(), '.hotui', 'sessions');
  const sessionStore = new SessionStore({ directory: sessionDirectory, redactor });
  const eventBus = new EventBus();
  const runtime = new AgentRuntime({
    provider,
    sessionStore,
    eventBus,
    defaultModel: profile.model,
  });

  const profileName = options.profileName ?? config.defaultProfile;

  // Build the available models list from config profiles
  const availableModels = Object.entries(config.profiles).map(([name, p]) => ({
    profileName: name,
    provider: p.provider,
    model: p.model,
    description: p.description,
  }));

  // Factory: create a new runtime when the user switches models via /model
  const onSwitchModel = (
    targetProfile: string,
    usageTotals: SessionUsageTotals,
  ): AgentRuntime | undefined => {
    const newProfile = config.profiles[targetProfile];
    if (!newProfile) return undefined;

    try {
      const newProvider = createProvider(newProfile.provider);
      const newEventBus = new EventBus();
      return new AgentRuntime({
        provider: newProvider,
        sessionStore,
        eventBus: newEventBus,
        defaultModel: newProfile.model,
        initialUsageTotals: usageTotals,
      });
    } catch {
      return undefined;
    }
  };

  await renderApp({
    runtime,
    activeProvider: profile.provider,
    activeModel: profile.model,
    sessionId: sessionStore.sessionId,
    profileName,
    availableModels,
    onSwitchModel,
  });
}

function parseOptions(args: string[]): RunCommandOptions {
  const options: RunCommandOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--profile=')) {
      options.profileName = arg.split('=')[1];
      continue;
    }

    if (arg === '--profile' && args[index + 1]) {
      options.profileName = args[index + 1];
      index += 1;
    }
  }

  return options;
}

async function readPrompt(args: string[]): Promise<string> {
  const promptParts = collectPromptParts(args);
  if (promptParts.length > 0) {
    return promptParts.join(' ').trim();
  }

  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk.toString();
      });

      process.stdin.on('end', () => {
        resolve(data.trim());
      });
    });
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('Prompt: ');
  rl.close();
  return answer.trim();
}

function collectPromptParts(args: string[]): string[] {
  const promptParts: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--profile=')) {
      continue;
    }

    if (arg === '--profile') {
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      continue;
    }

    promptParts.push(arg);
  }

  return promptParts;
}

function createProvider(providerId: string): ModelProvider {
  switch (providerId) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Error: ANTHROPIC_API_KEY is not set.');
        console.error('Set it in your .env file or export it as an environment variable.');
        process.exit(1);
      }
      return new AnthropicProvider(apiKey);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Error: OPENAI_API_KEY is not set.');
        console.error('Set it in your .env file or export it as an environment variable.');
        process.exit(1);
      }
      return new OpenAIProvider(apiKey);
    }
    case 'mock':
    default:
      return new MockProvider();
  }
}

async function loadKnownSecrets(providerId: string): Promise<string[]> {
  const envSecrets = new EnvSecretStore(providerId);
  const keys = ['api_key', 'auth_token'];
  const values: string[] = [];

  for (const key of keys) {
    const value = await envSecrets.getSecret(key);
    if (value) {
      values.push(value);
    }
  }

  return values;
}

async function runWithStreaming(runtime: AgentRuntime, prompt: string, model: string): Promise<void> {
  const subscription = runtime.events.subscribe();
  const printer = printEvents(subscription);
  await runtime.run(prompt, { model });
  runtime.events.complete();
  await printer;
}

async function printEvents(events: AsyncIterable<CoreEvent>): Promise<void> {
  let lastSessionTotals: SessionUsageTotals | undefined;
  for await (const event of events) {
    switch (event.type) {
      case 'assistant_token_delta':
        process.stdout.write(event.token);
        break;
      case 'assistant_message_end':
        process.stdout.write('\n');
        break;
      case 'usage_update':
        console.error(
          `\nusage: input=${event.usage.inputTokens} output=${event.usage.outputTokens}`,
        );
        break;
      case 'session_usage': {
        lastSessionTotals = event.totals;
        const costPart =
          event.totals.cost != null ? ` cost=${event.totals.cost.toFixed(4)}` : '';
        console.error(
          `session totals: input=${event.totals.inputTokens} output=${event.totals.outputTokens} turns=${event.totals.turns}${costPart}`,
        );
        break;
      }
      case 'runtime_error':
        console.error(`Runtime error: ${event.message}`);
        break;
      default:
        break;
    }
  }

  if (lastSessionTotals) {
    const costPart =
      lastSessionTotals.cost != null ? ` cost=${lastSessionTotals.cost.toFixed(4)}` : '';
    console.error(
      `\nFinal session totals: input=${lastSessionTotals.inputTokens} output=${lastSessionTotals.outputTokens} turns=${lastSessionTotals.turns}${costPart}`,
    );
  }
}

function printUsage(): void {
  console.log('Usage:');
  console.log('  hotui run [prompt] [--profile=name]   Run a single prompt');
  console.log('  hotui tui [--profile=name]            Launch interactive TUI');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
