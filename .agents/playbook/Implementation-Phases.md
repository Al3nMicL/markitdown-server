# UPDATED: Phase 1 — System Dependencies + Phase 2 — Python/markitdown Setup
---

## UPDATED VARIABLES (add to top of playbook)

```bash
SERVICE_DIR="$(pwd)"    # Use the current project root folder as the service directory
VENV_DIR="$SERVICE_DIR/.venv"
PORT=3000
NODE_VERSION="$(node --version 2>/dev/null || echo "24")"
PYTHON_VERSION=3.12   # Must be Python 3.12 or newer; uv will auto-download if absent
```

---

## UPDATED PHASE 1 — SYSTEM DEPENDENCIES

```bash
# ── 1.0 Define session-wide helper functions ──────────────────────────────────
# NOTE: These functions persist for the entire shell session.
#       All subsequent phases may call fail() directly.

fail() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✗  DEPLOYMENT ABORTED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Reason: $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 1
}

# Returns 0 if binary exists on PATH
has_binary() {
  command -v "$1" &>/dev/null
}

# Returns 0 if apt package is fully installed
# Uses apt-cache policy: "Installed: (none)" means not installed
has_apt_pkg() {
  local installed
  installed=$(apt-cache policy "$1" 2>/dev/null \
    | grep -E "^\s+Installed:" \
    | awk '{print $2}')
  [ -n "$installed" ] && [ "$installed" != "(none)" ]
}

# Check then conditionally install an apt package; abort on failure
require_apt_pkg() {
  local pkg="$1"
  local display="${2:-$1}"

  if has_apt_pkg "$pkg"; then
    echo "  ✓ [skip] $display already installed"
    return 0
  fi

  echo "  → $display not found — installing via apt-get..."

  if ! sudo apt-get install -y "$pkg"; then
    fail "apt-get could not install '$pkg'." \
         "Ensure apt sources are reachable and run: sudo apt-get update"
  fi

  # Post-install verification
  if ! has_apt_pkg "$pkg"; then
    fail "Installation of '$pkg' appeared to succeed but the package" \
         "is still not detected by apt-cache policy. Manual intervention required."
  fi

  echo "  ✓ $display installed successfully"
}
```

```bash
# ── 1.1 Refresh apt package index ─────────────────────────────────────────────
echo "── 1.1 Refreshing apt package index ──"

if ! sudo apt-get update -y; then
  # Non-fatal: cached index may be sufficient; individual installs will fail loudly if not
  echo "  ⚠ WARNING: apt-get update returned non-zero." \
       "Continuing with cached index — individual installs may fail."
fi
```

```bash
# ── 1.2 Core system packages ───────────────────────────────────────────────────
# python3-pip and python3-venv are intentionally excluded:
# uv replaces both for all virtual environment and package management tasks.
echo ""
echo "── 1.2 Checking core system packages ──"

require_apt_pkg "python3"         "Python 3 interpreter"
require_apt_pkg "python3-dev"     "Python 3 dev headers (native extensions)"
require_apt_pkg "build-essential" "Build tools (gcc / make)"
require_apt_pkg "curl"            "curl"
require_apt_pkg "git"             "git"
require_apt_pkg "ffmpeg"          "ffmpeg (audio/video conversion)"
require_apt_pkg "libmagic1"       "libmagic1 (MIME type detection)"
```

```bash
# ── 1.3 Check / install uv ────────────────────────────────────────────────────
echo ""
echo "── 1.3 Checking uv (Python toolchain manager) ──"

if has_binary "uv"; then
  echo "  ✓ [skip] uv already installed"
  echo "           $(command -v uv)  —  $(uv --version)"
else
  echo "  → uv not found — installing via official installer..."

  # curl is required; confirm it survived Phase 1.2 before using it
  if ! has_binary "curl"; then
    fail "curl is not available and is required to install uv." \
         "The Phase 1.2 install step may have failed silently."
  fi

  if ! curl -LsSf https://astral.sh/uv/install.sh | sh; then
    fail "The uv installer script exited with an error." \
         "Check network connectivity or install manually:" \
         "https://docs.astral.sh/uv/getting-started/installation/"
  fi

  # The installer drops the binary at ~/.local/bin — expose it to the current session
  export PATH="$HOME/.local/bin:$PATH"

  # Persist the PATH addition for future sessions
  if ! grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    echo "  → Added ~/.local/bin to PATH in ~/.bashrc"
  fi

  if ! has_binary "uv"; then
    fail "uv installer completed but the binary is still not on PATH." \
         "Expected location: $HOME/.local/bin/uv" \
         "Try: export PATH=\"\$HOME/.local/bin:\$PATH\"  then re-run the playbook."
  fi

  echo "  ✓ uv installed at $(command -v uv)  —  $(uv --version)"
fi
```

