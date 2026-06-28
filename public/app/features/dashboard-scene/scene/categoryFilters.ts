/**
 * F4 — category/grouping filters for the scenes variable controls.
 *
 * The grouping metadata rides on the variable `description` (the only free-text
 * field that survives the V1→V2 dashboard conversion). Convention:
 *
 *   "<category> @info:<tooltip text>"
 *
 * - everything before `@info:` is the category/tab name;
 * - everything after it is the description shown in the info tooltip;
 * - with no `@info:` token the whole string is the category (no tooltip);
 * - a variable with no description is uncategorized (shown under "Other").
 *
 * The non-default counter is kept generic here: empty/`$__all`/`All` are always
 * treated as default, and the host supplies any business-specific default
 * values over the postMessage bridge (see validationPatternRegistry).
 */
import { type SceneVariable, type SceneVariableState, type VariableValue } from '@grafana/scenes';

import { type ValidationConfig } from '../serialization/custom-variables/validationPatternRegistry';

export const INFO_DELIMITER = '@info:';
/** Synthetic tab name for variables that carry no category. */
export const OTHER_CATEGORY = 'Other';

// Values that always count as "default" regardless of host config.
const BASELINE_DEFAULTS = new Set(['', 'All', '$__all']);

export interface ParsedCategory {
  /** Category/tab name, or undefined when the variable is uncategorized. */
  category?: string;
  /** Info text for the tooltip, or undefined when there is none. */
  info?: string;
}

export function parseVariableCategory(description?: string | null): ParsedCategory {
  if (!description) {
    return {};
  }
  const idx = description.indexOf(INFO_DELIMITER);
  if (idx === -1) {
    const category = description.trim();
    return category ? { category } : {};
  }
  const category = description.slice(0, idx).trim();
  const info = description.slice(idx + INFO_DELIMITER.length).trim();
  return {
    category: category || undefined,
    info: info || undefined,
  };
}

function valueToString(value: VariableValue | undefined | null): string {
  if (value == null) {
    return '';
  }
  return Array.isArray(value) ? value.map(String).join(',') : String(value);
}

/**
 * True when the variable holds a non-default (i.e. user-applied) value, used to
 * drive the per-category counter badge.
 *
 * Compares the raw selected value/text (`state.value`/`state.text`), NOT
 * `getValue()`: for an "All" selection `getValue()` resolves to the full option
 * list, which would never match a default and inflate the counter. The raw
 * state keeps `$__all` / `All`, matching the default sets.
 */
export function isVariableActive(variable: SceneVariable, config: ValidationConfig): boolean {
  const v: SceneVariable & {
    state: SceneVariableState & { value?: VariableValue; text?: VariableValue; allValue?: string };
    hasAllValue?: () => boolean;
  } = variable;
  const state = v.state;

  // An "All" selection is the default state for an include-all variable. Detect
  // it structurally so it holds regardless of a custom all-value or how the
  // value is stored (`$__all`, the expanded option list, etc.).
  if (typeof v.hasAllValue === 'function' && v.hasAllValue()) {
    return false;
  }

  // Consider both the value and (if different) the display text, so a default
  // expressed as a label (e.g. "Production") is recognised regardless of how
  // the variable stores it.
  const candidates = [valueToString(state.value)];
  const textStr = valueToString(state.text);
  if (textStr && !candidates.includes(textStr)) {
    candidates.push(textStr);
  }

  if (candidates.every((c) => c === '')) {
    return false;
  }

  const defaultSet = new Set<string>([...BASELINE_DEFAULTS, ...config.defaultValues]);
  // A configured custom all-value (e.g. "NULL") is a default too.
  if (state.allValue) {
    defaultSet.add(state.allValue);
  }
  const perName = config.defaultValuesByName[state.name];
  if (perName !== undefined) {
    defaultSet.add(perName);
  }

  return !candidates.some((c) => defaultSet.has(c));
}
