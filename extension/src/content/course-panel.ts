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

  // Scope bullet point styles to the panel to avoid affecting the host page.
  // ::marker targets the list item bullet and overrides its color to GT gold (#A4925A).
  // padding-left ensures proper indentation.
  const style = document.createElement("style");
  style.textContent = `
    #omscs-radar-course-panel ul {
      padding-left: 20px;
    }
    #omscs-radar-course-panel li::marker {
      color: #A4925A;
    }
  `;

  document.head.appendChild(style);

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
        panel.innerHTML = "<p>Loading...</p>"; 

        const overview = await fetchCourseOverview(link.getAttribute("href")!);
        panel.innerHTML = overview;
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
  if (!body) return "<p>No overview available.</p>";

  // Remove the <h4>Overview</h4> heading since we'll add our own
  body.querySelector("h4")?.remove();

  return body.innerHTML.trim();
}