```bash
# ── 1.4 Check / install Node.js ───────────────────────────────────────────────
echo ""
echo "── 1.4 Checking Node.js (required >= v${NODE_VERSION}) ──"

_install_node_via_nodesource() {
  echo "  → Installing Node.js ${NODE_VERSION}.x via NodeSource..."

  if ! curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x \
       | sudo -E bash -; then
    fail "NodeSource setup script failed." \
         "Check network connectivity or install Node.js ${NODE_VERSION} manually:" \
         "https://nodejs.org/en/download/package-manager"
  fi

  require_apt_pkg "nodejs" "Node.js ${NODE_VERSION}.x"

  if ! has_binary "node"; then
    fail "Node.js installation completed but 'node' binary is not on PATH." \
         "Try opening a new shell, or check: which node"
  fi
}

if has_binary "node"; then
  CURRENT_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
  if [ "$CURRENT_MAJOR" -ge "$NODE_VERSION" ]; then
    echo "  ✓ [skip] node $(node --version) satisfies requirement (>= v${NODE_VERSION})"
  else
    echo "  → node $(node --version) is below required v${NODE_VERSION} — upgrading..."
    _install_node_via_nodesource
  fi
else
  echo "  → node not found"
  _install_node_via_nodesource
fi

# npm ships with Node.js — confirm it arrived
if ! has_binary "npm"; then
  fail "'npm' binary not found after Node.js installation." \
       "This is unexpected. Try: sudo apt-get install -y npm"
fi
```

```bash
# ── 1.5 Version report & critical tool gate ───────────────────────────────────
echo ""
echo "── 1.5 Installed version report ──"

for tool in python3 uv node npm curl git ffmpeg; do
  if has_binary "$tool"; then
    printf "  ✓ %-14s %s\n" "$tool" "$($tool --version 2>&1 | head -1)"
  else
    printf "  ✗ %-14s NOT FOUND\n" "$tool"
  fi
done

echo ""
echo "── 1.5 Critical tool gate ──"

for critical in python3 uv node npm; do
  if ! has_binary "$critical"; then
    fail "'$critical' is required but missing after all install steps." \
         "Review the output above — the install step for this tool likely" \
         "printed an error that was not caught."
  fi
  echo "  ✓ $critical present"
done

echo ""
echo "OK: Phase 1 — all dependencies satisfied"
```

---

## UPDATED PHASE 2 — PYTHON & MARKITDOWN SETUP

```bash
# 2.1 Create project directory tree
echo "── 2.1 Creating project directories ──"
mkdir -p "$SERVICE_DIR"/{uploads,outputs,public}
cd "$SERVICE_DIR" || fail "Cannot cd into $SERVICE_DIR"
echo "  ✓ Directory structure created under $SERVICE_DIR"
```

```bash
# 2.2 Create Python virtual environment with uv
echo ""
echo "── 2.2 Creating Python ${PYTHON_VERSION} virtual environment via uv ──"

if [ -d "$VENV_DIR" ] && [ -x "$VENV_DIR/bin/python" ]; then
  echo "  ✓ [skip] Virtual environment already exists at $VENV_DIR"
  echo "           $(${VENV_DIR}/bin/python --version)"
else
  # Remove a potentially broken partial venv before recreating
  [ -d "$VENV_DIR" ] && rm -rf "$VENV_DIR" \
    && echo "  → Removed incomplete existing venv"

  # uv will auto-download Python ${PYTHON_VERSION} if not present on the system
  if ! uv venv --python="${PYTHON_VERSION}" "$VENV_DIR"; then
    fail "uv could not create a Python ${PYTHON_VERSION} virtual environment." \
         "Check network access (uv may need to download Python ${PYTHON_VERSION})." \
         "Manual check: uv python list"
  fi

  echo "  ✓ Virtual environment created at $VENV_DIR"
  echo "           $($VENV_DIR/bin/python --version)"
fi
```

