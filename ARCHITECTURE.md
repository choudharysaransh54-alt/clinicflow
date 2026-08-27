# Architecture Decision Records (ADRs)

## ADR-001: Redis Sorted Sets over Linked Lists
**Context:** We need a queue system that can handle priorities and automatic ordering, while still allowing efficient O(1) or O(log N) retrieval and removal.
**Decision:** Use Redis Sorted Sets (ZADD/ZRANGE) instead of Lists (LPUSH/LPOP). The score is calculated as `(priority * 1_000_000_000_000) - Date.now()`.
**Trade-offs:** 
- Insertions and removals are O(log N) instead of O(1).
- Enables priority ordering without the need to fetch and re-sort the entire list in application memory.
- Allows targeted removal of specific patients from the middle of the queue (e.g. transfers, no-shows) easily using ZREM.

## ADR-002: Centralized State Machine
**Context:** Patient status transitions are complex, involving multiple validations, side effects (updating wait times, releasing queues), and audit logging.
**Decision:** All status changes must go through a centralized `StateService.transitionPatient` method.
**Trade-offs:**
- Adds a slight indirection layer for simple updates.
- Prevents invalid state transitions at the service level.
- Enforces an atomic concurrency guard using `findOneAndUpdate` with the current status to prevent race conditions.
- Ensures consistent audit logging and side-effect handling in one place.

## ADR-003: Namespaced Socket Rooms
**Context:** The previous system used a global `io.emit('queue:updated')` to broadcast updates to all connected clients on every state change.
**Decision:** Implement namespaced socket rooms like `admin`, `doctor:{id}`, `patient:{id}`, and `pharmacy`. Broadcast updates only to relevant rooms.
**Trade-offs:**
- The client must explicitly join rooms via socket events upon authentication.
- Drastically reduces unnecessary network traffic and client-side re-renders, as a doctor only receives updates for their own queue.

## ADR-004: MongoDB as Source of Truth, Redis as Queue Index
**Context:** Redis holds the live queue ordering, but we also persist all patient data.
**Decision:** MongoDB is the absolute source of truth. Redis only stores the patient IDs and their priority score. 
**Trade-offs:**
- Requires fetching the ordered IDs from Redis, then querying MongoDB to populate the actual patient documents.
- If Redis goes down and restarts empty, the queue state can theoretically be rebuilt from MongoDB documents using their status and priority fields.
- Introduces an eventual consistency window during recovery, but guarantees no data loss for patient records.
