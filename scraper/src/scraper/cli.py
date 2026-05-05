"""Command-line interface for omscs-radar scrapers.

After `pip install -e .` the entry points defined in pyproject.toml expose
each command system-wide:

    $ scrape-omscentral --output data/omscentral.json
"""

from __future__ import annotations

import json
from pathlib import Path

import typer

from .fetch_omscentral import fetch_homepage
from .parse_omscentral import extract_courses, to_source_rating

def scrape_omscentral_cmd(
    output: Path = typer.Option(
        Path("data/omscentral.json"),
        "--output", "-o",
        help="Where to write the JSON output. Parent dirs are created if needed.",
    ),
) -> None:
    """Scrape OMSCentral and write all course ratings to a JSON file."""
    typer.echo(f"Fetching {fetch_homepage.__module__}...")  # noqa: T201
    html = fetch_homepage()

    raw_courses = extract_courses(html)
    ratings = [to_source_rating(c) for c in raw_courses]
    typer.echo(f"Parsed {len(ratings)} courses ({sum(1 for r in ratings if r.rating is not None)} with ratings)")

    output.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.model_dump(mode="json") for r in ratings]
    output.write_text(json.dumps(payload, indent=2))
    typer.echo(f"Wrote {output} ({output.stat().st_size:,} bytes)")


def main() -> None:
    """Default entry point — currently just runs the OMSCentral scraper."""
    typer.run(scrape_omscentral_cmd)

if __name__ == "__main__":
    main()