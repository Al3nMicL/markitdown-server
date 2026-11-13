# POC Validation Record

**Date:** 2026-10-12  
**Scope:** Local MarkItDown POC; user acceptance and production deployment are not included.

## Environment

- Host: Ubuntu 24.04, Linux x86_64
- Node.js: 22.23.3
- pnpm (via Corepack): 12.11.2
- Python: 3.12.3
- uv: 0.13.0
- MarkItDown: 0.1.8, installed as `markitdown[all]` in `.venv`
- FFmpeg: 6.1.1
- Converter: `.venv/bin/markitdown` (default resolved from the repository root)
- Upload limit: 100 MB by default

## Build and startup

| Command or action | Result |
|---|---|
| `corepack pnpm install --frozen-lockfile` | Passed; lockfile unchanged |
| `corepack pnpm check` | Passed; 0 errors and 0 warnings |
| `corepack pnpm build` | Passed; Vite build completed in 2.27 seconds |
| `corepack pnpm exec vite dev --host 127.0.0.1 --port 3000` | Ready in 0.923 seconds |

## Conversion and HTTP results

| Sample or scenario | Result |
|---|---|
| Plain-text `.txt` through `POST /api/convert` | HTTP 200 in 1.514 seconds; nonempty Markdown; `text/markdown; charset=utf-8`; safe `sample.md` attachment filename |
| One-page representative `.pdf` through `POST /api/convert` | HTTP 200 in 0.877 seconds; nonempty Markdown; correct content type and safe `.md` attachment filename |
| MarkItDown CLI plain-text smoke sample | Exit code 0 and nonempty Markdown |
| Missing upload | HTTP 400 JSON error |
| Non-file `file` field | HTTP 400 JSON error |
| Empty file | HTTP 400 JSON error |
| 105-byte file with `MAX_FILE_MB=0.0001` | HTTP 413 JSON error |
| Oversized request body with that small configured limit | HTTP 413 before multipart parsing |
| Invalid `MAX_FILE_MB` setting | UI displayed the 100 MB default; request beyond that configured default returned HTTP 413 |
| Unsupported `.unknown` input | HTTP 422 JSON error |
| Missing converter executable | HTTP 503 JSON error |

Temporary conversion directories in `/tmp` were unchanged after successful conversions and tested error cases.

## Browser workflow

Validated with Chromium 154.0.8037.0 in headless mode:

- The page displayed the configured size limit and the selected file name and size.
- Empty selection kept the submit button disabled, showed a useful error if submitted programmatically, and made no API request.
- An unsupported sample showed the converter error and allowed retry; a following `.txt` conversion returned HTTP 200.
- The success state provided a `sample.md` download link; both the browser download and Markdown contents were verified.
- At a 375-pixel viewport, the converter card fit without horizontal page overflow.

## Acceptance and remaining scope

The measured startup, small-file conversion, representative-document conversion, and build results meet the playbook targets. Only `.txt` and `.pdf` samples were verified; other formats are not claimed as supported. User acceptance remains with the user per `UA-Testing.md`. Production deployment and sign-off are outside this POC task.
