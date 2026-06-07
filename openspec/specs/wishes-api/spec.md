# wishes-api Specification

## Purpose
TBD - created by archiving change capture-baseline-specs. Update Purpose after archive.
## Requirements
### Requirement: List wishes with pagination

The system SHALL expose `GET /api/:uid/wishes` that returns the wishes for an existing invitation, most recent first, with pagination.

Query parameters `limit` and `offset` SHALL be validated: `limit` defaults to 50, must be a positive integer, and cannot exceed 100; `offset` defaults to 0 and must be a non-negative integer. Each wish SHALL include `id`, `name`, `message`, `attendance`, and `created_at` converted to the `Asia/Jakarta` timezone. The response SHALL include a `pagination` object with `total`, `limit`, and `offset`.

#### Scenario: List wishes for an existing invitation

- **WHEN** a client requests `GET /api/:uid/wishes` for an existing invitation
- **THEN** the response status is 200
- **AND** `data` contains wishes ordered by `created_at` descending
- **AND** `pagination.total` reflects the total wish count for that invitation

#### Scenario: Invitation does not exist

- **WHEN** a client lists wishes for a UID with no matching invitation
- **THEN** the response status is 404
- **AND** the error message is "Invitation not found"

#### Scenario: Pagination parameter out of bounds

- **WHEN** a client supplies a `limit` greater than 100 or a negative `offset`
- **THEN** the response status is 400

### Requirement: Create a wish with one submission per guest

The system SHALL expose `POST /api/:uid/wishes` that records a guest's wish and attendance for an existing invitation. The request body SHALL be validated: `name` is required, trimmed, 1–100 characters; `message` is required, trimmed, 1–500 characters; `attendance` is one of `ATTENDING`, `NOT_ATTENDING`, `MAYBE`, defaulting to `MAYBE`.

A guest, identified by `name` within an invitation, SHALL be permitted only one wish. A duplicate submission SHALL be rejected, whether detected by the pre-insert lookup or by the database unique constraint.

#### Scenario: First wish from a guest

- **WHEN** a guest submits a valid wish for an invitation they have not yet posted to
- **THEN** the response status is 201
- **AND** `data` contains the stored wish with its `id` and Jakarta-localized `created_at`

#### Scenario: Duplicate wish from the same guest

- **WHEN** a guest submits a wish using a `name` that already has a wish for that invitation
- **THEN** the response status is 409
- **AND** the error code is `DUPLICATE_WISH`

#### Scenario: Invalid wish body

- **WHEN** a client submits a wish with a missing/empty `name` or `message`, or an attendance value outside the allowed enum
- **THEN** the response status is 400

#### Scenario: Invitation does not exist

- **WHEN** a client posts a wish for a UID with no matching invitation
- **THEN** the response status is 404

### Requirement: Delete a wish

The system SHALL expose `DELETE /api/:uid/wishes/:id` that removes a wish belonging to the given invitation. Deletion SHALL be scoped to the matching `invitation_uid` so a wish cannot be deleted via a different invitation's UID.

NOTE (baseline as shipped): this endpoint is currently unauthenticated; any caller may invoke it. This is recorded so future authorization work appears as a deliberate spec change.

#### Scenario: Delete an existing wish

- **WHEN** a client requests `DELETE /api/:uid/wishes/:id` for a wish that exists under that invitation
- **THEN** the response status is 200
- **AND** the body indicates the wish was deleted

#### Scenario: Wish not found for that invitation

- **WHEN** the wish id does not exist under the given invitation UID
- **THEN** the response status is 404
- **AND** the error message is "Wish not found"

### Requirement: Check whether a guest has submitted

The system SHALL expose `GET /api/:uid/wishes/check/:name` that reports whether a guest with the given name already has a wish for the invitation.

#### Scenario: Name has a wish

- **WHEN** a client checks a name that already submitted a wish for the invitation
- **THEN** the response is `{ success: true, hasSubmitted: true }`

#### Scenario: Name has no wish

- **WHEN** a client checks a name that has not submitted a wish for the invitation
- **THEN** the response is `{ success: true, hasSubmitted: false }`

#### Scenario: Name is missing or blank

- **WHEN** a client checks with an empty or whitespace-only name
- **THEN** the response status is 400
- **AND** the error message indicates the name is required

### Requirement: Attendance statistics

The system SHALL provide attendance statistics for an invitation, returning counts of `attending`, `not_attending`, `maybe`, and `total` wishes. These statistics SHALL be available at `GET /api/:uid/stats`.

NOTE (baseline as shipped): an equivalent statistics handler is also registered under the wishes routes; both compute the same aggregate. This duplication is recorded as current state.

#### Scenario: Retrieve statistics

- **WHEN** a client requests attendance statistics for an invitation
- **THEN** the response status is 200
- **AND** `data` contains `attending`, `not_attending`, `maybe`, and `total` counts

