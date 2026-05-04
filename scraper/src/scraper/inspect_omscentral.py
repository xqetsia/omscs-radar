"""Look at the structure of the Next.js RSC payload to plan extraction."""

import httpx
from bs4 import BeautifulSoup

URL = "https://www.omscentral.com/"
USER_AGENT = "omscs-radar/0.1 (+https://github.com/xqetsia/omscs-radar)"


def main() -> None:
    response = httpx.get(URL, headers={"User-Agent": USER_AGENT}, timeout=15.0)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    scripts = soup.find_all("script")

    target = None
    for script in scripts:
        text = script.string or ""
        if "CS-7641" in text:
            target = text
            break

    if target is None:
        print("No script with CS-7641 found")
        return

    print(f"Script length: {len(target)}\n")

    # Print the very start (to see the wrapper format)
    print("===== FIRST 500 CHARS =====")
    print(target[:500])
    print()

    # Print a window around the first course-like object
    idx = target.find("CS-7641")
    print("===== AROUND FIRST CS-7641 =====")
    print(target[max(0, idx - 500):idx + 500])
    print()


if __name__ == "__main__":
    main()