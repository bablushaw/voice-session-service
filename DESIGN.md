# Voice Session Service — Design Notes (Take-Home)

## 1. How did you ensure idempotency?

- **POST /sessions** — 
Idempotent behavior (CORRECT)
1st request → creates session
2nd request → returns existing session

solutions
1.Unique Index(sessionId)
2.Uses MongoDB `findOneAndUpdate` with **`$setOnInsert`** only

- **POST /sessions/:sessionId/events** —
solutions
1.Unique compound Index(sessionId, eventId)
2.Uses MongoDB `findOneAndUpdate` with **`$setOnInsert`** only
 
- **POST /sessions/:sessionId/complete** — 
solutions
1.If `status` is already `completed`, the service returns the stored session else update session status `completed` and endedAt with now

## 2. How does your design behave under concurrent requests?

Session Creation: 1. Unique index on sessionId 2. Atomic operation (findOneAndUpdate + upsert)

Event Creation: 1.Compound index → (sessionId, eventId) 2. Atomic operation (findOneAndUpdate + upsert)

My design is safe under concurrent requests by using database-level constraints and atomic operations. For session creation, I enforce a unique index on sessionId and use atomic upsert operations to ensure only one session is created even if multiple requests arrive simultaneously. For event creation, I use a compound unique index on (sessionId, eventId) along with idempotent insert logic, ensuring duplicate requests do not create duplicate events. This prevents race conditions and guarantees consistency.

## 3. What MongoDB indexes did you choose and why?

conversation_sessions-
`sessionId` unique :  Fast lookup by external id; enforces one document per session for upserts.
 `status` : Supports filter-based queries such as reporting active/failed sessions
conversation_events-
`(sessionId, eventId)` unique: prevents duplicate
`{ sessionId: 1, timestamp: -1 }` : Optimized for time-ordered event retrieval within a session(newest → oldest)
`{ eventId: 1 }`: create index for eventId count for pagination

## 4. How would you scale this system for millions of sessions per day?

1. **Redis**
1.1 consider the code 
async upsertSession(dto: CreateSessionDto): Promise<{created: boolean, data: ConversationSession | null}> {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    // findOneAndUpdate is used for idempotency and handle concurrent requests
    const result = await this.sessionModel.findOneAndUpdate(
      { sessionId: dto.sessionId },
      {
        $setOnInsert: {
          sessionId: dto.sessionId,
          status: SessionStatus.INITIATED,
          language: dto.language,
          startedAt,
          endedAt: null,
          metadata: dto.metadata ?? {},
        },
      },
      { upsert: true, new: true, runValidators: true, includeResultMetadata: true },
    );
    console.log(result);
    const created = !!result?.lastErrorObject?.upserted;
    console.log(created);
    const doc = result.value
    return {
      created,
      data: doc
    }
  }

  note: such record are creating, updating with in particular time period, we can use redis to keep record with sessionId for further fast execution, so this way we can avoid DB query

  In the above we insert record with status created true/false to set new record in Redis, when ever we update status of a sessionId, we update updated record to sessionId

  when a sessionId complete or failed we delete from Redis

2 **Apply Pool Connection To DB**
Maximum number of connections MongoDB will open
Handles concurrent queries
Prevents overload
const commonOptions = {
          maxPoolSize: 20, // limit to 20 connections
          minPoolSize: 10,  // keep minimum ready connections
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
};

3. **API layer**: Rate limiting, request size caps, pagination defaults (already bounded `limit` max).

4. **MongoDB replica set** create replica set with one primary and two secondary to avoid any data loses

MONGODB_URI=mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&readPreference=secondaryPreferred


5. **Read scaling**: Secondary reads for **GET** traffic; keep writes on primary or use causal consistency as needed.

MONGODB_URI=mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&readPreference=secondaryPreferred


## 5. What did you intentionally keep out of scope, and why?
1. **KAFKA** : Here we can integrate kafka for background jobs like- messaging, if session failed then we can run in background process.
2. **K8s** since we have use idempotent at database level and used redis so we can create deployment.yml with multiple replica set to scale application as per load on server
