import { INSTALLER_RUNTIME } from './installerRuntime';
import { validateName, validateRelativePath } from './pathSafety';
import type { CollisionPolicy } from '../types';

export interface InstallerOptions {
  policy?: CollisionPolicy;
  directories?: string[];
  createVenv?: boolean;
  installDeps?: boolean;
  initGit?: boolean;
  launchApp?: boolean;
}

function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function generateStandalonePythonInstaller(
  files: Record<string, string>, projectName = 'TreeForgeProject', options: InstallerOptions = {}
): string {
  validateName(projectName);
  const relativeFiles: Record<string, string> = Object.create(null);
  // ContentTab paths include the root; normalize it exactly once.
  for (const [path, content] of Object.entries(files)) {
    validateRelativePath(path);
    const relative = path.startsWith(projectName + '/') ? path.slice(projectName.length + 1) : path;
    validateRelativePath(relative);
    if (typeof content !== 'string') throw new Error('File contents must be text');
    if (Object.keys(relativeFiles).some(p => p.toLowerCase() === relative.toLowerCase())) throw new Error('Duplicate file path');
    relativeFiles[relative] = content;
  }
  const directories = (options.directories || []).filter(p => p !== projectName).map(p => {
    validateRelativePath(p);
    return validateRelativePath(p.startsWith(projectName + '/') ? p.slice(projectName.length + 1) : p);
  });
  const policy = options.policy || 'skip';
  if (!['skip', 'overwrite', 'auto_rename'].includes(policy)) throw new Error('Invalid collision policy');
  if (options.installDeps && !options.createVenv) throw new Error('Dependency installation requires a virtual environment');
  const payload = encode(JSON.stringify({ projectName, files: relativeFiles, directories, policy, environment: options }));
  return `#!/usr/bin/env python3\n# TreeForge installer: data is encoded, never interpolated as executable source.\nPAYLOAD = '${payload}'\n${INSTALLER_RUNTIME}`;
}

/** Shell is only a transport; manifest paths and file contents never become shell code. */
export function generateStandaloneBashInstaller(
  files: Record<string, string>, projectName = 'TreeForgeProject', options: InstallerOptions = {}
): string {
  const python = generateStandalonePythonInstaller(files, projectName, options);
  let delimiter = 'TREEFORGE_PYTHON';
  while (python.split('\n').includes(delimiter)) delimiter += '_';
  return `#!/usr/bin/env bash\nset -euo pipefail\ncommand -v python3 >/dev/null || { echo 'Python 3.10+ required' >&2; exit 1; }\npython3 - <<'${delimiter}'\n${python}\n${delimiter}\n`;
}

export function generateStandalonePowerShellInstaller(
  files: Record<string, string>, projectName = 'TreeForgeProject', options: InstallerOptions = {}
): string {
  const payload = encode(generateStandalonePythonInstaller(files, projectName, options));
  return `$ErrorActionPreference = 'Stop'\n$env:PYTHONUTF8 = '1'\n$code = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}'))\n$code | & python -\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\n`;
}