```bash
# 2.3 Activate virtual environment
echo ""
echo "── 2.3 Activating virtual environment ──"

source "$VENV_DIR/bin/activate" \
  || fail "Failed to activate virtual environment at $VENV_DIR." \
          "Verify the venv was created correctly in step 2.2."

echo "  ✓ Active Python: $(which python3)  —  $(python3 --version)"
```

```bash
# 2.4 Install markitdown with all optional converters via uv pip
echo ""
echo "── 2.4 Installing markitdown[all] via uv pip ──"

if ! uv pip install 'markitdown[all]'; then
  deactivate
  fail "uv pip install for markitdown[all] failed." \
       "Check PyPI connectivity or inspect the error output above." \
       "Manual retry: source $VENV_DIR/bin/activate && uv pip install 'markitdown[all]'"
fi

echo "  ✓ markitdown installed"
```

```bash
# 2.5 Verify markitdown binary is present and executable
echo ""
echo "── 2.5 Verifying markitdown binary ──"

MARKITDOWN_BIN="$VENV_DIR/bin/markitdown"

if [ ! -f "$MARKITDOWN_BIN" ]; then
  deactivate
  fail "markitdown binary not found at expected path: $MARKITDOWN_BIN" \
       "The pip install may have failed silently. Re-run step 2.4."
fi

if [ ! -x "$MARKITDOWN_BIN" ]; then
  deactivate
  fail "markitdown binary exists at $MARKITDOWN_BIN but is not executable." \
       "Try: chmod +x $MARKITDOWN_BIN"
fi

echo "  ✓ Binary found: $MARKITDOWN_BIN"
```

```bash
# 2.6 Functional smoke test of markitdown CLI
echo ""
echo "── 2.6 markitdown functional smoke test ──"

_SMOKE_IN="/tmp/markitdown_smoke_$$.txt"
_SMOKE_OUT="/tmp/markitdown_smoke_$$.md"

cat > "$_SMOKE_IN" << 'EOF'
# Smoke Test

This is a plain text smoke test file.
EOF

if ! "$MARKITDOWN_BIN" "$_SMOKE_IN" > "$_SMOKE_OUT" 2>&1; then
  rm -f "$_SMOKE_IN" "$_SMOKE_OUT"
  deactivate
  fail "markitdown binary executed but returned a non-zero exit code." \
       "Check the venv installation: source $VENV_DIR/bin/activate && markitdown --help"
fi

if [ ! -s "$_SMOKE_OUT" ]; then
  rm -f "$_SMOKE_IN" "$_SMOKE_OUT"
  deactivate
  fail "markitdown produced empty output on a known-good input file." \
       "This may indicate a broken markitdown install or missing dependency."
fi

echo "  ✓ Smoke test passed — output preview:"
head -5 "$_SMOKE_OUT" | sed 's/^/      /'
rm -f "$_SMOKE_IN" "$_SMOKE_OUT"
```

```bash
# 2.7 Deactivate venv — Node.js will call the binary path directly
deactivate
echo ""
echo "  ✓ markitdown binary path (for .env): $MARKITDOWN_BIN"
echo ""
echo "OK: Phase 2 — Python environment and markitdown ready"
```

---

### DEPENDENCY DECISION REFERENCE

