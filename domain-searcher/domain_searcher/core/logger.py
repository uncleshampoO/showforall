"""
Centralized logging for Domain Searcher.
@developer: Single source of truth for all log output.
"""

import logging
import sys
from pathlib import Path


def setup_logger(name: str = "domain_searcher", level: int = logging.INFO) -> logging.Logger:
    """Configure and return a named logger with console + file output."""
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(level)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    # Console handler (UTF-8 safe)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (persistent log)
    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / "searcher.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
