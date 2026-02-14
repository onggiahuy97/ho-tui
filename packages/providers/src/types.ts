export type ChatRole = 'system' | 'user' | 'assistant';

export interface ProviderChatMessage {
  role: ChatRole;
  content: string;
}

export interface ProviderChatRequest {
  model: string;
  messages: ProviderChatMessage[];
  temperature?: number;
}

interface ProviderEventBase {
  provider: string;
  model: string;
  timestamp: string;
}

export interface AssistantTokenDeltaEvent extends ProviderEventBase {
  type: 'assistant_token_delta';
  token: string;
}

export interface AssistantMessageEndEvent extends ProviderEventBase {
  type: 'assistant_message_end';
  message: string;
}

export interface ToolCallStartedEvent extends ProviderEventBase {
  type: 'tool_call_started';
  toolName: string;
  callId: string;
  input: Record<string, unknown>;
}

export interface ToolCallFinishedEvent extends ProviderEventBase {
  type: 'tool_call_finished';
  toolName: string;
  callId: string;
  output: Record<string, unknown>;
}

export interface PlanCreatedEvent extends ProviderEventBase {
  type: 'plan_created';
  plan: string;
}

export interface ApprovalRequestedEvent extends ProviderEventBase {
  type: 'approval_requested';
  reason: string;
}

export interface UsageUpdateEvent extends ProviderEventBase {
  type: 'usage_update';
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost?: number;
  };
}

export interface ProviderErrorEvent extends ProviderEventBase {
  type: 'error';
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ProviderEvent =
  | AssistantTokenDeltaEvent
  | AssistantMessageEndEvent
  | ToolCallStartedEvent
  | ToolCallFinishedEvent
  | PlanCreatedEvent
  | ApprovalRequestedEvent
  | UsageUpdateEvent
  | ProviderErrorEvent;
