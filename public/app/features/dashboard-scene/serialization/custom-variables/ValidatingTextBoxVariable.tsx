import { type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';

import { t } from '@grafana/i18n';
import { type SceneComponentProps, TextBoxVariable, sceneUtils } from '@grafana/scenes';
import { AutoSizeInput, Tooltip } from '@grafana/ui';

import { getValidationConfigSnapshot, subscribeToValidationPatterns } from './validationPatternRegistry';

/**
 * F2 — value-format check, run on commit (blur/Enter).
 * Returns true when the value satisfies the pattern. Empty values and an
 * empty/invalid pattern are treated as valid (no validation).
 */
export function isTextBoxValueValid(value: string | undefined, pattern: string | undefined): boolean {
  if (!pattern || value == null || value === '') {
    return true;
  }
  try {
    return new RegExp(pattern).test(value);
  } catch {
    // A malformed host-supplied pattern must never block input.
    return true;
  }
}

/**
 * F3 — allowed-characters check, run on every keystroke so invalid characters
 * are dropped before they appear. Empty values and an empty/invalid pattern are
 * allowed.
 */
export function isInputCharsAllowed(value: string, pattern: string | undefined): boolean {
  if (!pattern || value === '') {
    return true;
  }
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true;
  }
}

/**
 * A drop-in replacement for the scenes TextBoxVariable whose picker enforces
 * host-supplied validation at runtime (see validationPatternRegistry):
 *   - F3: a global allowed-characters gate drops invalid keystrokes as you type.
 *   - F2: a per-variable (by name) format regex flags the value on blur/Enter
 *         and blocks the commit when it doesn't match.
 *
 * It extends the library class so all existing `instanceof TextBoxVariable`
 * checks and `state.type === 'textbox'` guards keep working; only the rendered
 * picker differs. Nothing is persisted in the dashboard model.
 *
 * Validation is a UX/data-quality aid only — server-side escaping/coercion
 * remains the actual security boundary.
 */
export class ValidatingTextBoxVariable extends TextBoxVariable {
  public static Component = ValidatingTextBoxVariableRenderer;
}

function ValidatingTextBoxVariableRenderer({ model }: SceneComponentProps<TextBoxVariable>) {
  const { value, key, loading, name } = model.useState();

  // Host-supplied config: per-name format patterns + a global input charset.
  const config = useSyncExternalStore(
    subscribeToValidationPatterns,
    getValidationConfigSnapshot,
    getValidationConfigSnapshot
  );
  const pattern = config.patterns[name];
  // Per-variable keystroke charset (e.g. numeric for range filters) overrides
  // the global default.
  const inputPattern = config.inputPatterns[name] ?? config.defaultInputPattern;

  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  // Reset/re-validate when the committed value changes or when the pattern
  // arrives/changes (e.g. host sends the config after first render).
  useEffect(() => {
    setDraft(value);
    setInvalid(!isTextBoxValueValid(value, pattern));
  }, [value, pattern]);

  const onChange = (e: FormEvent<HTMLInputElement>) => {
    const next = e.currentTarget.value;
    // F3 gate: reject keystrokes that introduce disallowed characters. Because
    // the input is controlled by `draft`, not updating it reverts the change so
    // the character never appears.
    if (!isInputCharsAllowed(next, inputPattern)) {
      return;
    }
    // Only track the draft while typing. Format validation happens on blur /
    // Enter so intermediate values (e.g. "1." while typing "1.2") don't flip
    // the error state and remount the input (which would steal focus).
    setDraft(next);
  };

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!isTextBoxValueValid(next, pattern)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    model.setValue(next);
  };

  const invalidMessage = t(
    'dashboard-scene.validating-text-box-variable.invalid-format',
    'Value does not match the required format'
  );

  // Always render the Tooltip wrapper (stable element tree) so the input is
  // never remounted when validity toggles — which would otherwise steal focus
  // and leave a stale error state. `show={false}` keeps it closed when valid;
  // `show={undefined}` restores hover/focus behavior when invalid.
  return (
    <Tooltip content={invalidMessage} placement="bottom" show={invalid ? undefined : false}>
      {/* The span is the tooltip trigger so floating-ui's cloned handlers land
          here and don't override the input's own onChange/onBlur/onKeyDown. */}
      <span>
        <AutoSizeInput
          id={sceneUtils.getVariableControlId('textbox', key)}
          type="text"
          minWidth={15}
          maxWidth={30}
          value={draft}
          loading={loading}
          invalid={invalid}
          placeholder={t('grafana-scenes.variables.variable-value-input.placeholder-enter-value', 'Enter value')}
          onChange={onChange}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit(e.currentTarget.value);
            }
          }}
        />
      </span>
    </Tooltip>
  );
}
