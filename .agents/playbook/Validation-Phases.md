---
Purpose: This document defines the validation and acceptance gates after the project scaffolding and implementation setup are complete.
---

# VALIDATION PHASES — POST-IMPLEMENTATION ACCEPTANCE

This playbook starts after the implementation phases have delivered a bootable SvelteKit application, the Python `markitdown` environment, the conversion route, and the basic upload UI. The goal is to confirm the system is production-ready, documented, and accepted by stakeholders before release.

---

## VALIDATION INPUTS

Before starting validation, confirm the implementation handoff includes:

- a working SvelteKit app structure
- the Python virtual environment and `MARKITDOWN_BIN` wiring
- the upload and conversion flow in the app runtime
- environment examples for local setup
- a branch that contains all scaffolding and implementation changes

If any input is missing, stop validation and return the work to implementation.

---

## PHASE 1 — COMPLETION CRITERIA

Project completion is reached only when **all** of the following criteria pass.

### 1.1 Functional checks

| Area | Required outcome | Acceptance signal |
|---|---|---|
| App bootstrap | The SvelteKit project installs, syncs, type-checks, and builds cleanly | `pnpm install`, `pnpm check`, and `pnpm build` succeed |
| Upload flow | A user can select a supported file and submit it without UI or server errors | Manual smoke test passes in browser |
| Conversion route | `src/routes/api/convert/+server.ts` accepts multipart form data and returns Markdown | Successful conversion response with `text/markdown` output |
| Failure handling | Missing file, unsupported input, oversized file, and converter failure return controlled errors | No uncaught exception or blank failure state |
| Binary integration | The app resolves `MARKITDOWN_BIN` from environment configuration and invokes the venv binary | Conversion works without manual path edits in code |
| Cleanup behavior | Temporary conversion artifacts are removed after request completion | No leaked request files after smoke test |

### 1.2 Performance benchmarks

Use representative sample files that match the intended launch scope.

| Benchmark | Minimum pass condition |
|---|---|
| Local cold start | `pnpm dev` reaches a usable state in <= 30 seconds on the validation machine |
| Small-file conversion | A small plain-text or markdown-compatible file converts in <= 3 seconds |
| Typical-file conversion | A representative office or document file converts in <= 10 seconds |
| Repeated conversion stability | 5 back-to-back conversions complete without process crash, hung request, or corrupted output |
| Build performance | `pnpm build` completes without memory-related failure and produces a deployable output |

If the team decides to support larger files or higher throughput, replace these baseline numbers with stricter environment-specific targets before production approval.

### 1.3 User acceptance testing

The project is not complete until at least one stakeholder or designated tester confirms:

- the upload flow is understandable without developer guidance
- returned Markdown is usable for the expected downstream workflow
- error messages are clear enough for retry or correction
- the basic setup satisfies the agreed implementation scope

Record any rejected scenario as a release blocker.

---

## PHASE 2 — ACCEPTANCE GATES BEFORE PRODUCTION

All gates below must pass in order.

### Gate 2.1 — Change review gate

- at least one peer review is completed on the implementation branch
- review comments affecting correctness, security, or operability are resolved
- no unresolved blocking conversations remain on the pull request

### Gate 2.2 — Verification gate

Run the smallest project-native validation set that covers the delivered work:

```bash
pnpm install
pnpm check
pnpm build
```

Also complete:

- a manual browser smoke test of upload -> convert -> output review
- an API-level smoke test for success and failure responses
- a validation of environment-variable setup using `.env.example`

### Gate 2.3 — Deployment-readiness gate

Before approval to deploy:

- the target environment has Python, Node.js, `uv`, and the `markitdown` binary path available as documented
- required directories, file-size limits, and environment variables are defined
- logs and error output are visible enough to diagnose failed conversions
- rollback or redeploy steps are known to the operator responsible for release

### Gate 2.4 — Release decision gate

Production approval requires explicit sign-off from:

- implementation owner
- reviewer or maintainer
- product/stakeholder representative for scope acceptance

If any sign-off is missing, the release remains blocked.

---

## PHASE 3 — REQUIRED DOCUMENTATION BEFORE FINAL ACCEPTANCE

The following documentation must exist and be current before the work is accepted:

| Document | Minimum required content |
|---|---|
| Setup guide | local prerequisites, install steps, environment variables, how to start the app |
| User manual | how to upload a file, what output to expect, known limits, common failure cases |
| API documentation | endpoint path, request format, response format, error cases, file-size or type constraints |
| Operations notes | location of the Python venv, `MARKITDOWN_BIN` expectations, deployment-specific considerations |
| Validation record | commands run, smoke-test scenarios covered, benchmark results, open risks if any |

Documentation is part of acceptance, not a follow-up task.

---

## PHASE 4 — FEEDBACK MECHANISM

Collect feedback in a short, time-boxed loop after the implementation branch is deemed functionally ready.

### 4.1 Collection window

- Day 0: share the preview build or test deployment with reviewers and stakeholders
- Days 1-3: gather feedback from implementation owner, reviewer, and at least one intended user or proxy user
- Day 4: triage findings into must-fix, should-fix, and post-release backlog items
- Day 5: confirm fixes or document deferrals before final sign-off

### 4.2 Feedback channels

Use existing team channels only, such as:

- pull request review comments for code-specific issues
- issue tracker items for defects or follow-up requests
- stakeholder notes or acceptance checklist comments for product feedback

### 4.3 Review cadence

- blockers must be reviewed within one business day
- accepted scope changes must be turned into tracked follow-up work
- deferred issues must include owner, rationale, and target milestone

---

## PHASE 5 — FINAL REVIEW PROCESS

### 5.1 Required participants

- implementation owner
- repository maintainer or technical reviewer
- stakeholder, product owner, or designated approver

### 5.2 Final review agenda

1. Confirm implementation scope matches the approved playbook direction.
2. Review validation evidence: `pnpm check`, `pnpm build`, smoke tests, and benchmarks.
3. Confirm documentation is complete and usable by both operators and end users.
4. Review unresolved risks, limitations, and explicitly deferred items.
5. Approve release, request follow-up changes, or reject completion.

### 5.3 Final review criteria

The project can be marked complete only when:

- all completion criteria in Phase 1 are met
- all production gates in Phase 2 are passed
- all required documentation in Phase 3 is present
- feedback in Phase 4 has been reviewed and dispositioned
- final participants agree the delivered SvelteKit + `markitdown` workflow is ready for its intended environment

If any criterion fails, move the work back to implementation or validation as appropriate rather than closing the project.
