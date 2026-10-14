# Server Upload-Limit Refactor Plan

## Objective

Prepare a focused follow-up PR to keep upload-size limit calculations in `src/lib/server/upload-limit.ts`.

## Current behavior

- `upload-limit.ts` provides `getMaxFileMb()` and `getMaxFileBytes()`.
- The conversion route obtains the configured byte limit once and uses it to check both the request `Content-Length` (with multipart overhead) and the parsed file size.
- The route owns request parsing and HTTP error responses.

## Scope

- In the follow-up PR after the current PR is merged, review the route's `maxBytes` checks and consolidate any remaining upload-size threshold calculation in `upload-limit.ts`.
- Keep multipart parsing, request validation, and HTTP response handling in the route.
- Avoid duplicating configuration or changing the configured maximum file size behavior.
- Do not modify the current route or helper as part of this planning task.

## Implementation sequence

1. Confirm the file-size and multipart request-size limits and their intended relationship.
2. Add or adjust a focused helper in `upload-limit.ts` for any shared threshold calculation.
3. Update the route to use the helper while preserving both early `Content-Length` rejection and parsed-file-size validation.
4. Add or update tests for configured limits, multipart overhead, and boundary values.

## Acceptance criteria

- The route and helper use one consistent configured file-size limit.
- Oversized requests and files continue to receive the existing `413` response.
- Valid uploads at the limit continue to be accepted.
- `pnpm check` and `pnpm build` pass, along with any relevant tests.
