# UI Refactor Plan

## Objective

Prepare a focused follow-up PR to decompose the conversion page UI logic into reusable Svelte components.

## Scope

- Keep conversion orchestration and shared page state in `src/routes/+page.svelte`.
- Extract the file selection and drag-and-drop interactions into `FileDropzone.svelte`, including file-input triggering and selection validation.
- Extract loading, error, and success feedback into `ConversionStatus.svelte`.
- Extract the successful conversion presentation and download actions into `DownloadCard.svelte`.
- Preserve the current upload, conversion, download, reset, and accessibility behavior.
- Do not modify the current page or create component files as part of this planning task; implement only in the follow-up PR.

## Implementation sequence

1. Define component props and events around the current page state and behavior.
2. Extract the dropzone and selection interactions, then integrate it with the page.
3. Extract conversion status and successful download presentation.
4. Check the page at narrow and wide viewport sizes and verify keyboard and screen-reader interactions.

## Acceptance criteria

- The page delegates only the relevant UI responsibilities to the three components.
- File selection, validation, conversion, errors, download, and reset work as before.
- Existing labels, live status announcements, and keyboard accessibility are retained.
- `pnpm check` and `pnpm build` pass.
