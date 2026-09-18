---
Purpose: This document defines the validation and acceptance gates after the project scaffolding and implementation setup are complete.
---

# UPDATED VALIDATION PHASES — POST-IMPLEMENTATION ACCEPTANCE

This playbook begins only after the implementation phases have produced a working SvelteKit application, the Python virtual environment, the `markitdown` binary integration, the conversion route, and the initial upload UI. These steps define how to validate readiness, collect acceptance feedback, and approve the project for completion.

---

## UPDATED VARIABLES (add to top of validation session)

```bash
SERVICE_DIR="$(pwd)"
VENV_DIR="$SERVICE_DIR/.venv"
APP_URL="http://127.0.0.1:3000"
API_ROUTE="/api/convert"
MARKITDOWN_BIN="${MARKITDOWN_BIN:-$VENV_DIR/bin/markitdown}"
MAX_FILE_MB="${MAX_FILE_MB:-100}"
```

---

## UPDATED PHASE 1 — VALIDATION READINESS GATE

```bash
# ── 1.1 Confirm repository and implementation handoff ───────────────────────────
echo "── 1.1 Confirming implementation handoff ──"

test -f "$SERVICE_DIR/package.json" \
  || { echo "✗ package.json missing"; exit 1; }

test -f "$SERVICE_DIR/.agents/playbook/Implementation-Phases.md" \
  || { echo "✗ Implementation playbook missing"; exit 1; }

test -d "$VENV_DIR" \
  || { echo "✗ Python virtual environment missing at $VENV_DIR"; exit 1; }

test -x "$MARKITDOWN_BIN" \
  || { echo "✗ markitdown binary missing or not executable at $MARKITDOWN_BIN"; exit 1; }

test -f "$SERVICE_DIR/src/routes/api/convert/+server.ts" \
  || { echo "✗ Conversion route missing"; exit 1; }
```

```bash
# ── 1.2 Confirm baseline project commands are available ─────────────────────────
echo ""
echo "── 1.2 Confirming baseline toolchain ──"

node --version
pnpm --version
python3 --version
"$MARKITDOWN_BIN" --help >/dev/null
```

```bash
# ── 1.3 Confirm configuration handoff artifacts ─────────────────────────────────
echo ""
echo "── 1.3 Confirming configuration artifacts ──"

test -f "$SERVICE_DIR/.env.example" \
  || { echo "✗ .env.example missing"; exit 1; }

grep -q '^MARKITDOWN_BIN=' "$SERVICE_DIR/.env.example" \
  || { echo "✗ .env.example does not document MARKITDOWN_BIN"; exit 1; }

grep -q '^MAX_FILE_MB=' "$SERVICE_DIR/.env.example" \
  || { echo "✗ .env.example does not document MAX_FILE_MB"; exit 1; }
```

### 1.4 Readiness gate result

Validation must stop and return to implementation if any of the following are missing:

- bootable SvelteKit app structure
- working Python venv and executable `markitdown` binary
- conversion endpoint in the SvelteKit runtime
- environment example values for local setup
- implementation branch containing the intended scaffolding and runtime changes

### 1.5 Success criteria

- all readiness checks complete without manual repair
- all required implementation artifacts exist in the repository
- the validation lead can proceed without guessing missing setup details

---

## UPDATED PHASE 2 — FUNCTIONAL + PERFORMANCE VALIDATION

```bash
# ── 2.1 Install dependencies and validate project integrity ─────────────────────
echo "── 2.1 Installing dependencies and validating project integrity ──"

cd "$SERVICE_DIR" || exit 1
pnpm install
pnpm check
pnpm build
```

```bash
# ── 2.2 Start the app for smoke testing ─────────────────────────────────────────
echo ""
echo "── 2.2 Starting local validation server ──"

pnpm dev
```

