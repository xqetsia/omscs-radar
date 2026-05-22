import { CourseResponse } from "../lib/api";
import { DiscoveredCourse } from "../lib/types";

function ratingColor(rating: number): string {
  if (rating >= 3.5) return "#4caf50";
  if (rating >= 2.5) return "#f4b400";
  return "#e34c4c";
}

const PANEL_ID = "omscs-radar-course-panel";

export function createPanel(): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;

  panel.style.cssText = `
    position: fixed;
    left: 1120px; 
    width: 420px;
    background: white;
    border: 1px solid #d4af37;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: none;
    z-index: 9999;
    font-family: sans-serif;
    box-sizing: border-box;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
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
    
  .omscs-radar-panel-header {
    margin-bottom: 8px;
  }
  .omscs-radar-panel-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .omscs-radar-panel-code {
    background: #A4925A;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .omscs-radar-panel-rating-group {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }
  .omscs-radar-panel-rating-label {
    font-size: 12px;
    color: #666;
  }
  .omscs-radar-panel-rating {
    color: white;
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .omscs-radar-panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #262626;
  }
  .omscs-radar-panel-divider {
    border: none;
    border-top: 2px solid #A4925A;
    margin: 10px 0;
  }
  `;

  document.head.appendChild(style); 

    panel.addEventListener("mouseleave", () => {
    panel.style.display = "none";
  });
  return panel; 
}


export function attachHoverListeners(
  panel: HTMLDivElement, 
  courses: DiscoveredCourse[], 
  byCode: Map<string, CourseResponse>, 
  preferredSource: string
): void {
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const courseLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/cs-"]'
  );

  console.log(`omscs-radar: found ${courseLinks.length} course links`);

  courseLinks.forEach((link) => {
    link.addEventListener("mouseenter", async () => {

      // Cancel any pending hide so the panel doesn't disappear when quickly
      // moving from one course link to another.
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      const linkRect = link.getBoundingClientRect();
      panel.style.top = `${linkRect.top}px`;
      panel.style.left = `${linkRect.right + 24}px`;
      panel.style.display = "block";
      panel.innerHTML = "<p>Loading...</p>";

      const discovered = courses.find((c) => c.element === link);
      const apiCourse = discovered ? byCode.get(discovered.courseCode) : undefined;
      const source = apiCourse?.sources[preferredSource];
      const rating = source?.rating ?? null;

      const overview = await fetchCourseOverview(link.getAttribute("href")!);

      const ratingHTML = rating !== null
        ? `<span class="omscs-radar-panel-rating" style="background:${ratingColor(rating)}">${rating.toFixed(1)}</span>`
        : "";

      panel.innerHTML = `
        <div class="omscs-radar-panel-header">
          <div class="omscs-radar-panel-top">
            <span class="omscs-radar-panel-code">${discovered?.courseCode ?? ""}</span>
            <div class="omscs-radar-panel-rating-group">
              <span class="omscs-radar-panel-rating-label">Overall rating</span>
              ${ratingHTML}
            </div>
          </div>
          <div class="omscs-radar-panel-title">${link.textContent?.trim().replace(/^[A-Z]{2,4}\s+\d{4}:\s*/, "") ?? ""}</div>
        </div>
        <hr class="omscs-radar-panel-divider" />
        ${overview}
      `;
    // After populating the panel, check if it overflows the viewport bottom.
    // If so, flip to bottom-anchored. Clamp to viewport top as a fallback.
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight) {
      const newTop = linkRect.bottom - panel.offsetHeight;
      panel.style.top = `${Math.max(8, newTop)}px`;
    }
    });

    link.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(() => {
        if (!panel.matches(":hover")) {
          panel.style.display = "none";
        }
      }, 500);
    });

  });
 
}

async function fetchCourseOverview(href: string): Promise<string> {
  const url = `https://omscs.gatech.edu${href}`;
  // Mimic a real browser request so GT's server returns the full rendered HTML
  // rather than a stripped version served to non-browser clients.
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
  });
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find the .field--name-body div that contains an <h4> with text "Overview".
  // Multiple divs share this class (e.g. Instructional Team), so we need the right one.
  const allBodies = doc.querySelectorAll(".field--name-body");
  const overviewBody = Array.from(allBodies).find(
    (el) => el.querySelector("h4")?.textContent?.trim() === "Overview"
  );

  if (!overviewBody) return "<p>No overview available.</p>";

  // Grab all sibling elements after the <h4> heading.
  const h4 = overviewBody.querySelector("h4");
  h4?.remove();

  return overviewBody.innerHTML.trim();
}