#!/usr/bin/env python3
"""TreeForge — Windows & Cross-Platform Smart Runner & Auto-Installer.

Handles environment checks, dependency verification, and launches TreeForge
with complete Unicode/Arabic support without cmd.exe parsing issues.
"""

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

# Locate main.py and requirements.txt reliably
candidates_main = [
    CURRENT_DIR / "main.py",
    CURRENT_DIR / "TreeForge" / "main.py",
    CURRENT_DIR.parent / "main.py",
    CURRENT_DIR.parent / "TreeForge" / "main.py",
]

main_script = None
for candidate in candidates_main:
    if candidate.is_file() and candidate != Path(__file__).resolve():
        main_script = candidate
        break

candidates_req = [
    CURRENT_DIR / "requirements.txt",
    CURRENT_DIR / "TreeForge" / "requirements.txt",
    CURRENT_DIR.parent / "requirements.txt",
    CURRENT_DIR.parent / "TreeForge" / "requirements.txt",
]

req_file = None
for candidate in candidates_req:
    if candidate.is_file():
        req_file = candidate
        break


def print_banner():
    print("=" * 70)
    print("              TreeForge — PyQt6 Desktop & CLI Suite")
    print("           تطبيق إنشاء المشاريع البرمجية وحقن الأكواد الذكية")
    print("=" * 70)
    print(f"[*] Python: {sys.version.split()[0]} ({sys.executable})")
    print(f"[*] Base Path: {CURRENT_DIR}\n")


def check_and_install_dependencies():
    """Ensure PyQt6 and requirements are installed."""
    try:
        from PyQt6 import QtWidgets
        print("[✓] PyQt6 is already installed (PyQt6 متوفرة ومثبتة).")
        return True
    except ImportError:
        print("[!] PyQt6 is not installed. Installing required dependencies...")
        print("[*] جارٍ تثبيت PyQt6 وباقي المكتبات المطلوبة بواسطة pip...")

    cmd = [sys.executable, "-m", "pip", "install", "--upgrade", "pip"]
    try:
        subprocess.run(cmd, check=False)
    except Exception:
        pass

    install_cmd = [sys.executable, "-m", "pip", "install", "PyQt6"]
    if req_file and req_file.exists():
        install_cmd = [sys.executable, "-m", "pip", "install", "-r", str(req_file)]

    try:
        print(f"[*] Running: {' '.join(install_cmd)}")
        res = subprocess.run(install_cmd)
        if res.returncode == 0:
            print("[✓] Successfully installed dependencies (تم التثبيت بنجاح).")
            return True
        else:
            print(f"[!] pip install returned exit code {res.returncode}.")
            return False
    except Exception as e:
        print(f"[!] Error installing packages: {e}")
        return False


def main():
    print_banner()

    # Pure CLI/tests need no GUI dependencies or automatic installation.
    headless = "--cli" in sys.argv or "--test" in sys.argv
    if not headless and not check_and_install_dependencies():
        sys.exit(1)

    if not main_script or not main_script.is_file():
        print("[ERROR] Could not find 'main.py' script!")
        print(f"Looked in: {[str(c) for c in candidates_main]}")
        sys.exit(1)

    print(f"\n[*] Launching TreeForge -> {main_script.name}...")
    print("-" * 70)

    # Launch main.py with same python interpreter
    # Forward all command line arguments
    args = [sys.executable, str(main_script)] + sys.argv[1:]
    
    # Ensure sys.path includes parent directory of TreeForge
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    paths_to_add = [str(CURRENT_DIR)]
    if (CURRENT_DIR / "TreeForge").is_dir():
        paths_to_add.append(str(CURRENT_DIR / "TreeForge"))
    if CURRENT_DIR.parent.is_dir():
        paths_to_add.append(str(CURRENT_DIR.parent))

    new_pythonpath = os.pathsep.join(paths_to_add + ([existing_pythonpath] if existing_pythonpath else []))
    env["PYTHONPATH"] = new_pythonpath

    try:
        ret = subprocess.run(args, env=env)
        sys.exit(ret.returncode)
    except Exception as e:
        print(f"[ERROR] Failed to run TreeForge: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