| Package | Check method | Install method | Skip if installed |
|---|---|---|---|
| `python3` | `apt-cache policy` | `apt-get` | ✓ |
| `python3-dev` | `apt-cache policy` | `apt-get` | ✓ |
| `build-essential` | `apt-cache policy` | `apt-get` | ✓ |
| `curl` | `apt-cache policy` | `apt-get` | ✓ |
| `git` | `apt-cache policy` | `apt-get` | ✓ |
| `ffmpeg` | `apt-cache policy` | `apt-get` | ✓ |
| `libmagic1` | `apt-cache policy` | `apt-get` | ✓ |
| `uv` | `command -v uv` | `astral.sh` curl installer | ✓ |
| `node` | `command -v node` + version check | NodeSource curl script | ✓ if `>= v20` |
| `python3-pip` | — | — | **Removed** — replaced by `uv` |
| `python3-venv` | — | — | **Removed** — replaced by `uv` |

# PHASE 3 — SVELTEKIT INTEGRATION SPEC

cd "$SERVICE_DIR"

## 3.1 Keep this as a SvelteKit app; do not create a standalone Express server

: <<'COMMENT'
This repo is already a SvelteKit app. The service should live in a route endpoint,
not in a separate node server.js process, unless you intentionally switch to adapter-node.
The main idea is: use the SvelteKit runtime, then call the markitdown binary from a route.
COMMENT

node <<'EOF'
const fs = require('fs');
const pkgPath = 'package.json';

let pkg = {};
if (fs.existsSync(pkgPath)) {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

pkg.name ??= 'markitdown-server';
pkg.version ??= '0.0.1';
pkg.private ??= true;
pkg.type ??= 'module';
pkg.scripts ??= {};
pkg.scripts.dev ??= 'vite dev --host 0.0.0.0';
pkg.scripts.build ??= 'vite build';
pkg.scripts.preview ??= 'vite preview --host 0.0.0.0';
pkg.scripts.check ??= 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json';
pkg.devDependencies ??= {};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
EOF

: <<'COMMENT'
Optional only for standalone Node deployment:
- add @sveltejs/adapter-node if you want a custom production server outside normal SvelteKit flow
- change the Vite config from adapter-auto to adapter-node when runtime server behavior is required
- keep the app server logic out of a separate Express app unless the architecture intentionally changes away from SvelteKit

Standard SvelteKit usage should instead implement the conversion logic in a route endpoint such as:
- src/routes/api/convert/+server.ts
- accept multipart form data with request.formData()
- validate file presence and max size
- write a temp input file and spawn MARKITDOWN_BIN (.venv/bin/markitdown)
- capture stdout/stderr and return a markdown Response
- clean up temp files after conversion

Example shape:

import { json } from '@sveltejs/kit';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export const POST = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return json({ error: 'No file uploaded' }, { status: 400 });
  }

  const inputPath = join(tmpdir(), `${Date.now()}-${file.name}`);
  const inputBytes = Buffer.from(await file.arrayBuffer());
  await writeFile(inputPath, inputBytes);

  const markitdown = process.env.MARKITDOWN_BIN || '.venv/bin/markitdown';
  const child = spawn(markitdown, [inputPath], { stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = [];
  const stderr = [];

  child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));

  const exitCode = await new Promise(resolve => child.on('close', resolve));
  await unlink(inputPath).catch(() => {});

  if (exitCode !== 0) {
    return json({ error: 'Conversion failed', details: Buffer.concat(stderr).toString() }, { status: 500 });
  }

  return new Response(Buffer.concat(stdout), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
};
COMMENT

## 3.2 Add environment guidance for the binary path
cat > .env.example <<'EOF'
PORT=3000
MARKITDOWN_BIN=.venv/bin/markitdown
MAX_FILE_MB=100
EOF

## 3.3 Validate the project still boots as a SvelteKit app
pnpm install
pnpm check
pnpm build

## 3.4 Success criteria
- no Express-specific dependency is required for the normal app flow
- the conversion lives in an API route, not in a standalone server.js
- if production deployment requires it, adapter-node is used instead of adapter-auto
- the markitdown binary is resolved via environment configuration and runs from the project venv

---

# PHASE 4 — SVELTEKIT FILE CONVERSION ROUTE + UI

: <<'COMMENT'
This is the normal app flow for this repo.
Standard SvelteKit does not require a separate Express server.js.
The upload endpoint should live inside src/routes and call the markitdown binary directly.
COMMENT

