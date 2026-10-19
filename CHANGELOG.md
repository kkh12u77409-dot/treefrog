# Changelog

## 2026-10-19 — Safety and reliability fixes

- Contain desktop/CLI writes within the workspace; reject unsafe portable paths and symlink escapes.
- Preserve first pre-batch file state, new-file tracking, permissions and retryable undo errors.
- Require explicit ambiguous/fuzzy target resolution; align shared parser/splitter fixtures.
- Support fenced trees and path fences without leaking closing fences into source files.
- Replace interpolated Python/Bash/PowerShell installers with encoded manifests and one validated Python runtime.
- Honor installer collision policies, selected chunks, explicit empty content and disabled nodes.
- Preserve React tab state and per-file drafts; share saved content with Builder exports.
- Replace unstable history callbacks with atomic, bounded history updates and clean up debounce timers.
- Guard desktop workers on close and avoid recursive symlink traversal.
- Validate and restrict AI API access, inputs, outputs, request rates, concurrency and budget.
- Serve cached text-only desktop sources asynchronously and return bounded API errors.
- Fix standard npm installation; add a lockfile, strict TypeScript, Hooks lint and CI.
- Lazy-load tabs and optimize production logo assets.
- Add installer execution, browser workflow, API, parser parity and Qt regression tests.
- Update documentation, licenses, desktop build scripts and deterministic source packaging.

Windows executable/installer compilation and Qt GUI tests require their platform/system dependencies; CI is the release gate. AI provider integration requires configured credentials and is not exercised by mocked API tests.
