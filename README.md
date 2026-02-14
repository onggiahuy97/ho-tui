# Agentic TUI Core

This repo hosts a minimal but extensible foundation for a future Codex/Claude-style terminal UI. The goal is to prove out the event-driven runtime, provider abstraction, session persistence, and CLI wiring without building a full interface yet.

## Packages

- `@hotui/core`: Agent runtime, strongly typed events, append-only session store, config loader, and redaction utilities.
- `@hotui/providers`: Provider interface plus a mock streaming implementation. OpenAI/Anthropic adapters exist as stubs so the shapes compile but deliberately throw.
- `@hotui/cli`: Thin executable that loads config, instantiates the runtime with the mock provider, and prints streamed token deltas.
- `@hotui/tui`: Interactive terminal UI built with Ink (React for CLIs). Pure consumer of the core event stream.

`pnpm` workspaces keep builds/test scripts aligned with `tsc -b` project references.

## Architecture

1. **Events** – `CoreEvent` combines user/runtime events with provider-sourced events like `assistant_token_delta`, `plan_created`, `tool_call_started`, etc.
2. **Event bus** – The runtime emits into an `EventBus` that exposes `AsyncIterable<CoreEvent>`, so any UI (TUI/web) can subscribe without learning about providers.
3. **Providers** – `ModelProvider.streamChat` returns an `AsyncIterable<ProviderEvent>`. `MockProvider` streams tokens+completion metadata locally; hosted providers can slot in later.
4. **Session store** – Every event is redacted and serialized to JSONL via `SessionStore`, so the CLI (and soon TUI) can replay sessions for debugging.
5. **Secrets/config** – Config is loaded from `~/.hotui/config.json` (with an in-memory default). Secret stores pull values from env variables today, with a Keychain placeholder for future use.

A future TUI just needs to instantiate the runtime and call `eventBus.subscribe()`, rendering the incoming events however it wants.

## Demo

```
pnpm install
pnpm build
pnpm exec hotui run "hello"
pnpm exec hotui tui              # Launch interactive TUI
pnpm exec hotui tui --profile=mock
```

The CLI loads/creates a default profile pointing at the mock provider. The `run` command reads your prompt, prints streamed token deltas, and logs the session. The `tui` command launches an interactive multi-turn chat interface.

## Tests

```
pnpm test
```

Tests cover JSONL persistence/replay (with redaction) and mock provider streaming order.

## TUI

The `@hotui/tui` package implements an interactive terminal UI using Ink (React for CLIs). It subscribes to the core EventBus and renders a multi-turn chat with streaming token display, status bar, and keyboard input. Launch it with `hotui tui`.
