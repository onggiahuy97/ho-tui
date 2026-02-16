# @hotui/tui

Interactive terminal UI for hotui, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Usage

```bash
hotui                        # Launch with default profile
hotui --profile=openai       # Launch with a specific profile
```

- Type a prompt and press Enter to send
- Watch tokens stream in real-time
- Type `/` to open the slash command menu
- Ctrl+C to exit

## Slash Commands

| Command  | Description                                |
|----------|--------------------------------------------|
| `/model` | Open model picker to switch providers live |
| `/clear` | Clear the conversation transcript          |
| `/help`  | Show available commands                    |

The command menu appears as you type `/` and filters in real-time. Arrow keys to navigate, Enter to select, Esc to cancel.

## Components

- **App** — Root component. Orchestrates the runtime, event bus subscription, slash command handling, and model switching.
- **InputBox** — Character-by-character text input with slash command detection.
- **Transcript** — Renders the conversation with color-coded roles (user, assistant, system, error).
- **StatusBar** — Shows active provider, model, session ID, streaming status, and cumulative token usage for the session.
- **UsageStats** — Displays the running session token totals just below the chat input so users can see costs even while typing.
- **SlashMenu** — Filtered command picker overlay.
- **ModelPicker** — Model selection overlay with active indicator.

## Architecture

The TUI is a pure consumer of the core event stream. It subscribes to `runtime.events.subscribe()` and renders incoming `CoreEvent`s via a React/Ink component tree. User input drives `runtime.run(prompt)`, and events flow back through the EventBus.

State is managed by a pure reducer (`tuiReducer`) that handles both `CoreEvent`s from the runtime and local `TuiAction`s for UI state (slash menus, model picker, transcript clearing).

Model switching is handled via an `onSwitchModel` factory callback — the CLI creates a new `AgentRuntime` with the selected provider, and the App component hot-swaps the event bus subscription.
