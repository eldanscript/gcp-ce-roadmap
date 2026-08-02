import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src" / "gcp-ce-roadmap"
sys.path.insert(0, str(SRC_DIR))
