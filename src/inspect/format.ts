import { describe, type InspectReport } from './inspect.js';

const MAX_LOCATOR_COLUMN = 56;
const MAX_ROLE_COLUMN = 10;
const INDENT = '  ';

export function formatInspect(report: InspectReport): string {
  const shown = report.targets.length;
  const lines = [`Frame: ${report.frame}`];
  if (shown === 0) {
    lines.push('No clickable targets found.');
  } else {
    const more =
      report.total > shown ? ` (showing ${shown} of ${report.total}; use --filter or --limit)` : '';
    lines.push(`Targets${more}:`);
    const width = Math.min(
      Math.max(...report.targets.map((target) => describe(target.locator).length)),
      MAX_LOCATOR_COLUMN,
    );
    for (const target of report.targets) {
      const state = target.disabled ? `${target.where}, disabled` : target.where;
      lines.push(
        `${INDENT}${describe(target.locator).padEnd(width)}  ${target.role.padEnd(MAX_ROLE_COLUMN)}  ${state}`,
      );
    }
  }
  if (report.warnings.length > 0) {
    lines.push('Warnings:', ...report.warnings.map((warning) => `${INDENT}- ${warning}`));
  }
  return lines.join('\n');
}
