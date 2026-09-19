# VARIS AI Agent & Conversation Engine

`POST /api/chat` is the authenticated conversation endpoint powered by an autonomous **AI Agent loop** with a modular **Tool System**. It requires the `varis_session` cookie and accepts:

```json
{
  "message": "What is 25 * 4 and what time is it in UTC?",
  "conversation_id": "optional-uuid-or-null"
}
```

It returns:

```json
{
  "response": "25 * 4 is 100. The current UTC time is...",
  "conversation_id": "...",
  "message_id": "..."
}
```

When `conversation_id` is omitted or null, VARIS creates a conversation titled from the first message. When supplied, ownership is checked before any message is written. The user message is persisted first, the agent executes reasoning and tool calling rounds, and the final assistant response is persisted.

---

## AI Agent Architecture & Lifecycle

```
User Message
    ↓
Agent Orchestrator
    ↓
AI Provider Reasoning (OpenAI Responses / Tools API)
    ↓
Tool Calls Selection
    ↓
Tool Registry & Schema Validation
    ↓
Permission Gate (capability check)
    ↓
Tool Execution (sandboxed safe adapters)
    ↓
Tool Result / Structured Error
    ↓
Continuation to AI Provider
    ↓
Final Response to User
```

---

## Tool System & Registry

Every tool registered in `ToolRegistry` (`src/tool-system.mjs`) contains:
- **`name`**: Unique identifier string.
- **`description`**: Human/LLM-readable tool purpose.
- **`inputSchema`**: JSON Schema describing required and optional parameters.
- **`validate`**: Optional custom input validator.
- **`permission`**: Required permission scope string (or null).
- **`execute`**: Asynchronous execution function receiving `(input, context)`.
- **`errorHandler`**: Error mapping function returning user-safe explanations.

### Built-in Basic Tools:
1. **`calculator`** (Permission: `calculator:use`):
   - Safely evaluates arithmetic expressions (`+`, `-`, `*`, `/`, `%`, `**`, parentheses, unary minus, decimals).
   - Division/modulo by zero guard (`DIVISION_BY_ZERO`).
   - Code injection protection (rejects any non-arithmetic tokens).
2. **`date_time`** (Permission: `datetime:read`):
   - Returns formatted date, ISO string, and timestamp for any IANA timezone (e.g., `UTC`, `Asia/Jakarta`).
   - Graceful fallback on invalid timezones (`INVALID_TIMEZONE`).
3. **`user_profile`** (Permission: `profile:read`):
   - Returns safe profile fields (`id`, `name`, `email`) for the authenticated user.
   - **Zero Raw Database Access**: AI never touches raw database connections, queries, or password hashes.
4. **`conversation_memory`** (Permission: `memory:read`):
   - Retrieves recent messages from the current conversation (`role`, `content`, `created_at`).
   - Enforces limit bounds (1–10).

---

## Permission System

Permissions are managed via fine-grained capability scopes:
- `calculator:use`
- `datetime:read`
- `profile:read`
- `memory:read`

If an unpermitted tool is called, the execution gate returns `{ ok: false, error: { code: 'PERMISSION_DENIED', message: '...' } }`. The agent loop communicates this back to the model without crashing.

---

## Error Handling & Reliability

- **No Crashes**: If a tool throws or fails validation, a structured error `{ ok: false, error: { code, message, details } }` is returned to the model.
- **Loop Guards**: Agent multi-step reasoning is capped at `maxToolRounds` (default 5) to prevent infinite tool loops (`AGENT_TOOL_LOOP_LIMIT`).
- **Provider Retries**: The OpenAI client in `src/ai-engine.mjs` applies exponential backoff for transient network or provider errors.
- **Safe Logging**: The system logs metadata (conversation ID, message ID, tool name, error code) and never leaks sensitive parameters, user passwords, or session tokens.


