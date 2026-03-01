# OpenWebUI Integration Guide

## Overview

StudentContext AI exposes an OpenAI-compatible API that allows boards to use [Open WebUI](https://github.com/open-webui/open-webui) or other OpenAI-compatible chat frontends while maintaining permission scoping, parental consent, and context augmentation.

**Important**: The custom StudentContext UI has permission scoping and consent flows built in. The OpenAI-compat layer provides flexibility but does not replicate all UI features (student selector, consent management, etc.).

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
