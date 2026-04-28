# Enterprise Readiness

## Repository

- Name: ai-copilot-sdk
- Operational owner: Auto-no-mous AI platform maintainers
- Readiness tier: baseline enterprise hardening in progress

## Supported Environments

- Local development: synthetic data only
- Playground: shared integration environment with non-production data
- QA/Staging: controlled validation environment
- Production: customer-facing environment requiring protected deployment approval

## Data Sensitivity

Do not commit secrets, customer data, production logs, access tokens, or private customer prompts.
Use synthetic or masked data for examples, tests, screenshots, and demos.

## Required Controls

- Branch protection and pull request review before merge
- Secret scanning and dependency review on pull requests
- High and critical vulnerability scanning for code, dependencies, containers, and IaC
- Audit trail for production-impacting changes
- Documented rollback or remediation path for releases

## Release Expectations

Releases should be traceable to a commit SHA, CI run, and artifact or image digest.
Production promotion should use protected GitHub environments and smoke validation.

## Evidence

Keep CI logs, release artifacts, SBOMs, vulnerability scan outputs, and approval records available for enterprise reviews.

