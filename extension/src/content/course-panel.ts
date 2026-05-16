const PANEL_ID = "omscs-radar-course-panel";

export function createPanel(): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    top: 120px;
    right: 24px;
    width: 320px;
    background: white;
    border: 1px solid #d4af37;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: none;
    z-index: 9999;
    font-family: sans-serif;
  `;
  document.body.appendChild(panel);
  return panel;
}

export function attachHoverListeners(panel: HTMLDivElement): void {
  const courseLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/cs-"]'
  );

  console.log(`omscs-radar: found ${courseLinks.length} course links`);

  courseLinks.forEach((link) => {
    link.addEventListener("mouseenter", async () => {
        panel.style.display = "block";
        panel.textContent = "Loading...";

        const overview = await fetchCourseOverview(link.getAttribute("href")!);
        panel.textContent = overview;
    });

    link.addEventListener("mouseleave", () => {
      panel.style.display = "none";
    });
  });
}

async function fetchCourseOverview(href: string): Promise<string> {
  const url = `https://omscs.gatech.edu${href}`;
  const response = await fetch(url);
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const body = doc.querySelector(".field--name-body");
  return body?.textContent?.trim() ?? "No overview available.";
}