: <<'COMMENT'
Standard SvelteKit flow for this project:
- keep the application in the SvelteKit runtime
- add a route at src/routes/api/convert/+server.ts
- parse multipart upload with request.formData()
- invoke the Python venv binary at .venv/bin/markitdown
- return markdown as a Response object
- keep server.js, express, multer, and app.listen() only as optional standalone examples
COMMENT

mkdir -p "$SERVICE_DIR/src/routes/api/convert"

cat > "$SERVICE_DIR/src/routes/api/convert/+server.ts" <<'EOF'
import { json } from '@sveltejs/kit';
import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 100);
const MARKITDOWN_BIN = process.env.MARKITDOWN_BIN || join(process.cwd(), '.venv', 'bin', 'markitdown');

export const POST = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return json({ error: `File exceeds ${MAX_FILE_MB}MB limit` }, { status: 413 });
  }

  const tempInput = join(tmpdir(), `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  await writeFile(tempInput, Buffer.from(await file.arrayBuffer()));

  try {
    const child = spawn(MARKITDOWN_BIN, [tempInput], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));

    const exitCode = await new Promise<number>(resolve => child.on('close', resolve));

    if (exitCode !== 0) {
      const detail = Buffer.concat(stderr).toString().trim();
      return json({ error: 'Conversion failed', details: detail }, { status: 500 });
    }

    const markdown = Buffer.concat(stdout);
    if (!markdown.length) {
      return json({ error: 'markitdown produced empty output' }, { status: 422 });
    }

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^.]+$/, '')}.md"`
      }
    });
  } finally {
    await unlink(tempInput).catch(() => {});
  }
};
EOF

cat > "$SERVICE_DIR/src/routes/+page.svelte" <<'EOF'
<script lang="ts">
  let uploading = false;
  let error = '';
  let success = '';

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const file = data.get('file');

    if (!(file instanceof File) || !file.size) {
      error = 'Please select a file to convert.';
      success = '';
      return;
    }

    uploading = true;
    error = '';
    success = '';

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: data
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed with ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted.md';
      link.click();
      URL.revokeObjectURL(url);

      success = 'Conversion complete.';
      form.reset();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Conversion failed.';
    } finally {
      uploading = false;
    }
  }
</script>

<h1>MarkItDown Converter</h1>

<form on:submit={handleSubmit}>
  <input type="file" name="file" />
  <button type="submit" disabled={uploading}>
    {uploading ? 'Converting...' : 'Convert to Markdown'}
  </button>
</form>

