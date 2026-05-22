/**
 * Rating badge component.
 *
 * Builds a DOM element shown below each course on the OMSCS catalog
 * displaying rating, difficulty, and workload from one source. Each stat
 * has a visual indicator of severity (green = pleasant, red = brutal),
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

const DIFFICULTY_LABEL: Record<Severity, string> = {
  good: "EASY",
  ok: "MEDIUM",
  bad: "HARD",
};

export function renderBadge(source: CourseSourceData): HTMLSpanElement | null {
  if (
    source.rating === null
    && source.difficulty === null
    && source.workload_hours_per_week === null
  ) {
    return null;
  }

  const container = document.createElement("span");
  container.className = "omscs-radar-badge";

  if (source.rating !== null) {
    appendRatingStat(container, source.rating);
  }
  if (source.difficulty !== null) {
    appendDifficultyStat(container, source.difficulty);
  }

  if (source.workload_hours_per_week !== null) {
    const severity = severityLowerBetter(source.workload_hours_per_week, 11.9, 19);
    appendWorkloadStat(container, source.workload_hours_per_week, severity);
  }

  return container;
}

function appendRatingStat(container: HTMLSpanElement, rating: number): void {
  const severity = severityHigherBetter(rating, 2.5, 3.5);

  maybeSep(container);

  const stat = document.createElement("span");
  stat.className = "omscs-radar-stat";

  const label = document.createElement("span");
  label.className = "omscs-radar-label";
  label.textContent = "rating";

  const chip = document.createElement("span");
  chip.className = `omscs-radar-rating-chip omscs-radar-rating-chip--${severity}`;
  chip.textContent = rating.toFixed(1);

  stat.append(label, chip);
  container.append(stat);
}

function appendDifficultyStat(container: HTMLSpanElement, difficulty: number): void {
  const severity = severityLowerBetter(difficulty, 2.5, 4);

  maybeSep(container);

  const stat = document.createElement("span");
  stat.className = "omscs-radar-stat";

  const label = document.createElement("span");
  label.className = "omscs-radar-label";
  label.textContent = "difficulty";

  const diffLabel = document.createElement("span");
  diffLabel.className = `omscs-radar-difficulty omscs-radar-difficulty--${severity}`;
  diffLabel.textContent = DIFFICULTY_LABEL[severity];

  stat.append(label, diffLabel);
  container.append(stat);
}

function appendWorkloadStat(container: HTMLSpanElement, workload: number, severity: Severity): void {
  maybeSep(container);

  const stat = document.createElement("span");
  stat.className = "omscs-radar-stat";

  const label = document.createElement("span");
  label.className = "omscs-radar-label";
  label.textContent = "workload";

  const chip = document.createElement("span");
  chip.className = `omscs-radar-workload-chip omscs-radar-workload-chip--${severity}`;
  chip.textContent = `${workload.toFixed(1)}/wk`;

  stat.append(label, chip);
  container.append(stat);
}

function appendStat(
  container: HTMLSpanElement,
  options: {
    label: string;
    value: number;
    severity: Severity;
    decimals: number;
    suffix?: string;
  },
): void {
  maybeSep(container);

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

/** Inserts a "|" separator if the container already has children. */
function maybeSep(container: HTMLSpanElement): void {
  if (container.childElementCount > 0) {
    const sep = document.createElement("span");
    sep.className = "omscs-radar-sep";
    sep.textContent = "|";
    container.append(sep);
  }
}