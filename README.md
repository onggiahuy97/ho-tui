# Agentic TUI Core

A terminal-based AI chat interface — like Claude Code, but yours to hack on. Supports **Anthropic Claude** and **OpenAI GPT** models with streaming responses, multi-turn conversation, and in-chat model switching.

## Quick Start

```bash
pnpm install
pnpm build

# Add your API keys
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and/or OPENAI_API_KEY

# Launch the interactive TUI
hotui
```

Just run `hotui` — it opens an interactive chat. No subcommands needed.

## Slash Commands

Type `/` in the chat to open the command menu:

| Command  | Description                                      |
|----------|--------------------------------------------------|
| `/model` | Switch between Claude, GPT-4o, or mock on the fly |
| `/clear` | Clear the conversation transcript                |
| `/help`  | Show available commands                          |

The `/model` picker lets you hot-swap providers mid-session — no restart required.

## Packages

- **`@hotui/core`** — Agent runtime, strongly typed events, append-only session store, config loader, and redaction utilities.
- **`@hotui/providers`** — Provider interface with streaming Anthropic (Claude) and OpenAI implementations, plus a mock provider for offline development.
- **`@hotui/cli`** — Executable entry point. Loads `.env`, creates the runtime, and launches the TUI by default.
- **`@hotui/tui`** — Interactive terminal UI built with Ink (React for CLIs). Slash commands, model picker, and streaming token display.

`pnpm` workspaces keep builds/test scripts aligned with `tsc -b` project references.

## Architecture

1. **Events** — `CoreEvent` combines user/runtime events with provider-sourced events like `assistant_token_delta`, `plan_created`, `tool_call_started`, etc.
2. **Event bus** — The runtime emits into an `EventBus` that exposes `AsyncIterable<CoreEvent>`, so any UI (TUI/web) can subscribe without learning about providers.
3. **Providers** — `ModelProvider.streamChat` returns an `AsyncIterable<ProviderEvent>`. Real SDK streaming (Anthropic `messages.stream()`, OpenAI `chat.completions.create({ stream: true })`) is mapped to the unified event protocol.
4. **Session store** — Every event is redacted and serialized to JSONL via `SessionStore` for replay and debugging.
5. **Secrets/config** — API keys load from `.env` via `dotenv`. Config is loaded from `~/.hotui/config.json` (with sensible defaults). Secret stores pull values from env variables, with a Keychain placeholder for future use.

## Configuration

### Environment Variables (`.env`)

```dotenv
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Profiles (`~/.hotui/config.json`)

Default profiles are built in — no config file needed:

| Profile  | Provider   | Model                       |
|----------|------------|-----------------------------|
| `claude` | anthropic  | claude-sonnet-4-20250514     |
| `openai` | openai     | gpt-4o                      |
| `mock`   | mock       | mock-1                      |

Override with a config file or switch live with `/model`.

## Usage

```bash
hotui                              # Launch TUI chat (default: Claude)
hotui --profile=openai             # Launch with a specific profile
hotui run "explain monads"         # Single-shot mode (streams to stdout)
hotui run "hello" --profile=mock   # Single-shot with mock provider
```

## Development

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Type-check without emitting
```

## Tests

```bash
pnpm test
```

Covers JSONL persistence/replay (with redaction), mock provider streaming order, and TUI reducer state transitions.