{#if error}
  <p style="color: red">{error}</p>
{/if}

{#if success}
  <p style="color: green">{success}</p>
{/if}
EOF

## 4.1 Validate the SvelteKit route works in normal runtime
pnpm install
pnpm dev --host 0.0.0.0

## 4.2 Production check
pnpm build

## 4.3 Success criteria
- the app runs under standard SvelteKit server lifecycle
- file upload is handled in src/routes/api/convert/+server.ts
- markitdown is invoked from the project venv path
- conversion result is returned as markdown to the browser
- no standalone Express server is required for the core use case

---

# PHASE 5 — SVELTEKIT UI/ Markitdown Uploader DESIGN GUIDELINE

: <<'COMMENT'
This implementation phase is a design guideline only.
It is not the final implementation contract for the assigned engineering agent.
The final design may differ based on the actual route structure, UI requirements, and repository conventions chosen by that agent.
COMMENT

: <<'COMMENT'
This phase intentionally keeps the app aligned with standard SvelteKit patterns:
- use src/routes and route endpoints for upload conversion logic
- keep runtime behavior inside the SvelteKit app lifecycle
- use a browser form or JS client to submit multipart form data
- invoke the markitdown binary from the project venv path
- return markdown in a Response or trigger a download from the client

The content below is guidance only and should be treated as a starting point, not a lock-in design.
COMMENT

cat > "$SERVICE_DIR/public/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>markitdown — File to Markdown</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    header p {
      margin-top: 0.4rem;
      color: #94a3b8;
      font-size: 0.95rem;
    }

    .card {
      background: #1e2130;
      border: 1px solid #2d3148;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 640px;
    }

    #drop-zone {
      border: 2px dashed #3d4270;
      border-radius: 12px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      position: relative;
    }

    #drop-zone.dragover {
      border-color: #6366f1;
      background: rgba(99,102,241,0.08);
    }

    #drop-zone input[type="file"] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .drop-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .drop-label { font-size: 1rem; color: #cbd5e1; }
    .drop-label span { color: #818cf8; text-decoration: underline; }
    .drop-hint { margin-top: 0.5rem; font-size: 0.8rem; color: #64748b; }

    #file-info {
      display: none;
      align-items: center;
      gap: 0.75rem;
      background: #252840;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
    }

    #file-info.visible { display: flex; }
    .file-icon { font-size: 1.5rem; }
    .file-details { flex: 1; overflow: hidden; }
    .file-name {
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-size { font-size: 0.75rem; color: #64748b; }

    #convert-btn {
      display: block;
      width: 100%;
      margin-top: 1.25rem;
      padding: 0.85rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }

    #convert-btn:hover:not(:disabled) { opacity: 0.9; }
    #convert-btn:active:not(:disabled) { transform: scale(0.99); }
    #convert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    #progress-wrap {
      display: none;
      margin-top: 1rem;
    }

    #progress-wrap.visible { display: block; }

    .progress-bar-bg {
      background: #2d3148;
      border-radius: 99px;
      height: 6px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 99px;
      width: 0%;
      transition: width 0.3s ease;
      animation: indeterminate 1.5s ease-in-out infinite;
    }

    @keyframes indeterminate {
      0%   { width: 0%; margin-left: 0%; }
      50%  { width: 60%; margin-left: 20%; }
      100% { width: 0%; margin-left: 100%; }
    }

    .progress-label {
      margin-top: 0.5rem;
      font-size: 0.82rem;
      color: #94a3b8;
      text-align: center;
    }

    #status {
      display: none;
      align-items: center;
      gap: 0.6rem;
      margin-top: 1rem;
      padding: 0.8rem 1rem;
      border-radius: 8px;
      font-size: 0.88rem;
    }

    #status.visible { display: flex; }
    #status.success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    #status.error   { background: rgba(239,68,68,0.12);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }

    #download-btn {
      display: none;
      width: 100%;
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(34,197,94,0.15);
      color: #4ade80;
      font-size: 0.95rem;
      font-weight: 600;
      border: 1px solid rgba(34,197,94,0.3);
      border-radius: 10px;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      transition: background 0.2s;
    }

    #download-btn:hover { background: rgba(34,197,94,0.25); }
    #download-btn.visible { display: block; }

    .formats {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #2d3148;
    }

    .formats h3 {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .format-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tag {
      background: #252840;
      color: #94a3b8;
      border: 1px solid #3d4270;
      border-radius: 4px;
      padding: 0.2rem 0.55rem;
      font-size: 0.75rem;
      font-family: monospace;
    }

    #reset-link {
      display: none;
      margin-top: 0.75rem;
      text-align: center;
      font-size: 0.82rem;
      color: #64748b;
      cursor: pointer;
      text-decoration: underline;
    }

    #reset-link.visible { display: block; }
  </style>
