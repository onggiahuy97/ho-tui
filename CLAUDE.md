# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (tsc -b, respects project references)
pnpm test                 # Run all tests (vitest run)
pnpm lint                 # Type-check without emitting (tsc -b --noEmit)
npx vitest run packages/core/test/session-store.test.ts  # Run a single test file
```

## Architecture

This is a pnpm monorepo (`@hotui/*`) for an agentic terminal UI. There are no external runtime dependencies — only Node.js built-ins are used.

**Package dependency graph:** `providers` ← `core` ← `cli`

- **`@hotui/providers`** — Provider abstraction layer. Defines `ModelProvider` interface, `ProviderEvent` discriminated union (token deltas, tool calls, approvals, errors, etc.), `SecretStore` interface, and implementations (MockProvider streams tokenized text; OpenAI/Anthropic are stubs).
- **`@hotui/core`** — Runtime engine. `AgentRuntime` orchestrates provider streaming, `EventBus` (AsyncIterable with backpressure queue), `SessionStore` (JSONL append + replay), config loading from `~/.hotui/config.json`, and secret redaction.
- **`@hotui/cli`** — Executable entry point. Loads config/profile, creates runtime, subscribes to event bus, prints streamed tokens. Run with `pnpm exec hotui run "prompt" --profile=mock`.
- **`@hotui/tui`** — Placeholder for future terminal UI.

**Data flow:** CLI reads prompt → `runtime.run(prompt)` → publishes `user_message` → calls `provider.streamChat()` → provider yields `ProviderEvent`s → runtime publishes each to EventBus and SessionStore → CLI prints token deltas.

## TypeScript Setup

Uses composite project references (`tsc -b`) so packages build in dependency order. Strict mode is enabled. Each package emits declarations to its own `dist/` directory. The root `tsconfig.json` references all packages; `tsconfig.base.json` holds shared compiler options (ES2020, CommonJS).

## Config & Sessions

- User config: `~/.hotui/config.json` (profiles with provider/model selection, defaults to `mock`)
- Sessions persist as JSONL at `./.hotui/sessions/<timestamp>.jsonl` with automatic secret redaction
