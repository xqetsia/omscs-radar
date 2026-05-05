"""Fetch raw HTML from OMSCentral's homepage.

Single function, single responsibility: do the HTTP request and return the
response text. Parsing happens elsewhere (parse_omscentral.py). Keeping
fetch and parse separate makes both testable in isolation — we can unit-test
the parser by feeding it saved HTML, and unit-test the fetcher by mocking
the HTTP layer.
"""

from __future__ import annotations

import httpx

OMSCENTRAL_URL = "https://www.omscentral.com/"
USER_AGENT = (
    "omscs-radar/0.1 (+https://github.com/xqetsia/omscs-radar)"
)
DEFAULT_TIMEOUT_SECONDS = 30.0


def fetch_homepage(*, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> str:
    """Fetch the OMSCentral homepage and return its HTML as a string.

    Raises:
        httpx.HTTPStatusError: if the response is not 2xx.
        httpx.RequestError: on network/transport errors.
    """
    response = httpx.get(
        OMSCENTRAL_URL,
        headers={"User-Agent": USER_AGENT},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.text