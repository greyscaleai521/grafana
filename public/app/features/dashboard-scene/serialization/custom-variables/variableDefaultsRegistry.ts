/**
 * F4 — snapshot of each variable's dashboard-authored default value, captured
 * at deserialization time (before URL overrides are applied). The category
 * "Clear" / "Clear All" actions restore these so a filter reverts to the value
 * saved in the dashboard, not to empty.
 *
 * Scenes ignores a removed URL param (`updateFromUrl` bails on null), so a
 * filter can't be cleared by dropping its `var-` key — we must set the value
 * back explicitly. The snapshot lets us do that for every variable type.
 */
import { type SceneVariable, type VariableValue } from '@grafana/scenes';

interface VariableDefault {
  value: VariableValue;
  text?: VariableValue;
}

const defaults = new WeakMap<SceneVariable, VariableDefault>();

type StatefulVariable = SceneVariable & {
  state: SceneVariable['state'] & { value?: VariableValue; text?: VariableValue };
};

function hasValueState(variable: SceneVariable): variable is StatefulVariable {
  return 'value' in variable.state;
}

/**
 * Records a variable's authored default. Call once, right after the variable is
 * created from the saved model and before activation/URL sync mutate its value.
 * Re-recording is ignored so a later re-render can't capture a user-set value.
 */
export function recordVariableDefault(variable: SceneVariable): void {
  if (defaults.has(variable) || !hasValueState(variable)) {
    return;
  }
  defaults.set(variable, { value: variable.state.value!, text: variable.state.text });
}

/** Restores a variable to its recorded default value (no-op if none recorded). */
export function clearVariableToDefault(variable: SceneVariable): void {
  const def = defaults.get(variable);
  if (!def) {
    return;
  }

  const candidate = variable as Partial<{
    setValue: (value: VariableValue) => void;
    changeValueTo: (value: VariableValue, text?: VariableValue) => void;
  }>;

  if (typeof candidate.setValue === 'function') {
    // TextBoxVariable
    candidate.setValue(def.value);
  } else if (typeof candidate.changeValueTo === 'function') {
    // MultiValueVariable (custom/query/datasource)
    candidate.changeValueTo(def.value, def.text);
  }
}

export function hasVariableDefault(variable: SceneVariable): boolean {
  return defaults.has(variable);
}
