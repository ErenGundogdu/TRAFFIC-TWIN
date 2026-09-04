---
name: traffic-twin-development
description: Implement, review, or plan changes in the Traffic Twin repository while preserving its real-data invariants, feature boundaries, staged internship scope, and synchronized map/analytics architecture. Use for work on this project's web, server, ingestion, realtime, geospatial, analytics, anomaly, or operator-note capabilities.
---

# Traffic Twin Development

Work on the smallest complete vertical slice requested by the user. The user's current instruction takes precedence over this skill.

Before changing code, read the relevant sections of:

- `AGENTS.md` for repository-wide rules.
- `docs/PROJECT.md` for product scope and acceptance criteria.
- `docs/ARCHITECTURE.md` for boundaries and data flows.
- `docs/ROADMAP.md` for the active stage.
- `docs/BRIEF-COMPLIANCE.md` before changing scope or marking a requirement complete.
- `kararlar.md` when a technology or data decision is involved.

Preserve these invariants:

- Product traffic is real Fintraffic data; never silently substitute synthetic values.
- Missing inputs produce an explicit unknown/insufficient state.
- Provider payloads are validated and normalized before domain or UI use.
- Sensor stations remain physical source assets; junctions are derived composites with visible coverage.
- REST owns bootstrap/query flows; Socket.IO owns live updates, replay frames, and bidirectional operator notes.
- React Query, URL state, and ephemeral UI state have separate ownership; store IDs and derive current objects.
- API/database timestamps are UTC; presentation uses the coverage area's IANA timezone.
- Congestion and anomaly are separate concepts; anomaly uses a versioned rolling baseline.

Keep feature public APIs narrow. Split a module when it gains independent reasons to change, and do not accumulate analytics, provider, or ingestion code inside the map feature.

Use real recorded provider payloads for parsing tests, a real test database for PostGIS behavior, and integration tests for REST/Socket.IO boundaries. Run checks proportional to the change, then update status documentation only for behavior that was actually verified.
