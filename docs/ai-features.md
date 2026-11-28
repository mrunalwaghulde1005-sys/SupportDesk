# SupportDesk – AI Features Documentation

## 1. Overview

SupportDesk uses AI features to assist agents with ticket management and customer support.

## 2. AI Features

### 2.1 AI Suggest Reply
- Generates a suggested reply using ticket context.
- The agent can review the suggested response before using it.
- AI response is streamed using Server-Sent Events (SSE).

### 2.2 AI Ticket Categorization
- Analyzes ticket information.
- Suggests a ticket category and priority.
- Available through the AI categorization API.

## 3. AI Guardrails

### 3.1 PII Masking
- Masks sensitive information before sending ticket context to the AI provider.
- Supported patterns include email, phone, card numbers, SSN, passwords and API secrets.

### 3.2 Prompt Injection Protection
- Ticket and comment content is marked as untrusted data.
- Moderation checks are applied to input context and generated AI output.

### 3.3 Zod Output Validation
- AI categorization output is parsed as JSON.
- The output is validated using the suggested ticket Zod schema.
- Invalid output is rejected.

### 3.4 AI Rate Limiting
- Uses express-rate-limit middleware.
- Default window: 60 seconds.
- Default limit: 10 requests per user.
- Returns HTTP 429 with error code `AI_RATE_LIMITED` when the limit is exceeded.

## 4. API Endpoints

| Feature | Method | Endpoint |
|---|---|---|
| Suggest Reply | POST | `/tickets/:id/ai/suggest-reply` |
| Categorization | POST | `/tickets/:id/ai/categorize` |

Both endpoints require authentication and ADMIN or AGENT role.

## 5. Testing Status

- AI Suggest Reply: Generation tested.
- AI Categorization: Tested successfully.
- PII Masking: PASS reported in Postman.
- Zod Output Validation: Implementation verified; invalid-output rejection test evidence pending.
- Prompt Injection: Runtime protection result pending.
- AI Rate Limiting: Runtime test pending; 11th request returned 200 instead of expected 429.

## 6. Conclusion

AI features help agents with reply suggestions and ticket categorization. Guardrails are implemented to reduce risks involving sensitive information, unsafe content and invalid AI output. Further runtime verification is required for the pending tests.