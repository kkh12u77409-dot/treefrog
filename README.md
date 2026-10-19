# TreeForge

أداة لتحويل شجرة مشروع نصية إلى ملفات، وتقسيم الأكواد المجمّعة، مع واجهة ويب عربية/إنجليزية وتطبيق سطح مكتب وCLI.

## Web application

Requires **Node.js 22.13+**. Python 3.10+ is also needed for the cross-language tests and desktop packaging.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The server binds to `0.0.0.0`; browser API requests use relative URLs. To serve the built application:

```bash
npm run build
# Linux/macOS
NODE_ENV=production npm start
# PowerShell
# $env:NODE_ENV='production'; npm start
```

### AI access

AI is **disabled by default**. Configure `GEMINI_API_KEY` and `AI_ACCESS_TOKEN` in `.env.local`, then enter the access token in the AI tab. Tokens are held in memory, not browser storage. `GEMINI_MODEL` selects the provider model; availability depends on your account. Never commit real credentials.

`ALLOW_PUBLIC_AI=true` explicitly enables unauthenticated use; this is not recommended on public deployments. The server validates inputs/outputs, limits prompts to 6,000 characters, bounds output tokens and request time, allows at most two concurrent generations, and defaults to 100 AI requests per UTC day. Rate limits and the daily budget are **per process and reset on restart**. Multi-instance deployments need a shared limiter/budget store and a reverse proxy with appropriate trusted-proxy configuration. An AI access token is a shared access gate, not a multi-user account system. Use HTTPS in production.

`PUBLIC_ORIGIN` optionally specifies the exact browser origin when a trusted reverse proxy rewrites the Host header. No wildcard CORS is enabled.

### Data and export semantics

- Editing/saving in the web application changes **in-memory project files**, not files on the server or your disk.
- Visited tabs remain mounted; drafts, queues and undo survive tab switches. Closing/reloading the page loses this memory; a navigation warning is installed. Download your work before leaving. Code is deliberately not stored unencrypted in browser storage.
- Saved file contents are shared with Builder exports. Unmatched and ambiguous chunks require explicit target selection before saving/exporting.
- ZIP exports contain selected files. Python/Bash/PowerShell installers use one encoded-data Python runtime; **all installer formats require Python 3.10+**.
- Installers default to **Skip**. Wizard exports honor Skip/Overwrite/Auto-Rename. Overwrite is destructive and must be chosen explicitly. Standalone installers do not provide undo.
- Virtual-environment creation, dependency installation, Git initialization and launching generated code are optional, default-off actions. Only enable these for trusted projects. Installing dependencies or launching files executes third-party code.
- Paths are validated for traversal, Windows drive/device names and existing symlink escapes. The destination is assumed not to be concurrently manipulated by a hostile local process. This is not a filesystem sandbox.

## Desktop and CLI

```bash
python -m venv .venv
# Linux/macOS
. .venv/bin/activate
# Windows: .venv\Scripts\activate
python -m pip install -r TreeForge/requirements.txt
python main.py --gui
```

On Linux the Qt runtime needs system libraries, including `libGL`, `libEGL`, `libxkbcommon` and `libdbus`. Windows may need the Microsoft Visual C++ runtime. The pinned Qt runtime is tested by CI on Python 3.10/3.12; Python 3.11 is recommended locally.

The CLI does **not** require Qt:

```bash
python main.py --cli tree.txt --out ./workspace --dry-run
python main.py --cli tree.txt --out ./workspace --content batch.txt
```

Tree generation defaults to Skip. Explicit `--content` injection overwrites matched files with transaction backups. Parse/build/write failures or unresolved chunks return a nonzero status; partial output may remain after a failure/cancellation. Desktop batch undo restores the first pre-batch bytes and removes files created by that batch; disabling backups disables restoration of overwritten files. Undo is session-local, not crash recovery.

## Validation

```bash
npm ci
npm run lint             # strict TypeScript + React Hooks lint
npm test                 # utilities, generated installer execution, hook state, API
npm run build
python -m unittest discover -s TreeForge/tests -p "test_*.py"

npx playwright install --with-deps chromium
npm run test:e2e
```

Real Qt tests skip with an explicit reason when Qt/system libraries are unavailable. Run `QT_QPA_PLATFORM=offscreen` for GUI tests on headless Linux. Shared parser/splitter fixtures live in `TreeForge/tests/fixtures/`. Installer runtime parity is tested between Python and TypeScript.

CI includes Linux/Windows desktop tests, browser workflows, web builds and Windows executable/installer compilation. These jobs need to run in GitHub before a release is considered validated.

## Packaging

```bash
npm run package:desktop  # regenerates TreeForge/TreeForge_Package.zip from current sources
```

On Windows, run root `build_exe.bat`, then compile root `TreeForge_Installer.iss` using Inno Setup 6. The desktop ZIP also includes its own build scripts. Do not publish a package without rebuilding it after source changes.

## Layout

- `src/components/`: React views and visualizations, loaded by tab.
- `src/utils/`: parsers, tree operations, state history, templates and safe installer generators.
- `server/app.ts`: testable Express API; `server.ts`: development/production startup.
- `TreeForge/core/`: headless Python domain and filesystem logic.
- `TreeForge/services/`, `TreeForge/ui/`: desktop presentation and settings.
- `tests/e2e/`: browser regression tests.

MIT license; third-party icon notices are in `TreeForge/assets/icons/LICENSE`.