</head>
<body>
  <header>
    <h1>⬡ markitdown</h1>
    <p>Drop any file — get clean Markdown back</p>
  </header>

  <div class="card">
    <div id="drop-zone">
      <input type="file" id="file-input" />
      <div class="drop-icon">📄</div>
      <div class="drop-label">Drop file here or <span>browse</span></div>
      <div class="drop-hint">PDF · DOCX · PPTX · XLSX · HTML · images · audio · ZIP · and more</div>
    </div>

    <div id="file-info">
      <div class="file-icon" id="file-icon">📎</div>
      <div class="file-details">
        <div class="file-name" id="file-name">—</div>
        <div class="file-size" id="file-size">—</div>
      </div>
    </div>

    <button id="convert-btn" disabled>Convert to Markdown</button>

    <div id="progress-wrap">
      <div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill"></div></div>
      <div class="progress-label" id="progress-label">Converting…</div>
    </div>

    <div id="status"></div>
    <a id="download-btn" download>⬇ Download Markdown</a>
    <div id="reset-link">Convert another file</div>

    <div class="formats">
      <h3>Supported Input Formats</h3>
      <div class="format-tags">
        <span class="tag">.pdf</span>
        <span class="tag">.docx</span>
        <span class="tag">.pptx</span>
        <span class="tag">.xlsx</span>
        <span class="tag">.xls</span>
        <span class="tag">.html</span>
        <span class="tag">.htm</span>
        <span class="tag">.csv</span>
        <span class="tag">.json</span>
        <span class="tag">.xml</span>
        <span class="tag">.png</span>
        <span class="tag">.jpg</span>
        <span class="tag">.mp3</span>
        <span class="tag">.wav</span>
        <span class="tag">.zip</span>
        <span class="tag">.txt</span>
        <span class="tag">.md</span>
        <span class="tag">+ more</span>
      </div>
    </div>
  </div>

  <script>
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const fileIconEl = document.getElementById('file-icon');
    const convertBtn = document.getElementById('convert-btn');
    const progressWrap = document.getElementById('progress-wrap');
    const statusEl = document.getElementById('status');
    const downloadBtn = document.getElementById('download-btn');
    const resetLink = document.getElementById('reset-link');

    let selectedFile = null;

    const EXT_ICONS = {
      pdf:'📕', docx:'📘', doc:'📘', pptx:'📙', ppt:'📙',
      xlsx:'📗', xls:'📗', csv:'📊', html:'🌐', htm:'🌐',
      png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', webp:'🖼️',
      mp3:'🎵', wav:'🎵', ogg:'🎵', mp4:'🎬',
      zip:'🗜️', tar:'🗜️', gz:'🗜️',
      json:'📋', xml:'📋', txt:'📄', md:'📝'
    };

    function iconForFile(name) {
      const ext = name.split('.').pop().toLowerCase();
      return EXT_ICONS[ext] || '📎';
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function setFile(file) {
      selectedFile = file;
      fileNameEl.textContent = file.name;
      fileSizeEl.textContent = formatBytes(file.size);
      fileIconEl.textContent = iconForFile(file.name);
      fileInfo.classList.add('visible');
      convertBtn.disabled = false;
      clearStatus();
    }

    function clearStatus() {
      statusEl.className = '';
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      downloadBtn.classList.remove('visible');
      resetLink.classList.remove('visible');
      progressWrap.classList.remove('visible');
    }

    function showStatus(type, msg) {
      statusEl.className = `visible ${type}`;
      statusEl.textContent = type === 'success' ? '✓ ' + msg : '✗ ' + msg;
    }

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) setFile(file);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    convertBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      convertBtn.disabled = true;
      clearStatus();
      progressWrap.classList.add('visible');

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const res = await fetch('/convert', { method: 'POST', body: formData });

        progressWrap.classList.remove('visible');

        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try {
            const j = await res.json();
            errMsg = j.error + (j.details ? ': ' + j.details : '');
          } catch (_) {}
          showStatus('error', errMsg);
          convertBtn.disabled = false;
          return;
        }

        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        const filename = match ? match[1] : selectedFile.name.replace(/\.[^.]+$/, '') + '.md';

        const url = URL.createObjectURL(blob);
        downloadBtn.href = url;
        downloadBtn.download = filename;
        downloadBtn.textContent = `⬇ Download ${filename}`;
        downloadBtn.classList.add('visible');

        showStatus('success', `Converted successfully — ${filename}`);
        resetLink.classList.add('visible');
      } catch (err) {
        progressWrap.classList.remove('visible');
        showStatus('error', 'Network error — is the server running?');
        convertBtn.disabled = false;
      }
    });

    resetLink.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      fileInfo.classList.remove('visible');
      convertBtn.disabled = true;
      clearStatus();
    });
  </script>
</body>
</html>
HTMLEOF

echo "OK: index.html written"
wc -l "$SERVICE_DIR/public/index.html"

: <<'COMMENT'
This design example is intentionally illustrative only.
The exact final implementation will be determined by the UI design agent assigned to the work.
This phase should be read as a product reference and not as a fixed implementation specification.
COMMENT

