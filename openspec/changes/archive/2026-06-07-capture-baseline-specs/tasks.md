## 1. Verify captured behavior against code

- [x] 1.1 Confirm `invitation-api` spec scenarios match `src/server/features/invitation/routes.js` and `invitation.schema.js`
- [x] 1.2 Confirm `wishes-api` spec scenarios match `src/server/features/wishes/routes.js`, `wishes.schema.js`, and the `/:uid/stats` handler in `src/server/index.js`
- [x] 1.3 Cross-check each scenario against existing tests (`routes.spec.js`, `api.e2e.spec.js`) to ensure no behavior is misstated

## 2. Validate the change

- [x] 2.1 Run `openspec validate "capture-baseline-specs"` and resolve any errors
- [x] 2.2 Confirm all scenarios use exactly four-hashtag `#### Scenario:` headers and every requirement has at least one scenario

## 3. Archive into baseline specs

- [x] 3.1 After review, archive the change so deltas materialize into `openspec/specs/invitation-api/` and `openspec/specs/wishes-api/`
- [x] 3.2 Confirm `openspec/specs/` now contains both capabilities as the diff baseline for future changes
