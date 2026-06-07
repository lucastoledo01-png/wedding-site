## ADDED Requirements

### Requirement: Centralized motion tokens

The application SHALL define animation timing in a single shared module rather than as inline values in components. The module SHALL expose named duration tiers and named easing values, and components SHALL consume these tokens instead of hardcoded numbers.

#### Scenario: Components reference shared duration tiers

- **WHEN** a component animates content
- **THEN** its duration is taken from a named tier in the shared motion module (e.g. fast / base / slow)
- **AND** no animation specifies a raw numeric duration inline

#### Scenario: Easing is standardized

- **WHEN** a non-decorative animation runs
- **THEN** it uses an easing value drawn from the shared motion module rather than relying on an unspecified default

### Requirement: Reusable motion variants

The shared motion module SHALL provide reusable variant presets for the recurring animation patterns in the app, including at least: a fade, a fade-up (opacity + upward translation into place), a scale-in, and page enter/exit. Components SHALL use these presets for those patterns.

#### Scenario: Equivalent reveals animate identically

- **WHEN** two different components both perform a "fade up into place" reveal
- **THEN** both use the same shared variant preset
- **AND** they share identical duration, easing, and translation distance

#### Scenario: Staggered reveals use a shared helper

- **WHEN** a group of sibling elements animates in sequence (e.g. a hero cascade)
- **THEN** the stagger timing is produced by the shared motion module rather than per-element hardcoded delays

### Requirement: Deliberate page transition

The transition between the landing view and the main invitation view SHALL be a deliberate, symmetric pair: the exit of the outgoing view and the entrance of the incoming view SHALL use coordinated timing and direction from the shared motion module, rather than mismatched independent animations.

#### Scenario: Opening the invitation

- **WHEN** the user opens the invitation from the landing view
- **THEN** the landing view exits and the main view enters using the shared page enter/exit variants
- **AND** the two halves share consistent timing and directional intent so the transition reads as a single continuous motion

### Requirement: Respect reduced-motion preference

The application SHALL respect the operating system / browser `prefers-reduced-motion` setting. When reduced motion is requested, animations SHALL avoid positional and scale movement, collapsing to instant changes or simple opacity fades.

#### Scenario: User prefers reduced motion

- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** content appears without translation, scaling, or looping movement
- **AND** any remaining transition is limited to opacity or is instant

#### Scenario: User has no reduced-motion preference

- **WHEN** the user has not requested reduced motion
- **THEN** the full motion presets apply as defined by the shared module
