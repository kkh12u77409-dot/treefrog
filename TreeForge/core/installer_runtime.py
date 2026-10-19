"""Canonical standalone installer runtime.

After changing this constant, run: python tools/sync_installer_runtime.py
"""
RUNTIME = r'''import base64
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path, PureWindowsPath


def safe_target(base, relative):
    if not isinstance(relative, str) or not relative or relative.startswith(("/", "\\")) or PureWindowsPath(relative).drive:
        raise ValueError("Expected a relative path")
    relative = relative.replace("\\", "/")
    for part in relative.split("/"):
        if (not part or part in (".", "..") or part.endswith((".", " "))
                or any(ord(c) < 32 or c in '<>:"|?*' for c in part)
                or re.fullmatch(r"CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]", part.split(".")[0], re.I)):
            raise ValueError("Unsafe path component")
    root = base.resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or target == root:
        raise ValueError("Path escapes project directory")
    return target


def main():
    data = json.loads(base64.b64decode(PAYLOAD).decode("utf-8"))
    name = data["projectName"]
    if "/" in name or "\\" in name:
        raise ValueError("Project name must be one component")
    root = safe_target(Path.cwd(), name)
    files = data["files"]
    policy = data.get("policy", "skip")
    if policy not in ("skip", "overwrite", "auto_rename"):
        raise ValueError("Invalid collision policy")
    # Validate the complete manifest before performing any write.
    targets = [(safe_target(root, path), content) for path, content in files.items()]
    dirs = [safe_target(root, path) for path in data.get("directories", [])]
    for directory in dirs:
        directory.mkdir(parents=True, exist_ok=True)
    root.mkdir(parents=True, exist_ok=True)
    for target, content in targets:
        if not isinstance(content, str):
            raise ValueError("File contents must be text")
        if target.exists():
            if policy == "skip":
                continue
            if policy == "auto_rename":
                original = target
                index = 1
                while target.exists():
                    target = original.with_name(f"{original.stem} ({index}){original.suffix}")
                    index += 1
        target.parent.mkdir(parents=True, exist_ok=True)
        # Recheck after directory creation, before touching the file.
        safe_target(root, target.relative_to(root).as_posix())
        fd, temp_name = tempfile.mkstemp(dir=target.parent, prefix=".tmp_forge_")
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(content.encode("utf-8"))
                stream.flush()
                os.fsync(stream.fileno())
            if policy == "overwrite":
                os.replace(temp_name, target)
            else:
                # Exclusive creation prevents concurrent writers clobbering a file.
                os.link(temp_name, target)
        finally:
            Path(temp_name).unlink(missing_ok=True)
    options = data.get("environment", {})
    venv = root / ".venv"
    python = sys.executable
    if options.get("createVenv"):
        subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
        python = str(venv / ("Scripts/python.exe" if os.name == "nt" else "bin/python"))
    if options.get("installDeps"):
        if not options.get("createVenv"):
            raise ValueError("Dependency installation requires an isolated virtual environment")
        requirements = safe_target(root, "requirements.txt")
        if requirements.is_file():
            subprocess.run([python, "-m", "pip", "install", "-r", str(requirements)], check=True)
    if options.get("initGit"):
        subprocess.run(["git", "init", str(root)], check=True)
    if options.get("launchApp"):
        entry = safe_target(root, "main.py")
        if entry.is_file():
            subprocess.run([python, str(entry)], cwd=root, check=True)
    print(f"Project ready: {root}")


if __name__ == "__main__":
    main()
'''
