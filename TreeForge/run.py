#!/usr/bin/env python3
"""TreeForge — Windows & Cross-Platform Smart Runner (TreeForge Package)."""

import os
import sys
import subprocess
from pathlib import Path

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CURRENT_DIR = Path(__file__).resolve().parent

candidates_main = [
    CURRENT_DIR / "main.py",
    CURRENT_DIR.parent / "main.py",
]

main_script = None
for candidate in candidates_main:
    if candidate.is_file() and candidate != Path(__file__).resolve():
        main_script = candidate
        break

candidates_req = [
    CURRENT_DIR / "requirements.txt",
    CURRENT_DIR.parent / "requirements.txt",
]

req_file = None
for candidate in candidates_req:
    if candidate.is_file():
        req_file = candidate
        break


def main():
    print("=" * 70)
    print("              TreeForge — PyQt6 Desktop & CLI Suite")
    print("           تطبيق إنشاء المشاريع البرمجية وحقن الأكواد الذكية")
    print("=" * 70)
    print(f"[*] Python: {sys.version.split()[0]} ({sys.executable})")

    if "--cli" not in sys.argv and "--test" not in sys.argv:
        try:
            from PyQt6 import QtWidgets
        except ImportError:
            if not req_file:
                print("[ERROR] Missing requirements.txt")
                sys.exit(1)
            result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_file)])
            if result.returncode:
                sys.exit(result.returncode)

    if not main_script or not main_script.is_file():
        print("[ERROR] Could not find main.py!")
        sys.exit(1)

    print(f"\n[*] Starting TreeForge -> {main_script}...\n")
    args = [sys.executable, str(main_script)] + sys.argv[1:]

    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    paths_to_add = [str(CURRENT_DIR), str(CURRENT_DIR.parent)]
    new_pythonpath = os.pathsep.join(paths_to_add + ([existing_pythonpath] if existing_pythonpath else []))
    env["PYTHONPATH"] = new_pythonpath

    ret = subprocess.run(args, env=env)
    sys.exit(ret.returncode)


if __name__ == "__main__":
    main()
