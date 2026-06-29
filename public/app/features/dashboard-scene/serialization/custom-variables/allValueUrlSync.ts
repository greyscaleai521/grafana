/**
 * GSAI override (F8) — keep the "All" selection readable in the URL.
 *
 * Scenes serializes an "All" selection using the internal token `$__all`
 * (`var-X=$__all`). Our embedding host and the historical (pre-scenes) Grafana
 * behaviour expect the human-readable `All` (`var-X=All`). Since the host now
 * mirrors the dashboard query string into local storage, the raw `$__all` token
 * leaks out and breaks host-side comparisons.
 *
 * Scenes' `updateFromUrl` already understands the legacy `All` token
 * (`handleLegacyUrlAllValue`), so rewriting only the WRITTEN value keeps a clean
 * round-trip. We patch the variable's url-sync handler instance (not the
 * prototype) so the change is scoped to the dashboard variables we deserialize.
 */
import { type SceneVariable } from '@grafana/scenes';

import { ALL_VARIABLE_TEXT, ALL_VARIABLE_VALUE } from 'app/features/variables/constants';

type UrlValue = string | string[] | null | undefined;

interface PatchableUrlSync {
  getUrlState?: () => Record<string, UrlValue>;
  __gsaiAllPatched?: boolean;
}

const rewrite = (value: UrlValue): UrlValue => {
  if (value === ALL_VARIABLE_VALUE) {
    return ALL_VARIABLE_TEXT;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === ALL_VARIABLE_VALUE ? ALL_VARIABLE_TEXT : item));
  }
  return value;
};

export function patchAllValueUrlSync(variable: SceneVariable): void {
  // Only multi-value variables (custom/query/datasource) can emit `$__all`.
  if (typeof (variable as { hasAllValue?: unknown }).hasAllValue !== 'function') {
    return;
  }

  const handler = variable.urlSync as (SceneVariable['urlSync'] & PatchableUrlSync) | undefined;
  if (!handler || handler.__gsaiAllPatched || typeof handler.getUrlState !== 'function') {
    return;
  }

  const original = handler.getUrlState.bind(handler);
  handler.getUrlState = () => {
    const state = original();
    for (const key of Object.keys(state)) {
      state[key] = rewrite(state[key]);
    }
    return state;
  };
  handler.__gsaiAllPatched = true;
}