```bash
# ── 2.3 API smoke test scenarios to execute while dev server is running ─────────
echo ""
echo "── 2.3 API smoke test checklist ──"
echo "  1) POST a valid sample file to $APP_URL$API_ROUTE"
echo "  2) Confirm HTTP 200 and Content-Type: text/markdown; charset=utf-8"
echo "  3) Confirm response body is non-empty markdown output"
echo "  4) Repeat with no file and expect HTTP 400"
echo "  5) Repeat with file > MAX_FILE_MB and expect HTTP 413"
echo "  6) Repeat with converter failure input and confirm controlled error response"
```

```bash
# ── 2.4 Browser smoke test scenarios ────────────────────────────────────────────
echo ""
echo "── 2.4 Browser smoke test checklist ──"
echo "  1) Open $APP_URL"
echo "  2) Upload a supported sample file"
echo "  3) Submit conversion and confirm download or rendered success state"
echo "  4) Confirm the UI shows a clear error for empty submission"
echo "  5) Confirm the UI remains responsive across repeated submissions"
```

### 2.5 Required validation criteria

#### Functionality checks

- the SvelteKit project installs, syncs, type-checks, and builds cleanly
- the upload flow accepts a supported file and completes without UI or server errors
- `src/routes/api/convert/+server.ts` accepts multipart form data and returns Markdown
- missing file, oversized file, unsupported input, and converter failure produce controlled errors
- the runtime resolves `MARKITDOWN_BIN` from environment configuration rather than hard-coded machine-specific paths
- request-scoped conversion artifacts are cleaned up after the request finishes

#### Performance benchmarks

- `pnpm dev` reaches a usable state within 30 seconds on the validation machine
- a small plain-text or markdown-friendly file converts within 3 seconds
- a representative document file converts within 10 seconds
- 5 back-to-back conversions complete without hung requests, crashes, or corrupted output
- `pnpm build` completes successfully without memory-related failure

#### User acceptance testing

At least one stakeholder or designated proxy user must confirm:

- the upload flow is understandable without developer assistance
- the returned Markdown is usable for the intended downstream workflow
- the visible error messages are actionable enough for retry or correction
- the delivered implementation matches the agreed project scope

### 2.6 Success criteria

- `pnpm install`, `pnpm check`, and `pnpm build` all succeed
- manual API and browser smoke tests pass
- performance targets are met or explicitly revised before release approval
- any failed UAT scenario is recorded as a release blocker

---

## UPDATED PHASE 3 — ACCEPTANCE GATES BEFORE PRODUCTION

```bash
# ── 3.1 Required code-review gate ───────────────────────────────────────────────
echo "── 3.1 Code-review gate ──"
echo "  ✓ At least one peer review completed"
echo "  ✓ No unresolved blocking review conversations"
echo "  ✓ Correctness, operability, and security concerns addressed"
```

```bash
# ── 3.2 Required deployment-readiness gate ──────────────────────────────────────
echo ""
echo "── 3.2 Deployment-readiness gate ──"

node --version
python3 --version
test -x "$MARKITDOWN_BIN"
test -f "$SERVICE_DIR/.env.example"
```

### 3.3 Production gates that must pass

#### Gate A — Change review gate

- at least one peer review is completed on the implementation branch
- all blocking review comments are resolved
- no unresolved correctness or deployment objections remain

#### Gate B — Verification gate

- the Phase 2 validation commands complete successfully
- the API smoke tests cover both success and failure responses
- the browser smoke tests confirm the end-user path works as expected
- `.env.example` accurately reflects the required runtime configuration

#### Gate C — Deployment-readiness gate

- the target environment has Node.js, Python, and the documented `markitdown` path available
- file-size limits and environment variables are explicitly defined before deployment
- operators have enough logs and error visibility to diagnose conversion failures
- rollback or redeploy expectations are known to the release owner

#### Gate D — Release decision gate

Production approval requires explicit sign-off from:

