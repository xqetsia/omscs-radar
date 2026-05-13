/**
 * Rating badge component.
 *
 * Builds a DOM element shown below each course on the OMSCS catalog
 * displaying rating, difficulty, and workload from one source. Each stat
 * has a colored dot indicating severity (green = pleasant, red = brutal),
 * so a user scanning the catalog can spot easy/hard courses at a glance.
 *
 * The thresholds for severity are calibrated to OMSCS norms — most courses
 * cluster around rating 3.0–4.0, difficulty 2.5–4.0, workload 8–20 hr/week.
 */

import type { CourseSourceData } from "../lib/api";

type Severity = "good" | "ok" | "bad";

/** Higher is better. Used for rating. */
function severityHigherBetter(value: number, low: number, high: number): Severity {
  if (value >= high) return "good";
  if (value >= low) return "ok";
  return "bad";
}

/** Lower is better. Used for difficulty and workload. */
function severityLowerBetter(value: number, low: number, high: number): Severity {
  if (value <= low) return "good";
  if (value <= high) return "ok";
  return "bad";
}

export function renderBadge(source: CourseSourceData): HTMLSpanElement | null {
  // Skip empty courses entirely.
  if (
    source.rating === null
    && source.difficulty === null
    && source.workload_hours_per_week === null
  ) {
    return null;
  }

  const container = document.createElement("span");
  container.className = "omscs-radar-badge";

  appendStat(container, {
    label: "rating",
    value: source.rating,
    severity: source.rating !== null
      ? severityHigherBetter(source.rating, 2.5, 3.5)
      : null,
    decimals: 1,
  });
  appendStat(container, {
    label: "difficulty",
    value: source.difficulty,
    severity: source.difficulty !== null
      ? severityLowerBetter(source.difficulty, 2.5, 3.5)
      : null,
    decimals: 1,
  });
  appendStat(container, {
    label: "workload",
    value: source.workload_hours_per_week,
    severity: source.workload_hours_per_week !== null
      ? severityLowerBetter(source.workload_hours_per_week, 10, 15)
      : null,
    decimals: 1,
    suffix: "/wk",
  });

  return container;
}

function appendStat(
  container: HTMLSpanElement,
  options: {
    label: string;
    value: number | null;
    severity: Severity | null;
    decimals: number;
    suffix?: string;
  },
): void {
  if (options.value === null || options.severity === null) return;

  // Visual separator between stats. Skipped on the first stat by checking
  // whether the container already has children.
  if (container.childElementCount > 0) {
    const sep = document.createElement("span");
    sep.className = "omscs-radar-sep";
    sep.textContent = "|";
    container.append(sep);
  }

  const stat = document.createElement("span");
  stat.className = "omscs-radar-stat";

  const dot = document.createElement("span");
  dot.className = `omscs-radar-dot omscs-radar-dot--${options.severity}`;

  const label = document.createElement("span");
  label.className = "omscs-radar-label";
  label.textContent = options.label;

  const value = document.createElement("span");
  value.className = "omscs-radar-value";
  value.textContent = options.value.toFixed(options.decimals) + (options.suffix ?? "");

  stat.append(dot, label, value);
  container.append(stat);
}