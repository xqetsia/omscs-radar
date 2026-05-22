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
  return panel; 
}


export function attachHoverListeners(
  panel: HTMLDivElement, 
  courses: DiscoveredCourse[], 
  byCode: Map<string, CourseResponse>, 
  preferredSource: string
): void {
  const courseLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/cs-"]'
  );

  console.log(`omscs-radar: found ${courseLinks.length} course links`);

  courseLinks.forEach((link) => {
 link.addEventListener("mouseenter", async () => {
  const linkRect = link.getBoundingClientRect();
  panel.style.top = `${linkRect.top}px`;
  panel.style.left = `${linkRect.right + 80}px`;
  panel.style.display = "block";
  panel.innerHTML = "<p>Loading...</p>";

  // Match the hovered link to its discovered course to get the course code.
  // Then look up the API data and extract the rating for the preferred source.
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