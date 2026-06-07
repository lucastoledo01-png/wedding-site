## Context

The invitation and wishes APIs are already implemented, tested (`routes.spec.js`, `api.e2e.spec.js`), and shipped, but no OpenSpec capability documents their required behavior. This change captures that behavior verbatim into baseline specs. There is no code to write — the "implementation" is authoring spec files that match observed behavior and archiving them into `openspec/specs/`.

## Goals / Non-Goals

**Goals:**

- Produce `invitation-api` and `wishes-api` specs whose scenarios match the current code exactly.
- Anchor validation rules to the actual Zod schemas (UID `^[a-z0-9-]+$` ≤100; wish `name` 1–100, `message` 1–500, attendance enum default `MAYBE`; pagination `limit` ≤100, `offset` ≥0).
- Record known current characteristics (unauthenticated delete/stats, plaintext-name guest identity, duplicated stats handler) so future hardening reads as intentional deltas.

**Non-Goals:**

- Any code change, test addition, or migration.
- Correcting the behaviors noted as current state (auth, dedup-by-name, route duplication) — those belong to follow-up changes.

## Decisions

**1. Two capabilities split along feature folders.**
Mirror the codebase's `features/invitation` and `features/wishes` boundaries as `invitation-api` and `wishes-api`.

- *Why:* Specs track the same seams the code and tests already use, keeping future deltas localized.
- *Alternative considered:* One combined `api` capability — rejected; it would couple unrelated change surfaces.

**2. Place `/:uid/stats` under `wishes-api`.**
The stats route lives in `index.js` but reads the `wishes` table and is conceptually RSVP data.

- *Why:* Keeps the attendance-statistics requirement with the data it aggregates. The spec notes the duplicate handler as current state rather than asserting a single canonical location.

**3. Capture-as-is, annotate divergences with NOTE.**
Document shipped behavior even where it is suboptimal, flagging it with an explicit NOTE in the requirement.

- *Why:* The baseline's value is being an accurate diff target. Silently "fixing" behavior in the spec would make future hardening invisible.

## Risks / Trade-offs

- **[Spec drifts from code if behavior changes before archive]** → The specs are derived directly from current routes/schemas/tests read during authoring; validate against the test suites, which already encode this behavior.
- **[Recording suboptimal behavior as a "requirement" could be misread as endorsement]** → Mitigated by explicit NOTE annotations marking baseline-as-shipped items destined for change.

## Migration Plan

1. Author the two spec files (done in the specs artifact).
2. Validate the change with `openspec validate`.
3. On archive, the deltas materialize into `openspec/specs/invitation-api/` and `openspec/specs/wishes-api/`.
4. **Rollback:** delete the change directory; no code or data is touched.
