# Quant Ecosystem Risk Register

## CRITICAL

_(none)_

## HIGH

_(none)_

## MEDIUM

### R-001: E2E and load tests are advisory-only (no live staging)

- **Impact:** Cannot validate real user flows or performance under load before production
- **Details:** E2E tests exist but run against mocked backends. No staging environment is provisioned to run them against real infrastructure.
- **Mitigation:** Provision a staging environment and wire E2E tests into CI as a blocking gate

### R-002: Helm/Terraform configs not validated against a real cluster

- **Impact:** Infrastructure-as-code may drift from actual deployment requirements
- **Details:** Helm charts and Terraform configs exist but have never been applied to a live or preview cluster.
- **Mitigation:** Create a preview/dev cluster and run `terraform plan` + `helm template` validation in CI

## LOW

### R-003: Some frontend pages still use mock data

- **Impact:** Users may see placeholder content if pages are accessed before backend wiring is complete
- **Details:** Tracked in `.agents/state/mock-debt.csv`. These pages render but pull from static fixtures rather than live APIs.
- **Mitigation:** Wire remaining pages to real API endpoints per the mock-debt tracker

### R-004: Moderate npm audit vulnerabilities (0 high/critical, 7 moderate)

- **Impact:** Minor security exposure from transitive dependencies
- **Details:** `pnpm audit` reports 0 high/critical and 7 moderate severity vulnerabilities, all in transitive dependency trees.
- **Mitigation:** Monitor upstream fixes and upgrade affected packages when patches are available

## INFO

### R-005: Capacitor native builds require Xcode/Android Studio

- **Impact:** Mobile app (quant-mobile) cannot be built or tested in standard CI
- **Details:** The Capacitor-based mobile app requires platform-specific toolchains (Xcode for iOS, Android Studio for Android) that are not available in the CI environment.
- **Mitigation:** Add dedicated mobile CI runners with platform SDKs, or validate via cloud build services
