"""Periodic PostgreSQL snapshot wrapper.

This file is kept for compatibility with older runbooks. The real snapshot
engine lives in database/snapshots/export.mjs.
"""

from __future__ import annotations

import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPORT_SCRIPT = ROOT / "database" / "snapshots" / "export.ps1"


def main() -> int:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(EXPORT_SCRIPT),
        ],
        cwd=str(ROOT),
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
