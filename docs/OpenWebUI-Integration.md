# OpenWebUI Integration Guide

## Overview

StudentContext AI exposes an OpenAI-compatible API that allows boards to use [Open WebUI](https://github.com/open-webui/open-webui) or other OpenAI-compatible chat frontends while maintaining permission scoping, parental consent, and context augmentation.

**Important**: The custom StudentContext UI has permission scoping and consent flows built in. The OpenAI-compat layer provides flexibility but does not replicate all UI features (student selector, consent management, etc.).

## Benefits of OpenAI-Compatible Chat Integration

Some boards have already invested in deploying Open WebUI or similar OpenAI-compatible chat frontends for their staff. Others have built custom internal tools that speak the OpenAI API format. Requiring these boards to abandon their existing chat infrastructure and adopt a new web application would create unnecessary friction and delay adoption.

StudentContext AI's OpenAI-compatible API layer solves this by making the full context engine available through the industry-standard `/v1/chat/completions` endpoint.

### Protect Existing Chat UI Investments

A board that has already deployed Open WebUI, configured it with custom themes, trained staff on its interface, and integrated it into their workflow does not need to replace it. By pointing Open WebUI's API base URL at StudentContext AI's `/v1` endpoint, the board's existing chat UI gains student-aware, context-augmented AI responses immediately. Staff continue using the interface they already know -- the only difference is that responses are now grounded in real student data.

### Permission Scoping Through Any Frontend

The critical differentiator is that StudentContext AI's permission model is enforced at the API level, not the UI level. When a teacher sends a message through Open WebUI, the API resolves their role, determines which students they can access, verifies parental consent, retrieves relevant context from the vector database, and routes the request through the LLM gateway with full audit logging -- exactly as if they had used the native StudentContext UI.

This means boards do not sacrifice security or compliance by using a third-party chat frontend. The same RBAC rules, consent checks, and audit trails apply regardless of which UI the request originates from.

### Streaming Support for Responsive Interaction

The compat layer supports both standard request-response and Server-Sent Events (SSE) streaming. When `stream: true` is set in the request, responses are delivered token-by-token, providing the same responsive typing experience that users expect from modern AI chat interfaces. Open WebUI handles SSE streaming natively, so the experience is seamless.

### Multi-Model Selection

The `/v1/models` endpoint advertises all LLM providers configured for the board. If a board has enabled Claude, GPT-4o, and Gemini, Open WebUI will display all three as selectable models. Staff can choose the most appropriate model for their task -- or the board can restrict the list to a single approved provider. All requests route through the API key broker with full token tracking and cost accounting regardless of which model is selected.

### A Path from Generic AI to Student-Aware AI

Many boards are already experimenting with generic AI chat tools that lack any student context. The OpenAI-compatible API provides a low-friction migration path: the board keeps their existing chat UI, swaps the API endpoint from a generic OpenAI proxy to StudentContext AI's context engine, and immediately upgrades from generic responses to student-aware, permission-scoped, consent-verified, audit-logged AI interactions.

No new software to deploy on staff workstations. No new login flow to learn. No new interface to navigate. Just better, more relevant AI responses flowing through the same tool staff already use.

## Architecture

```
┌─────────────────┐
│  Open WebUI      │
│  (Chat Frontend) │
└────────┬────────┘
         │ OpenAI-format API calls
         │ + Custom headers
         ▼
┌─────────────────┐
│  StudentContext   │
│  /v1/chat/...    │
│  (Compat Layer)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context Engine   │
│  (RAG Pipeline)  │
│  Permissions     │
│  Consent         │
│  Billing         │
└─────────────────┘
```

## Endpoints

### POST /v1/chat/completions

Standard OpenAI Chat Completions format.

**Request:**
```json
{
  "model": "studentcontext/claude",
  "messages": [
    {"role": "user", "content": "How is Alex doing in math?"}
  ],
  "stream": true
}
```

**Custom Headers:**
```
Authorization: Bearer <your-token>
X-StudentContext-Student-Id: <student-uuid>
X-StudentContext-Session-Id: <session-uuid>
```

**Response (non-streaming):**
```json
{
  "id": "chatcmpl-1234",
  "object": "chat.completion",
  "model": "claude-sonnet-4-20250514",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Based on Alex's records..."},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 450,
    "total_tokens": 1650
  },
  "studentcontext": {
    "session_id": "uuid",
    "chunks_used": 3,
    "latency_ms": 2100
  }
}
```

**Streaming (SSE):**
```
data: {"id":"chatcmpl-1234","choices":[{"delta":{"content":"Based on"},"finish_reason":null}]}

data: {"id":"chatcmpl-1234","choices":[{"delta":{"content":" Alex's"},"finish_reason":null}]}

data: {"id":"chatcmpl-1234","choices":[{"delta":{},"finish_reason":"stop"}],"usage":{...}}

data: [DONE]
```

### GET /v1/models

Lists available LLM providers configured for the board.

```json
{
  "object": "list",
  "data": [
    {"id": "studentcontext/claude", "owned_by": "anthropic"},
    {"id": "studentcontext/openai", "owned_by": "openai"},
    {"id": "studentcontext/gemini", "owned_by": "google"}
  ]
}
```

## Open WebUI Setup

### Docker

```bash
docker run -d \
  --name open-webui \
  -p 3010:8080 \
  -e OPENAI_API_BASE_URL=https://dev.ecoworks.ca:3094/v1 \
  -e OPENAI_API_KEY=<your-bearer-token> \
  ghcr.io/open-webui/open-webui:main
```

### Configuration

In Open WebUI settings:

1. **API Base URL**: `https://dev.ecoworks.ca:3094/v1`
2. **API Key**: Your StudentContext Bearer token (dev JWT or Clerk session token)
3. **Available Models**: Will auto-populate from `/v1/models`

### Custom Headers

Open WebUI does not natively support custom headers. To specify a target student:

1. Use the `X-StudentContext-Student-Id` header via Open WebUI's custom header configuration
2. Or, for student users, the system automatically targets their own data

## Authentication

The compat layer uses the same auth as the main API:

| Provider | Token Format |
|----------|-------------|
| Dev Auth | JWT from `POST /api/auth/dev-login` |
| Clerk | Clerk session token |
| Entra ID | Azure AD JWT |
| Google | Google ID token |

## Security Notes

- All requests go through the full permission pipeline
- Parental consent is verified before any context retrieval
- Usage is tracked through the API key broker (billing)
- Audit trail includes all compat-layer requests
- The compat layer does NOT bypass any security checks

## Limitations

- Student selector UI not available (use `X-StudentContext-Student-Id` header)
- Consent management requires the native UI or admin API
- Report card comment generation requires the staff portal
- Session continuity requires passing `X-StudentContext-Session-Id`
