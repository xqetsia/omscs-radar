"""Fetch a single OMSCentral course page and print the response.

Diagnostic script to verify that OMSCentral returns server-rendered HTML
containing the rating, difficulty, and workload values.
"""

import httpx

URL = "https://www.omscentral.com/courses/machine-learning/reviews"
USER_AGENT = (
    "omscs-radar/0.1 (diagnostic; +https://github.com/xqetsia/omscs-radar)"
)


def main() -> None:
    headers = {"User-Agent": USER_AGENT}
    response = httpx.get(URL, headers=headers, timeout=15.0)

    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Body length: {len(response.text)} chars")
    # Check whether the key data is in the HTML response
    text = response.text
    for marker in ["CS-7641", "Listed As", "rating", "difficulty", "hrs / week"]:
        found = marker in text
        print(f"Contains {marker!r}: {found}")

if __name__ == "__main__":
    main()