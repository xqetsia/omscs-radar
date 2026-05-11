"""Command-line interface for omscs-radar scrapers.

After `pip install -e .` the entry points defined in pyproject.toml expose
each command system-wide:

    $ scrape-omscentral --output data/omscentral.json
    $ scrape-omscentral --to-db
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import structlog
import typer

from .fetch_omscentral import fetch_homepage
from .logging_config import configure_logging
from .parse_omscentral import extract_courses, to_source_rating
from .persistence import write_snapshots

log = structlog.get_logger()


def scrape_omscentral_cmd(
    output: Path = typer.Option(
        Path("data/omscentral.json"),
        "--output", "-o",
        help="Where to write the JSON output. Parent dirs are created if needed.",
    ),
    to_db: bool = typer.Option(
        False,
        "--to-db",
        help="Also write snapshots into the configured Postgres database.",
    ),
    log_level: str = typer.Option(
        "INFO",
        "--log-level", "-l",
        help="Logging level (DEBUG, INFO, WARNING, ERROR).",
    ),
) -> None:
    """Scrape OMSCentral and write all course ratings to JSON (and optionally Postgres)."""
    configure_logging(level=log_level)
    log.info("scrape.start", source="omscentral", output=str(output), to_db=to_db)

    start = time.monotonic()
    html = fetch_homepage()
    log.info("scrape.fetched", bytes=len(html))

    raw_courses = extract_courses(html)
    ratings = [to_source_rating(c) for c in raw_courses]
    rated_count = sum(1 for r in ratings if r.rating is not None)
    log.info(
        "scrape.parsed",
        total_courses=len(ratings),
        with_ratings=rated_count,
        without_ratings=len(ratings) - rated_count,
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.model_dump(mode="json") for r in ratings]
    output.write_text(json.dumps(payload, indent=2))
    log.info("scrape.json_written", output=str(output), bytes_written=output.stat().st_size)

    if to_db:
        inserted = write_snapshots(ratings)
        log.info("scrape.db_written", inserted=inserted)

    elapsed = time.monotonic() - start
    log.info("scrape.complete", elapsed_seconds=round(elapsed, 2))


def main() -> None:
    """Default entry point."""
    typer.run(scrape_omscentral_cmd)


if __name__ == "__main__":
    main()