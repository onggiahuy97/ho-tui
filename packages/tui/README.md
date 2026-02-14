# @hotui/tui

Interactive terminal UI for hotui, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Usage

```bash
pnpm exec hotui tui [--profile=name]
```

- Type a prompt and press Enter to send
- Watch tokens stream in real-time
- Ctrl+C to exit

## Architecture

The TUI is a pure consumer of the core event stream. It subscribes to `runtime.events.subscribe()` and renders incoming `CoreEvent`s via a React/Ink component tree. User input drives `runtime.run(prompt)`, and events flow back through the EventBus.

State is managed by a pure reducer (`tuiReducer`) that maps `CoreEvent`s to a `TuiState` containing the conversation transcript and streaming status.
