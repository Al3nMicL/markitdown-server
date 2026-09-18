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

## DEPENDENCY DECISION REFERENCE

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

## 3.5 Add environment guidance for the binary path
cat > .env.example <<'EOF'
PORT=3000
MARKITDOWN_BIN=.venv/bin/markitdown
MAX_FILE_MB=100
EOF

# 3.6 Validate the project still boots as a SvelteKit app
pnpm install
pnpm check
pnpm build

# 3.7 Success criteria
- no Express-specific dependency is required for the normal app flow
- the conversion lives in an API route, not in a standalone server.js
- if production deployment requires it, adapter-node is used instead of adapter-auto
- the markitdown binary is resolved via environment configuration and runs from the project venv