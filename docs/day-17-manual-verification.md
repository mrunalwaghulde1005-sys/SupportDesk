# Day 17 Manual Verification

Record the following against a running authenticated backend:

1. Normal categorisation: POST `/tickets/:id/ai/categorize`.
2. Malicious ticket: submit injection text and verify it does not alter the task.
3. PII ticket: verify provider response is generated without PII in logs/context.
4. Invalid AI output: mock provider JSON and verify HTTP 502 fallback.
5. Rate limit: repeat an AI endpoint beyond the configured limit and verify 429.
6. Timeout: stop Gemini beyond 15 seconds and verify fallback behavior.
7. Gemini unavailable: unset the key and verify manual fallback.
8. Normal operations: create/update/comment while AI is unavailable.

Actual manual verification was not completed in this automated implementation
session. It remains pending for an operator with a running database, JWT and
approved test credentials.
