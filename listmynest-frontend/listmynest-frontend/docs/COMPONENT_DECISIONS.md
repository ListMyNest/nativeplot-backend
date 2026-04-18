# ListMyNest Frontend — Component Decisions Log

> Add an entry here every time you make a non-obvious architectural or
> implementation decision. Paste this file into Cursor context at the start
> of new sessions so it immediately understands your codebase choices.

## Format
```
## [Date] — [Component or area]
**Decision:** What you chose
**Why:** Reason
**Alternatives considered:** What you rejected and why
```

---

## [2026-03] — Project setup
**Decision:** Two separate repos (frontend + backend), not a monorepo  
**Why:** Different deploy targets (Vercel vs Railway), different tech stacks, no shared code  
**Alternatives considered:** Turborepo monorepo — rejected because there is truly no shared code between Next.js and Spring Boot

## [2026-03] — State management
**Decision:** Zustand over Redux Toolkit  
**Why:** Store is small (3 stores, <10 fields each), no middleware needed, no time-travel debugging required  
**Alternatives considered:** Redux Toolkit — overkill for this scope; Jotai — less community support for Next.js App Router

## [2026-03] — buyer_token storage
**Decision:** sessionStorage only, never localStorage  
**Why:** DPDP Act compliance — token clears automatically on tab close, no persistent PII on device  
**Alternatives considered:** localStorage — rejected (DPDP risk); httpOnly cookie — rejected (adds backend complexity for a soft token)

## [2026-03] — Analytics persistence
**Decision:** PostHog persistence: 'memory'  
**Why:** DPDP Act requires no anonymous data stored on device without consent. Memory persistence means no localStorage/cookie writes.  
**Alternatives considered:** localStorage persistence — rejected (DPDP non-compliant for anonymous buyers)

---
<!-- Add new decisions above this line -->
