# QueueSmart — Assignment Requirements

This file summarizes the latest project context and assignment material. It describes requirements, not proof of implementation.

## A1 — Initial Thoughts and System Design
A1 is **design only; no code**.

Required concepts include:
- registration/login for users and administrators using username/email and password
- email verification at the design level
- User and Administrator roles
- service name, description, expected duration, and low/medium/high priority
- joining/leaving a queue
- queue position and estimated wait
- ordering that considers arrival time and priority
- notifications when users approach service or queue status changes
- queue participation history
- basic administrator usage statistics

### Required System Context Diagram
Show:
- User
- Administrator
- QueueSmart as one complete system
- external dependencies the design uses; the current A1 design includes an Email/SMS provider

Do **not** put Next.js, PostgreSQL, API routes, or other internal implementation details in the A1 context diagram.

A simple lower-level container diagram is optional.

### A1 submission reminder
Grading in the captured assignment: Initial Thoughts 2 points, Methodology 2, Architecture 6. Submit one PDF or Markdown through the allowed course submission path and ensure required repository/TA access if GitHub is used.

---

## A2 — UI/UX Design and Front-End Implementation
Backend functionality is not required. Mock/static data is acceptable.

Required areas and behavior:
- **Login/Registration:** email as username, password, basic client-side validation
- **User Dashboard:** current queue status, available active services, notification summary
- **Join Queue:** select service, view estimated wait, join/leave
- **Queue Status:** current position, estimated wait, waiting/almost-ready/served updates
- **History:** past queues with date, service name, and outcome
- **Admin Dashboard:** services, current queue lengths, open/close queue actions
- **Service Management:** create/edit service
- **Queue Management:** view a service queue, reorder/remove users through the UI, simulate serving the next user
- **Notifications:** display queue updates/status changes; in-app only is acceptable

Validation must cover required fields, length limits, and proper email/number/date input types.

Service form requirements include:
- required name, maximum 100 characters
- required description
- required expected duration in minutes
- low/medium/high priority

Technology choices must be justified.

### A2 submission reminder
One Word/PDF should include the repository link, methodology/division of work, frontend technologies/responsibilities, labeled major-screen screenshots, and contribution table. Code remains in GitHub.

---

## A3 — Back-End Development and API Implementation
A3 requires:
- backend logic
- REST APIs or equivalent interfaces
- backend validation
- integration with the A2 frontend
- unit tests

**A3 explicitly prohibits a real database.** Use in-memory data, collections, maps/arrays, or mocked repository objects.

Required modules:
1. Authentication: registration, login, User/Admin role handling, basic validation
2. Service Management: create/update/list services with name, description, expected duration, priority
3. Queue Management: join/leave; administrators inspect queues and serve next; ordering considers arrival and applicable priority
4. Wait-Time Estimation: a basic rule is sufficient; the assignment gives position × expected duration as an example
5. Notifications: trigger when a user joins or approaches service; logging/returning notifications is acceptable; real email/SMS is not required
6. History: track participation in memory/mock storage

Backend validation must enforce required fields, types, and lengths and return appropriate errors. The frontend must call the APIs and display backend responses.

Unit tests are required for core business logic and validation. Target coverage is 70–80%; meaningful tests matter more than perfect coverage.

### A3 submission reminder
One Word/PDF should include the GitHub code/tests link, backend technology choices/justification, and team contributions. TAs review commit history and test execution.

---

## A4 — Data Design and Database Implementation
A4 introduces real persistent storage. The assignment permits SQL or NoSQL; the team selected **PostgreSQL**.

Required assignment-level data concepts:

### UserCredentials
- User ID
- email/username
- protected password
- User/Administrator role

### UserProfile
- full name
- email foreign key/reference
- optional contact information
- preferences if applicable

### Service
- Service ID
- name
- description
- expected duration
- priority

### Queue
- Queue ID
- Service ID
- open/closed status
- creation date

### QueueEntry
- Queue ID
- User ID
- position
- join time
- waiting/served/canceled status

### Notification / History
The assignment groups this as one listed requirement row containing:
- User ID
- message
- timestamp
- sent/viewed status

That wording is assignment-level guidance, **not a finalized schema**. Do not silently drop required concepts when refining the relational model.

Required validations include field presence, length, type, and uniqueness such as email. Frontend forms submit through the backend; APIs persist/retrieve database data; data must persist across requests.

Passwords must not be stored in plaintext. The assignment says "encrypted"; the prior technical guidance recommends established salted password hashing, but no hashing library is confirmed.

Test the database-integration code, update existing tests, and maintain the stated coverage expectation.

### A4 submission reminder
The captured requirements include GitHub/database integration/tests, SQL table-creation statements with explicit primary/foreign keys, a rerun coverage screenshot/summary, and team contributions. Code remains in GitHub.

---

## Final — Complete System, Smart Feature, Reporting, Demo
Deliver the integrated A1–A4 system plus reporting and at least one smart feature.

### Administrator reporting
Reports must cover:
- users/customers and their queue participation history
- service details and queue activity
- usage statistics such as users served and average wait time

At least one export format is required, such as CSV or PDF. Reports may be on-demand or filtered by date range/service. The submission requires at least one generated example plus an explanation of how it was generated, what it contains, and who can access it.

### Smart feature
At least one is required. Advanced machine learning is not necessary.

Assignment examples:
- improved wait estimates using historical data
- suggested best time to join
- alternative service recommendation with shorter wait
- rules-based priority handling
- optimized notification timing
- API-based queue-status chatbot

No exact smart feature is currently confirmed.

### Demo and testing
The demo should show:
- login/queue interaction
- administrator service/queue management
- database persistence
- reporting
- the smart feature

All team members must participate. A recorded demo is acceptable only if approved. Rerun backend coverage and include the required screenshot/summary; the captured instructions state approximately 70–80% overall backend coverage.

### Final submission reminder
The captured final requirements include the complete GitHub repository, coverage report, demo, contribution evidence/table, and a generated report example/explanation. Submit the required Word/PDF to Canvas; code remains in GitHub.
