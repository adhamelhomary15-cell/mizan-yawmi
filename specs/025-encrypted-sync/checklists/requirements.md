# Specification Quality Checklist: Encrypted Sync Across Devices

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The owner's choices (server, account kind, order) are inputs, recorded in the spec's header. Encryption and
  derived keys are named only at the level the constitution itself names them (Principle III).
- **A gap with constitution 3.0.0, to be closed before the plan:** Principle III lists what the server may hold "and
  nothing else". Two things FR-005 and the Key Entities need are not named there:
  - the devices' sign-ins (needed for US5, signing one device out);
  - the data key wrapped by the password and by the recovery code (needed for FR-010, a password change with no new
    upload).

  Both are either encrypted or useless alone. The proposal is a PATCH amendment (3.0.1) that names them, for the
  owner to approve. Approved and done (2026-10-24, constitution 3.0.1).
- Defaults chosen without asking, written in the spec for the owner to change:
  - a password of at least 10 characters;
  - changes reach the server within 1 minute;
  - the later change wins for the same item, and the losing version is kept in the day's snapshot;
  - on the first sign-in with two different schedules, the app asks which to keep.
