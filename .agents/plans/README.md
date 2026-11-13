---
description: Ordered handoff for cloud agents building and validating the MarkItDown SvelteKit app.
---

# Cloud agent build plan

This repository is a SvelteKit 5 starter. Build the local proof of concept (POC) in [`Implementation-Phases.md`](../playbook/Implementation-Phases.md), then run [`Validation-Phases.md`](../playbook/Validation-Phases.md). [`UA-Testing.md`](../playbook/UA-Testing.md) belongs to the user. [`Deployment-Phases.md`](../playbook/Deployment-Phases.md) is a later, conditional release track. A working local POC is not production approval.

## Rules for the orchestrator and delegates

1. Read this plan, the assigned playbook section, and current repository files before editing. Work from the repository root. Record `git status --short` and preserve unrelated changes.
2. Assign one numbered task below per agent. Pass along its inputs, outputs, prerequisites, and gate. Do not assign downstream work before its prerequisite gate passes. Keep tasks that edit the same file sequential.
3. Treat playbook shell and code blocks as examples, not commands to paste wholesale. Check the OS, installed tools, Svelte version, and package scripts first. Do not regenerate the app, add Express, or assume apt and `sudo` are available.
4. Each delegate finishes its whole task in one pass: inspect, edit, run the gate, and report exact changed paths, command results, remaining issues, and assumptions. A successful build alone does not prove upload conversion works.
5. If a prerequisite or gate fails, stop dependent work. Create `.agents/issues/` if needed, record the blocker in `.agents/issues/<task-id>.md` and a repair proposal in `.agents/plans/<task-id>-repair.md`; send both to the strategist/reviewer before resuming. Never invent a passing result or skip a gate silently.
6. Keep `.venv`, `.env`, uploads, converted files, and secrets out of Git. Do not show uploaded contents or raw converter stderr to users. Remove only request-scoped temporary files, on both success and failure.

## Contract and task order

The browser posts one multipart field named `file` to `POST /api/convert`. Success is HTTP 200 with nonempty Markdown, `Content-Type: text/markdown; charset=utf-8`, and a safe `.md` download filename. Failure is JSON with a short `error` string: 400 for missing or empty input, 413 above `MAX_FILE_MB`, and a controlled non-2xx response for unsupported input, empty output, unavailable converter, or converter failure. `MARKITDOWN_BIN` and `MAX_FILE_MB` are documented in `.env.example` and read by the server at runtime.

Default dependency chain: **I1 -> I2 -> I3 -> I4 -> I5 -> V1 -> V2 -> user UAT**. I3 may run alongside I2 only if file ownership is exclusive; I4 still waits for both. Deployment **D1 -> D2 -> D3 -> D4** starts only when the local POC passes, user acceptance feedback is available, and release work is in scope.

| ID | Playbook phase | Agent output | Prerequisite |
|---|---|---|---|
| I1 | Implementation 1 | Environment and tool report | Repository inspection |
| I2 | Implementation 2 | Working `.venv`, `.gitignore`, CLI smoke result | I1 |
| I3 | Implementation 3 | App config, `.env.example`, build result | I1; exclusive config ownership |
| I4 | Implementation 4 | `src/routes/api/convert/+server.ts` | I2 and I3 |
| I5 | Implementation 4-5 | `src/routes/+page.svelte` | I4 contract and working route |
| V1 | Validation 1 | Readiness checklist | I5 |
| V2 | Validation 2 | Functional and timing record | V1 |
| UAT | UA-Testing | User acceptance checklist | V2 |
| D1-D4 | Deployment 3-6 | Release evidence and decisions | POC, UAT, release scope |

## Implementation tasks

### I1. Establish the toolchain (Implementation Phase 1)

1. Identify the host OS and available `node`, `pnpm`, `python3`, `uv`, `ffmpeg`, `curl`, `git`, MIME libraries, and native build tools. Read `package.json` and the lockfile. Confirm Node is compatible with the checked-in SvelteKit/Vite packages; the playbook's `NODE_VERSION="$(node --version ...)"` example is not a valid major-version requirement.
2. On an apt-based host with installation permission, install only missing required system packages. On another host, use its supported package manager or report the exact prerequisite. Do not assume a persistent interactive shell exists.
3. Make Node, `pnpm`, Python, and `uv` available to following tasks. If network or permissions block installation, return the blocker rather than claiming readiness.
4. Handoff OS, tool versions/paths, packages installed, and commands proving each executable works. **Gate:** Node, `pnpm`, Python/`uv`, and conversion system dependencies are usable.

