---
Purpose: This document captures deployment and post-POC release validation steps that should be revisited after the local POC has passed.
---

# DEPLOYMENT PHASES — POST-POC FOLLOW-UP

This playbook is intentionally separated from `Validation-Phases.md`. Use it only after the local POC validation passes and deployment planning is in scope.

## PHASE 3 — ACCEPTANCE GATES BEFORE PRODUCTION

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

- the validation commands from `Validation-Phases.md` complete successfully
- the API smoke tests cover both success and failure responses
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
- user or designated approver accepting scope completion

### 3.4 Success criteria

- all four production gates pass without open blockers
- sign-off ownership is explicit rather than assumed
- no release proceeds without validation on each supported platform

---

## PHASE 4 — DOCUMENTATION COMPLETION GATE

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

Documentation is part of the later acceptance gate. It must be complete before final approval, not scheduled as a follow-up after release.

### 4.4 Success criteria

- all five documentation items exist and reflect the implemented behavior
- setup and operations guidance can be followed without tribal knowledge
- validation evidence is recorded in a way reviewers can audit later

---

## PHASE 5 — FEEDBACK COLLECTION + DISPOSITION

```bash
# ── 5.1 Feedback timeline checkpoint ────────────────────────────────────────────
echo "── 5.1 Feedback timeline ──"
echo "  Day 0  : share preview build or test deployment"
echo "  Days 1-3: collect reviewer and user feedback"
echo "  Day 4  : triage findings into must-fix / should-fix / backlog"
echo "  Day 5  : confirm fixes or document approved deferrals"
```

### 5.2 Required feedback channels

Use existing delivery channels only:

- pull request review comments for code-specific concerns
- issue tracker items for defects and follow-up requests
- user notes or acceptance checklists for product feedback

### 5.3 Feedback handling rules

- blockers must be reviewed within one business day
- accepted non-blocking improvements must become tracked follow-up work
- deferred issues must record owner, rationale, and target milestone
- rejected UAT findings may not be silently downgraded without approver agreement

### 5.4 Success criteria

- feedback is gathered inside a defined time window
- every significant finding receives a clear disposition
- no final approval occurs while user feedback is still unreviewed

---

## PHASE 6 — FINAL REVIEW + PROJECT CLOSEOUT

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
- user or designated approver

### 6.3 Final review criteria

The project can be marked complete only when:

- all readiness checks from `Validation-Phases.md` have passed
- all POC validation criteria and benchmarks have passed
- all production gates in this document have passed
- all documentation requirements are present and current
- all feedback has been reviewed and dispositioned
- final reviewers agree the SvelteKit + `markitdown` workflow is ready for its intended environment

### 6.4 Closeout rule

If any criterion fails, the work returns to implementation or validation. Do not close the project on partial acceptance.

### 6.5 Success criteria

- completion is based on evidence, not assumption
- approvers and release owners are explicitly identified
- the delivered project is operationally ready, documented, and accepted
