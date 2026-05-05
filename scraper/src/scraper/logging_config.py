"""Structured logging configuration for omscs-radar scrapers.

Two output modes:
- CONSOLE (default for local dev): pretty, colored, human-readable.
- JSON (when LOG_FORMAT=json env var set): one JSON object per line,
  ideal for CI logs, log shipping, and grepping.

Call configure_logging() once at the top of any entry point (the CLI),
then use structlog.get_logger() anywhere else in the codebase.
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


def configure_logging(*, level: str = "INFO") -> None:
    """Configure structlog and stdlib logging together.

    structlog wraps stdlib logging under the hood, so anything that uses
    `logging.getLogger(...)` (e.g. httpx, third-party libraries) gets the
    same formatting as our own loggers.
    """
    use_json = os.getenv("LOG_FORMAT", "").lower() == "json"

    # Shared processors: applied to every log entry before rendering.
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if use_json:
        renderer: structlog.types.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stdout.isatty())

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO),
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )