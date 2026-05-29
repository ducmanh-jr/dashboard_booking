"""PostgreSQL snapshot import wrapper.

Kept for compatibility with older runbooks. For interactive use, prefer:

    pnpm db:reset

Set AUTO_IMPORT_CONFIRM=RESET to allow this wrapper to run non-interactively.
"""

from __future__ import annotations

import os
import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
IMPORT_SCRIPT = ROOT / "database" / "baseline" / "import.mjs"


def main() -> int:
    if os.environ.get("AUTO_IMPORT_CONFIRM") != "RESET":
        print("Refusing to reset database without AUTO_IMPORT_CONFIRM=RESET.")
        print("Use `pnpm db:reset` for the interactive reset flow.")
        return 1

    result = subprocess.run(["node", str(IMPORT_SCRIPT)], cwd=str(ROOT))
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
