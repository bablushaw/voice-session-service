# Voice Session Service — Design Notes (Take-Home)

## 1. How did you ensure idempotency?

- **POST /sessions** — Uses MongoDB `findOneAndUpdate` with **`$setOnInsert`** only. A second request with the same `sessionId` matches the existing document and does **not** overwrite `language`, `startedAt`, or `metadata`; the API returns the current row. `language` must be one of the **`SessionLanguage`** enum values (validated in DTO and stored with a Mongoose enum). The unique index on `sessionId` prevents duplicate documents under concurrency.
- **POST /sessions/:sessionId/events** — Inserts are backed by a **unique compound index** `(sessionId, eventId)`. A duplicate insert throws duplicate key `11000`; the handler returns the **existing** event so the response is stable and no second row is created.
- **POST /sessions/:sessionId/complete** — If `status` is already `completed`, the service returns the stored session **without** changing `endedAt` again. If not completed, a conditional update sets `completed` once; racing callers all converge on the same final document.

## 2. How does your design behave under concurrent requests?

- **Same session upsert** — MongoDB serializes writes on the unique `sessionId` key; upserts are atomic at the document level, so parallel POST /sessions calls share one document.
- **Same event** — The unique `(sessionId, eventId)` index ensures at most one physical insert; duplicates hit the duplicate-key path and read back the same row.
- **Complete + events** — Typical race: one request completes while another adds an event. Completion is ordered by which transaction wins; business rules here reject new events once `status` is `completed`, so after completion, event inserts fail with **400** (closed session).

## 3. What MongoDB indexes did you choose and why?

| Collection | Index | Reason |
|------------|--------|--------|
| `conversation_sessions` | `sessionId` **unique** | Fast lookup by external id; enforces one document per session for upserts. |
| `conversation_sessions` | `status` | Optional filter for future ops (monitoring, sweeps). |
| `conversation_events` | `(sessionId, eventId)` **unique** | Idempotent events per session; prevents duplicate `(sessionId, eventId)` pairs. |
| `conversation_events` | `(sessionId, timestamp)` | Supports listing events in time order with pagination (`sort` + `skip`/`limit`). |
| `conversation_events` | `sessionId` on field | Speeds `countDocuments` / scans scoped to a session. |

## 4. How would you scale this system for millions of sessions per day?

- **Horizontal scaling**: Stateless NestJS instances behind a load balancer; **MongoDB replica set** or sharded cluster; route sessions by `sessionId` hash if sharding.
- **Hot partitions**: Shard **`conversation_events`** by `sessionId` so a single session’s events stay on one shard; archive cold sessions to cheaper storage (S3 / TTL collections) if retention allows.
- **Read scaling**: Secondary reads for **GET** traffic; keep writes on primary or use causal consistency as needed.
- **API layer**: Rate limiting, request size caps, pagination defaults (already bounded `limit` max).
- **Out of scope for this assignment**: message queues, CQRS, separate read models — listed below.

## 5. What did you intentionally keep out of scope, and why?

- **Authentication / authorization** — Per spec; would add API keys or JWT in production.
- **Queues, workers, outbox** — Spec excludes background jobs; real systems might emit session events to Kafka for analytics.
- **Soft delete / retention policies** — Not required; could add `deletedAt` and TTL indexes later.
- **Webhooks / external STT providers** — “No external services” for this exercise.
- **Optimistic locking with version field** — Relied on MongoDB atomic updates instead; could add `__v` for stricter multi-field races if needed.
