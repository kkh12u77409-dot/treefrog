#!/usr/bin/env python3
"""Root entry point forwarding directly to TreeForge.main."""

import sys
from pathlib import Path

# Add workspace root and TreeForge to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from TreeForge.main import main

if __name__ == "__main__":
    main()
