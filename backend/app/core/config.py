"""Application settings, read from environment variables (see .env.example)."""
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class Settings:
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")  # comma-separated
    raw_dir: Path = Path(os.getenv("RAW_DATA_DIR", ROOT / "data" / "raw"))
    processed_dir: Path = Path(os.getenv("PROCESSED_DATA_DIR", ROOT / "data" / "processed"))
    # Provisional business rules (PRD marks profitability as an assumption).
    high_loss_ratio: float = float(os.getenv("HIGH_LOSS_RATIO", "1.0"))        # claims / premium above this => "High cost"
    efficient_loss_ratio: float = float(os.getenv("EFFICIENT_LOSS_RATIO", "0.8"))  # at or below this => "Cost-efficient"
    outlier_z: float = float(os.getenv("OUTLIER_Z", "2.5"))                    # z-score within smoker group
    data_as_of: str = "2026-10-31"                                              # fixed reference date for the simulated claims window


settings = Settings()
