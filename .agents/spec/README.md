---
description: Product and behavior specification for the local MarkItDown converter POC.
---

# MarkItDown file converter

## Purpose

Build a local web app that lets a person upload one file and download its contents as Markdown. The app uses the existing SvelteKit project for the browser page and HTTP endpoint. The server calls the MarkItDown command installed in a project-local Python virtual environment to perform the conversion.

The first deliverable is a working local proof of concept (POC) at `http://127.0.0.1:3000`. Production deployment is a separate, later decision.

## User flow

1. Open the app and choose one file. The page shows the selected file's name and size.
2. Select **Convert to Markdown**. The page shows that conversion is in progress and prevents a second submission of the same request.
3. On success, download a nonempty `.md` file. The page shows a clear success state and allows another conversion.
4. On failure, see a short, useful error and retry or choose another file. An empty selection never starts a conversion.

The file picker must work with keyboard and pointer input and on narrow screens. Drag-and-drop is optional. The page may name supported formats only after they have been verified with the installed converter; installing `markitdown[all]` does not guarantee that every format will work on every machine.

## Application behavior

- Keep the application in SvelteKit. The page lives at `src/routes/+page.svelte`; the server endpoint lives at `src/routes/api/convert/+server.ts`. Do not create a separate Express app or use a standalone `public/index.html` as the application page.
- The browser sends `POST /api/convert` as `multipart/form-data` with exactly one upload field named `file`.
- A successful response has HTTP 200, a nonempty Markdown body, `Content-Type: text/markdown; charset=utf-8`, and a safe `.md` filename in `Content-Disposition` for download.
- Error responses are JSON with an `error` string. Missing, non-file, or empty input returns HTTP 400. Input above the configured size limit returns HTTP 413. Unsupported input, empty converter output, a missing converter, and converter failures return controlled non-2xx responses. The browser displays the error and stays usable for retry.
- The default maximum upload size is 100 MB, set through `MAX_FILE_MB`. A missing or invalid setting must not remove the limit.
- The server reads `MARKITDOWN_BIN` from its environment. The documented local value is `.venv/bin/markitdown`, resolved from the repository root. `.env.example` documents both settings; real machine-specific values stay out of Git.
- Each request uses its own temporary input path. Uploaded names never become trusted filesystem paths. Temporary files are removed after success and failure. Files and converted output are not kept by the app after the request.
- Converter execution must not hang indefinitely. Internal paths, raw converter stderr, and uploaded contents must not appear in browser errors.

## Local setup

Use the repository's existing `pnpm` and SvelteKit setup. Create a `.venv` with Python 3.12 or newer, install `markitdown[all]`, and verify that its command can convert a small known-good file before wiring it to the server. The app starts on port 3000 for local validation. Keep `.venv`, generated uploads, outputs, and real `.env` files out of Git.

## POC acceptance

The POC is ready for the user's acceptance test when all of these are true:

1. `pnpm check` and `pnpm build` pass, and the app starts locally.
2. A real file converts through both the HTTP endpoint and the browser page. The response and downloaded file contain usable, nonempty Markdown.
3. Missing, empty, oversized, and converter-failing uploads produce controlled errors without leaving request files behind.
4. The page supports select, convert, download, failure, and retry without becoming stuck.
5. The validation record includes the tested sample types, HTTP results, build result, and measured startup and conversion times. The playbook targets startup within 30 seconds, a small file within 7 seconds, and a representative document within 30 seconds. Any missed target needs an explicit decision before POC approval.

The user completes the separate checklist in [`UA-Testing.md`](../playbook/UA-Testing.md). An agent must not mark user acceptance complete on the user's behalf.

## Scope boundary

This POC handles one file per request. Batch conversion and repeated-load testing are deferred. It does not require accounts, persistent file storage, or production hosting. Deployment, documentation for release, peer review, feedback disposition, and production sign-off follow the separate [`Deployment-Phases.md`](../playbook/Deployment-Phases.md) when a release is in scope.

For task order and agent handoffs, use [`../plans/README.md`](../plans/README.md). For detailed implementation and validation procedures, use the playbooks linked above.
