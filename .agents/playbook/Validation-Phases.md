---
Purpose: This document defines the POC-focused validation gates after the project scaffolding and implementation setup are complete.
---

# UPDATED VALIDATION PHASES — POST-IMPLEMENTATION POC VALIDATION

This playbook begins only after the implementation phases have produced a working SvelteKit application, the Python virtual environment, the `markitdown` binary integration, the conversion route, and the initial upload UI. These steps focus on getting the local server POC working for the user; user-run acceptance follow-up lives in `UA-Testing.md`, and later deployment validation lives in `Deployment-Phases.md`.

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

Validation must pause if any required input is missing. Triage it as follows:

1. Identify the missing input or artifact.
2. Alert the user that validation is paused.
3. Record the issue in a markdown file under `.agents/issues/`.
4. Record possible remediation steps in a similarly named markdown file under `.agents/plans/`.
5. Wait for the assigned strategist agent to review and approve or update the remediation plan before validation resumes.

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
echo "  1) POST a valid sample file to $APP_URL$API_ROUTE from the CLI"
echo "  2) Confirm HTTP 200 and Content-Type: text/markdown; charset=utf-8"
echo "  3) Confirm response body is non-empty markdown output"
echo "  4) Repeat with no file and expect HTTP 400 with a clear error message"
echo "  5) Repeat with file > MAX_FILE_MB and expect HTTP 413 with a clear error message"
echo "  6) Repeat with converter failure input and confirm a controlled error message"
```

### 2.4 Required validation criteria

#### Functionality checks

- the SvelteKit project installs, syncs, type-checks, and builds cleanly
- `src/routes/api/convert/+server.ts` accepts multipart form data and returns Markdown
- missing file, oversized file, unsupported input, and converter failure paths return controlled errors with expected messages
- the runtime resolves `MARKITDOWN_BIN` from environment configuration rather than hard-coded machine-specific paths
- request-scoped conversion artifacts are cleaned up after the request finishes

#### Performance benchmarks

- `pnpm dev` reaches a usable state within 30 seconds on the validation machine
- a small plain-text or markdown-friendly file converts within 7 seconds
- a representative document file converts within 30 seconds
<!-- - 5 back-to-back conversions complete without hung requests, crashes, or corrupted output -->
- repeated conversion stability and batch-style validation are deferred for possible future feature improvements
- `pnpm build` completes successfully without memory-related failure

### 2.5 Success criteria

- `pnpm install`, `pnpm check`, and `pnpm build` all succeed
- manual API smoke tests pass
- performance targets are met or explicitly revised before POC approval
