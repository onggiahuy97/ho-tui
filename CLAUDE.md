# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (tsc -b, respects project references)
pnpm test                 # Run all tests (vitest run)
pnpm lint                 # Type-check without emitting (tsc -b --noEmit)
npx vitest run packages/core/test/session-store.test.ts  # Run a single test file
hotui                     # Launch interactive TUI chat
hotui run "prompt"        # Single-shot mode
```

## Architecture

This is a pnpm monorepo (`@hotui/*`) for an agentic terminal UI with real Anthropic (Claude) and OpenAI provider integrations.

**Package dependency graph:** `providers` ← `core` ← `tui` ← `cli`

- **`@hotui/providers`** — Provider abstraction layer. Defines `ModelProvider` interface, `ProviderEvent` discriminated union (token deltas, tool calls, approvals, errors, etc.), `SecretStore` interface, and implementations: `AnthropicProvider` (Claude via `@anthropic-ai/sdk`), `OpenAIProvider` (GPT via `openai`), and `MockProvider` (offline dev).
- **`@hotui/core`** — Runtime engine. `AgentRuntime` orchestrates provider streaming, `EventBus` (AsyncIterable with backpressure queue), `SessionStore` (JSONL append + replay), config loading from `~/.hotui/config.json`, and secret redaction.
- **`@hotui/tui`** — Interactive terminal UI built with Ink (React for CLIs). Slash commands (`/model`, `/clear`, `/help`), model picker for live provider switching, streaming token display, and keyboard-driven input.
- **`@hotui/cli`** — Executable entry point. Loads `.env` via `dotenv`, creates runtime, defaults to TUI mode. Run with `hotui` or `hotui run "prompt"`.

**Data flow:** User types in TUI → `runtime.run(prompt)` → publishes `user_message` → calls `provider.streamChat()` → provider yields `ProviderEvent`s → runtime publishes each to EventBus and SessionStore → TUI reducer updates React state → tokens stream to screen.

**Slash commands:** Typing `/` opens a filtered command menu. `/model` opens a model picker to hot-swap providers mid-session. The TUI reducer handles both `CoreEvent`s and local `TuiAction`s.

## TypeScript Setup

Uses composite project references (`tsc -b`) so packages build in dependency order. Strict mode is enabled. Each package emits declarations to its own `dist/` directory. The root `tsconfig.json` references all packages; `tsconfig.base.json` holds shared compiler options (ES2020, CommonJS).

## Config & Sessions

- API keys: `.env` file at project root (loaded via `dotenv`). Keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- User config: `~/.hotui/config.json` (profiles with provider/model selection, defaults to `claude`)
- Default profiles: `claude` (claude-sonnet-4-20250514), `openai` (gpt-4o), `mock` (mock-1)
- Sessions persist as JSONL at `./.hotui/sessions/<timestamp>.jsonl` with automatic secret redaction
