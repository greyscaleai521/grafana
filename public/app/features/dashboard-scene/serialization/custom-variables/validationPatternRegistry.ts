/**
 * Runtime registry for textbox variable validation supplied by the embedding
 * host (e.g. gsai-insights-web) over postMessage.
 *
 * This lets the host own validation instead of persisting it in the dashboard
 * model. Three complementary mechanisms:
 *   - `patterns` (F2): per-variable, value-format regex validated on blur/Enter.
 *       { key: 'validationPatterns', value: { <variableName>: '<regex>' } }
 *   - `defaultInputPattern` (F3): a single allowed-characters regex applied to
 *     EVERY textbox variable while typing (invalid keystrokes are dropped).
 *       { key: 'inputCharPattern', value: '<regex>' }
 *   - `inputPatterns`: per-variable allowed-characters regex that overrides the
 *     default keystroke gate for specific variables (e.g. numeric-only for
 *     range filters).
 *       { key: 'inputCharPatternsByName', value: { <variableName>: '<regex>' } }
 *
 * All are sent either proactively (on iframe load) or in response to our
 *   { key: 'requestValidationPatterns' }
 * handshake. Patterns are keyed by variable name (not the `var-` URL prefix).
 *
 * Validation here is a UX/data-quality aid only — server-side escaping/coercion
 * remains the actual security boundary.
 */

type PatternMap = Record<string, string>;

export interface ValidationConfig {
  /** Per-variable value-format patterns, validated on commit (blur/Enter). */
  patterns: PatternMap;
  /** Per-variable allowed-characters patterns; override defaultInputPattern. */
  inputPatterns: PatternMap;
  /** Allowed-characters pattern applied to all textbox inputs while typing. */
  defaultInputPattern?: string;
}

// A single cached snapshot object; its reference only changes when data changes
// so useSyncExternalStore stays stable (no render loops).
let config: ValidationConfig = { patterns: {}, inputPatterns: {}, defaultInputPattern: undefined };
const listeners = new Set<() => void>();
let initialized = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setPatterns(next: PatternMap) {
  config = { ...config, patterns: next ?? {} };
  emit();
}

function setInputPatterns(next: PatternMap) {
  config = { ...config, inputPatterns: next ?? {} };
  emit();
}

function setDefaultInputPattern(next: string | undefined) {
  config = { ...config, defaultInputPattern: next || undefined };
  emit();
}

export function getValidationConfigSnapshot(): ValidationConfig {
  return config;
}

export function subscribeToValidationPatterns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Registers the window message listener and asks the host for the current
 * config. Safe to call multiple times; only the first call has an effect.
 */
export function initValidationPatternBridge() {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event?.data;
    if (!data) {
      return;
    }
    if (data.key === 'validationPatterns' && data.value && typeof data.value === 'object') {
      setPatterns(data.value);
    } else if (data.key === 'inputCharPatternsByName' && data.value && typeof data.value === 'object') {
      setInputPatterns(data.value);
    } else if (data.key === 'inputCharPattern' && (typeof data.value === 'string' || data.value == null)) {
      setDefaultInputPattern(data.value);
    }
  });

  // If we're embedded, ask the host to send the current config.
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ key: 'requestValidationPatterns' }, '*');
  }
}

initValidationPatternBridge();
