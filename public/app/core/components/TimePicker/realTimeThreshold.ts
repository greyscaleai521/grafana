import { REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE, resolveRealTimeThresholdDays } from '@grafana/data';
import { getTemplateSrv, type VariableInterpolation } from '@grafana/runtime';

export function getDashboardRealTimeThresholdDays(): number {
  try {
    const templateSrv = getTemplateSrv();
    const variable = templateSrv?.getVariables().find((item) => item.name === REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE);
    if (variable && 'current' in variable) {
      return resolveRealTimeThresholdDays((variable as { current?: { value?: unknown } }).current?.value);
    }

    const interpolations: VariableInterpolation[] = [];
    const replaced = templateSrv?.replace(
      `$${REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE}`,
      undefined,
      undefined,
      interpolations
    );
    if (interpolations[0]?.found) {
      return resolveRealTimeThresholdDays(replaced);
    }
  } catch {
    // TemplateSrv is not always available in isolated tests.
  }

  return resolveRealTimeThresholdDays(undefined);
}
