# QueueSmart — Architecture Reference

This file separates **assignment-required architecture** from the **working implementation proposal**.

## 1. Required A1 system boundary
At the System Context level, QueueSmart is one complete application.

Outside QueueSmart:
- User
- Administrator
- external Email/SMS provider used by the current A1 design

Inside QueueSmart:
- account access/permission decisions
- service management
- queue state and ordering
- wait estimation
- participation history
- usage statistics
- decisions about when notifications should be triggered

The external provider handles message delivery. It does not decide queue order, calculate waits, or own QueueSmart's business rules.

## 2. Current context-diagram relationships
The revised A1 artifact records:
- Administrator -> QueueSmart: registration/sign-in; create/manage services; manage queues
- QueueSmart -> Administrator: queue status and usage statistics
- User -> QueueSmart: registration/sign-in; join/leave queue
- QueueSmart -> User: queue position, estimated wait, participation history
- QueueSmart -> Email/SMS provider: request queue alerts and verification emails
- provider -> QueueSmart: delivery status
- provider -> Administrator: verification emails
- provider -> User: queue alerts and verification emails

This is a context view. Do not insert Next.js, APIs, PostgreSQL, or internal modules into it.

## 3. Working implementation proposal
The following is **recommended guidance, not a separately confirmed team decision**:

```text
Next.js UI
    |
    v
Next.js API / Route Handler
    |
    v
Application / Business Logic
    |
    v
Data-Access Boundary
    |
    v
Storage Implementation
```

Why this proposal fits the assignments:
- A2 can build UI against mock/static data.
- A3 can keep API/business behavior while using in-memory storage.
- A4 can replace that storage with PostgreSQL without redesigning every screen or queue rule.

### Responsibility guidance
**UI**
- render pages/components
- forms/navigation
- display validation/errors
- call APIs when backend work is in scope

**API layer**
- parse requests
- perform backend validation/permission checks
- invoke business logic
- return responses/errors

**Business logic**
- service rules
- queue join/leave
- queue ordering
- wait estimates
- history updates
- notification triggers
- later reporting/smart-feature logic

**Data access**
- hide the storage implementation from business rules
- A3: in-memory/mock
- A4/final: PostgreSQL

## 4. Architecture boundaries still unresolved
Do not treat these as decided:
- ORM/data-access library
- authentication/session library
- exact real-time update transport
- notification vendor
- deployment topology
- multi-organization/tenant model
- exact priority/tie-breaking algorithm

Do not introduce microservices or other major architecture changes without a concrete requirement.