### I2. Build the Python converter (Implementation Phase 2)

1. At the repository root, add `.venv/`, `uploads/`, and `outputs/` to `.gitignore` before creating files in them. Create or reuse `.venv` with Python 3.12 or newer. Check an existing environment's version and health before reuse. Do not delete a pre-existing environment just because a check fails; report the condition first.
2. Install `markitdown[all]` into the venv with `uv`. Check that `.venv/bin/markitdown` is executable and prints help. Note any optional dependency that cannot be installed.
3. Convert a small known-good text sample through that exact executable. Require exit code 0 and nonempty Markdown. Use a temporary sample and clean only files this task created.
4. Handoff Python/MarkItDown versions, executable path, sample command/result, and any unsupported formats. **Gate:** the project venv CLI works without shell activation.

### I3. Preserve and configure SvelteKit (Implementation Phase 3)

1. Inspect `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, and the routes. Keep the current SvelteKit app and scripts. Do not overwrite the package file with the playbook's generic Node script.
2. Create `.env.example` with `MARKITDOWN_BIN=.venv/bin/markitdown` and `MAX_FILE_MB=100`. Document `PORT=3000` only as the chosen launch port. Resolve the relative binary against the project root at runtime. Keep real `.env` values local.
3. Run `pnpm install --frozen-lockfile` when the lockfile is consistent, then `pnpm check` and `pnpm build`. Report any pre-existing failure. Add `adapter-node` only when a specific Node deployment target needs it.
4. Handoff configuration changes and command results. **Gate:** the starter type-checks/builds and the environment contract is clear.

### I4. Implement the conversion API (Implementation Phase 4)

This is one dependent task. Complete all five steps before handing the route to I5.

1. Add `src/routes/api/convert/+server.ts` as a SvelteKit server endpoint. Parse `request.formData()` and accept its `file` field. Return JSON errors for missing, non-file, empty, and over-limit input. Validate `MAX_FILE_MB` so malformed configuration cannot disable the limit.
2. Create a unique per-request temporary directory outside the repo. Do not trust the uploaded name as a path. Write the bytes, invoke the configured MarkItDown executable with `spawn` arguments, and capture stdout/stderr with a process error handler. Resolve relative `MARKITDOWN_BIN` against the project root. Bound process time and output for the POC.
3. In `finally`, remove only this request's temporary artifacts. Handle spawn failure, nonzero exit, and empty stdout without returning internal paths or raw stderr. Log useful server-side diagnostics.
4. Return nonempty Markdown with the shared headers and sanitized `.md` filename. Keep conversion in the server route; do not add `server.js`, Express, or browser-side Python.
5. Run `pnpm check` and `pnpm build`. Start the app on port 3000 and POST a real sample to `/api/convert`; verify status, headers, and body. Exercise missing-file and over-limit paths. **Gate:** no hung request or temporary residue; success and errors match the contract.

### I5. Build the upload page (Implementation Phases 4 and 5)

1. Replace the starter content in `src/routes/+page.svelte`. Include a file picker, selected name/size, Convert command, busy state, success/download state, reset/retry, and clear errors. Add drag-and-drop only after the picker path works; both must share one selected-file state.
2. Submit `FormData` with `file` to `/api/convert`. Prevent duplicate submissions. On success, download the Markdown using a safely parsed server filename or a `.md` fallback; release object URLs when done. On failure, display the JSON `error` and allow retry.
3. Follow the repository's Svelte 5 runes-mode configuration. Make the form keyboard-accessible and responsive. State the file-size limit. List a supported format only after checking the installed converter and route.
4. Phase 5's `public/index.html` sample is illustrative and points to `/convert`; this app uses `src/routes/+page.svelte` and `/api/convert`. Do not install that sample as the app entry point.
5. Run `pnpm check` and `pnpm build`, then verify select, convert, download, failure, and retry in a browser. **Gate:** the page completes the real upload flow I4 verified at the API.

## Validation and acceptance

### V1. Readiness gate (Validation Phase 1)

1. Confirm `package.json`, `.env.example`, `.venv/bin/markitdown` (or configured path), and `src/routes/api/convert/+server.ts` exist. Verify `node`, `pnpm`, Python, and the converter CLI on this machine.
2. Check that `.env.example` documents `MARKITDOWN_BIN` and `MAX_FILE_MB`; confirm no committed configuration contains a machine-specific path or secret.
3. Follow the blocker procedure above for any missing input. **Gate:** all prerequisites exist and run before functional validation.

### V2. Functional and performance gate (Validation Phase 2)

1. Run `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build`, recording exit codes. Start `pnpm exec vite dev --host 127.0.0.1 --port 3000`; wait for the ready signal, run checks, then stop it cleanly.
2. POST a known-good file to `/api/convert`; record 200, Markdown content type, safe filename, and nonempty body. Repeat with no file (400), empty file (400), and a file above the configured limit (413). Use a real unsupported or converter-failing sample for its controlled-error path; mark it unverified if no sample is available.
3. Confirm temporary input cleanup after success and failure. In a browser, verify file picker, busy state, download, errors, and retry. Check the downloaded Markdown is usable. Use disposable, nonsensitive test files.
4. Measure startup (target <=30 seconds), small-file conversion (<=7 seconds), representative document conversion (<=30 seconds), and build result. A missed or unmeasured target needs explicit disposition before POC approval. The playbook defers repeated-load testing.
5. Handoff a validation record with commands, sample types, statuses, timings, environment, and open risks. **Gate:** all checks pass or have an approved, documented revision.

### UAT. User-run acceptance (`UA-Testing.md`)

After V2, provide the local URL and the playbook checklist to the user. The user, not a cloud agent, confirms the browser workflow and whether the Markdown serves the intended downstream use. Record findings for D3 if a release follows; do not mark UAT complete for them.

## Conditional deployment and closeout

Follow [`Deployment-Phases.md`](../playbook/Deployment-Phases.md) only when a target environment, release owner, and approval path are named. Cloud agents may prepare evidence, but cannot invent peer review, user sign-off, or production approval.

### D1. Production gates (Deployment Phase 3)

1. Obtain target hosting/runtime details. Confirm it can run both the SvelteKit server and the Python converter. Select the SvelteKit adapter for that target and test the actual artifact, not just `pnpm dev`.
2. Re-run V2 checks on each supported platform. Verify `MARKITDOWN_BIN`, `MAX_FILE_MB`, logs, and rollback/redeploy procedure there.
3. Collect peer review, resolve blocking comments, and request explicit sign-offs from the implementation owner, maintainer/reviewer, and user/designated approver. **Gate:** all four production gates have evidence and named approvers.

### D2. Complete documentation (Deployment Phase 4)

1. Write/update the setup guide, user manual, API contract, operations notes, and validation record against actual behavior. Include prerequisites, startup commands, upload limits, response codes, binary path, failure diagnosis, and measurements.
2. Have a reviewer follow setup/operations instructions on a fresh environment and correct missing steps. **Gate:** all five documents exist and are auditable before final approval.

### D3. Collect and disposition feedback (Deployment Phase 5)

1. Share a preview/test deployment through the existing delivery channel. Gather code feedback in the PR, defects in the issue tracker, and product feedback in user notes during the playbook's Day 0-5 window.
2. Triage each significant finding as must-fix, should-fix, backlog, or rejected with approver agreement. Record owner, rationale, and milestone for deferrals; review blockers within one business day. **Gate:** no unreviewed user feedback or unresolved must-fix remains.

### D4. Final review and closeout (Deployment Phase 6)

1. Assemble scope checklist, V1/V2 evidence, UAT findings, production gate approvals, documentation, and feedback dispositions.
2. Have the implementation owner, maintainer/reviewer, and user/designated approver decide acceptance. If a criterion fails, return it to its implementation or validation task and repeat dependent gates. **Gate:** record the final decision and approvers before marking the project complete.
