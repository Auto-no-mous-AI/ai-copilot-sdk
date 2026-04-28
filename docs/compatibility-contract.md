# SDK Compatibility Contract

## Package

`@auto-no-mous/copilot-web`

## Stable Surface

- `initCopilot(options)` remains the primary bootstrap API.
- The browser loader remains available through the `./loader` export.
- The script-tag loader continues to support app ID, environment, install token, and API base URL attributes.

## Enterprise Guarantees

- SDK initialization must fail closed when required configuration is missing.
- Tokens must be treated as secrets and must not be logged.
- The widget must expose deterministic teardown behavior for host apps and tests.
- Network failures should surface actionable user-facing errors without leaking sensitive backend details.

## Versioning

Breaking changes require a major version bump and migration notes in `CHANGELOG.md`.
