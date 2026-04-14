# Releasing

## CI workflow

- Workflow: CI
- Trigger: push to main, pull requests to main, or manual workflow_dispatch
- Purpose: validate the repository on GitHub-hosted runners before release

## Release workflow

- Use the `Release` workflow to publish `@auto-no-mous/copilot-web` to npm. Trigger it manually or push a `v*` tag after updating the package version.
- Release type: npm publish package

## Recommended release sequence

1. Run the CI workflow successfully on main.
2. Update package or artifact metadata if needed.
3. Trigger the release workflow manually from GitHub Actions or push a * tag.
4. Verify the published package, container image, or uploaded artifact.

## Notes

- Consumers should install from npm and use the generated browser loader bundle in `dist/browser` when they need a script-tag embed.
