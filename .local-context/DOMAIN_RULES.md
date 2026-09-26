# QueueSmart — Domain Rules

This file captures domain rules supported by the assignment context and flags unresolved details.

## Roles
Required role concepts:
- User
- Administrator

Use the repository's existing representation rather than forcing specific enum strings.

Users should not perform administrator-only service/queue-management operations. When backend work is in scope, enforce permissions on the server rather than relying only on hidden UI controls.

## Service
Assignment-required concepts:
- ID
- name
- description
- expected duration
- priority

Service name maximum: **100 characters**.

Priority choices:
- low
- medium
- high

The exact TypeScript representation is an implementation choice; prefer the repository's existing conventions.

## Queue
A4 explicitly links Queue to Service.

Queue concepts:
- queue ID
- service ID
- open/closed status
- creation date
- queue entries

## Queue Entry
Required concepts:
- queue ID
- user ID
- position
- join time
- status

Required status concepts:
- waiting
- served
- canceled

These are assignment-level fields, not a finalized database schema.

## Queue ordering
A3 says ordering must consider:
- arrival time
- applicable priority

Still unresolved:
- exact priority-vs-arrival algorithm
- tie-breaking
- administrator override behavior

When implementation becomes necessary:
- centralize the rule
- make it deterministic
- document the chosen assumption
- test ties and priority behavior

Do not invent a complex algorithm merely because one could be built.

## Join/leave and queue-management cases
The assignment explicitly requires join/leave and administrator serve-next behavior.

Useful implementation/test cases identified in prior project guidance include:
- closed queue
- duplicate active entry
- empty queue
- leaving/canceling
- serving next

These cases are **recommended implementation coverage**, not separately enumerated rubric text.

## Wait-time estimation
A3 permits a basic rule and gives position × expected duration as an example.

When implementing, define the position convention clearly. The project guidance also recommends handling empty queues and missing/invalid duration values.

A historical estimator is only a possible final smart feature; it is not currently selected.

## Notifications
Required behavior evolves by stage:
- **A1:** notification behavior is part of the design; current context diagram uses an external Email/SMS provider
- **A2:** in-app display is acceptable
- **A3:** logging/returning notifications is acceptable; real email/SMS delivery is not required
- **A4/final:** live delivery remains an open implementation choice unless the team later selects it

QueueSmart owns the decision about when/why to notify. A provider, if used, is a delivery dependency.

## History
Users need queue participation history.

A2 history displays past queues with date, service name, and outcome.

A3 tracks history in memory/mock storage.

A4 includes a combined assignment-level "Notification / History" data row; do not treat that wording as proof that the final schema must combine them into one table.

## Validation
Explicit project requirements include:
- A2 client-side required/length/type validation
- A3 backend required/type/length validation
- A4 field presence, length, type, and uniqueness such as email

Do not trust client validation as a substitute for backend validation once backend work is in scope.