- implementation owner
- repository maintainer or technical reviewer
- stakeholder or product representative accepting scope completion

### 3.4 Success criteria

- all four production gates pass without open blockers
- sign-off ownership is explicit rather than assumed
- no release proceeds on the basis of “works on my machine” validation alone

---

## UPDATED PHASE 4 — DOCUMENTATION COMPLETION GATE

```bash
# ── 4.1 Documentation inventory to confirm before acceptance ────────────────────
echo "── 4.1 Documentation inventory ──"
echo "  - setup guide"
echo "  - user manual"
echo "  - API documentation"
echo "  - operations notes"
echo "  - validation record"
```

### 4.2 Required documentation

| Document | Minimum required content |
|---|---|
| Setup guide | prerequisites, install steps, environment variables, how to start the SvelteKit app |
| User manual | how to upload a file, expected output, known limits, common failure cases |
| API documentation | endpoint path, request format, response format, error responses, size or type constraints |
| Operations notes | location of the Python venv, `MARKITDOWN_BIN` expectations, deployment considerations |
| Validation record | commands executed, smoke-test scenarios run, benchmark results, open risks or deferrals |

### 4.3 Documentation rule

Documentation is part of the acceptance gate. It must be complete before final approval, not scheduled as a follow-up after release.

### 4.4 Success criteria

- all five documentation items exist and reflect the implemented behavior
- setup and operations guidance can be followed without tribal knowledge
- validation evidence is recorded in a way reviewers can audit later

---

## UPDATED PHASE 5 — FEEDBACK COLLECTION + DISPOSITION

```bash
# ── 5.1 Feedback timeline checkpoint ────────────────────────────────────────────
echo "── 5.1 Feedback timeline ──"
echo "  Day 0  : share preview build or test deployment"
echo "  Days 1-3: collect reviewer, stakeholder, and user feedback"
echo "  Day 4  : triage findings into must-fix / should-fix / backlog"
echo "  Day 5  : confirm fixes or document approved deferrals"
```

### 5.2 Required feedback channels

Use existing delivery channels only:

- pull request review comments for code-specific concerns
- issue tracker items for defects and follow-up requests
- stakeholder notes or acceptance checklists for product feedback

### 5.3 Feedback handling rules

- blockers must be reviewed within one business day
- accepted non-blocking improvements must become tracked follow-up work
- deferred issues must record owner, rationale, and target milestone
- rejected UAT findings may not be silently downgraded without approver agreement

### 5.4 Success criteria

- feedback is gathered inside a defined time window
- every significant finding receives a clear disposition
- no final approval occurs while stakeholder feedback is still unreviewed

---

## UPDATED PHASE 6 — FINAL REVIEW + PROJECT CLOSEOUT

```bash
# ── 6.1 Final review checklist ──────────────────────────────────────────────────
echo "── 6.1 Final review checklist ──"
echo "  1) Confirm implementation scope matches the approved playbook"
echo "  2) Review Phase 2 validation evidence"
echo "  3) Review documentation completeness"
echo "  4) Review open risks and deferred items"
echo "  5) Approve completion or return work to implementation"
```

### 6.2 Required participants

- implementation owner
- repository maintainer or technical reviewer
- stakeholder, product owner, or designated approver

### 6.3 Final review criteria

The project can be marked complete only when:

- all Phase 1 readiness checks have passed
- all Phase 2 validation criteria and benchmarks have passed
- all Phase 3 production gates have passed
- all Phase 4 documentation requirements are present and current
- all Phase 5 feedback has been reviewed and dispositioned
- final reviewers agree the SvelteKit + `markitdown` workflow is ready for its intended environment

### 6.4 Closeout rule

If any criterion fails, the work returns to implementation or validation. Do not close the project on partial acceptance.

### 6.5 Success criteria

- completion is based on evidence, not assumption
- approvers and release owners are explicitly identified
- the delivered project is operationally ready, documented, and accepted
