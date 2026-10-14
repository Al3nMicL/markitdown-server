# MarkItDown Server

A local light-weight SvelteKit powered web app for converting uploaded files to Markdown, using Microsoft's
[MarkItDown](https://github.com/microsoft/markitdown) package.

## Prerequisites

- Node.js 20.19+ or 22.12+
- [pnpm](https://pnpm.io/installation)
- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

## Setup

From the repository root, install the JavaScript dependencies and create a
project-local Python environment with MarkItDown:

```sh
pnpm install
uv venv --python=3.12 .venv
uv pip install --python .venv/bin/python 'markitdown[all]'
```

The app invokes `.venv/bin/markitdown` directly; the Python environment does not
need to be activated. Check that the CLI is installed with:

```sh
.venv/bin/markitdown --version
```

By default, uploads are limited to 100 MB. To change the limit or converter
location, copy `.env.example` to `.env` and edit `MAX_FILE_MB` or
`MARKITDOWN_BIN`. Relative converter paths are resolved from the repository
root. The `.env` file is ignored by Git.

## Development

Start the SvelteKit development server:

```sh
pnpm dev
```

Open the local URL printed by Vite, usually <http://localhost:5173>. To use the
port documented for local validation instead:

```sh
pnpm exec vite dev --host 127.0.0.1 --port 3000
```

## Checks and build

```sh
pnpm check
pnpm build
```

Preview a production build with `pnpm preview`.
