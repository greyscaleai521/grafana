import { type TimeRange } from '../types/time';

export const REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE = 'RealTimeThresholdInDays';
export const HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS = 30;
export const HIRES_TIMESTAMPS_BEYOND_MS = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
export const HIRES_TIMESTAMPS_SHORT_RANGE_MS = 24 * 60 * 60 * 1000;

export interface HiResTimestampsRuleState {
  defaultOn: boolean;
  interactive: boolean;
}

export function resolveRealTimeThresholdDays(raw?: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const days = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(days) || days <= 0) {
    return HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS;
  }
  return days;
}

export function getHiResTimestampsState(
  range: TimeRange,
  now = Date.now(),
  thresholdDays = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS
): HiResTimestampsRuleState {
  const fromMs = range.from.valueOf();
  const toMs = range.to.valueOf();
  const beyondThreshold =
    isOutsideRealTimeThreshold(fromMs, now, thresholdDays) || isOutsideRealTimeThreshold(toMs, now, thresholdDays);
  const spanMs = Math.abs(toMs - fromMs);

  if (!beyondThreshold) {
    return { defaultOn: true, interactive: false };
  }

  if (spanMs <= HIRES_TIMESTAMPS_SHORT_RANGE_MS) {
    return { defaultOn: true, interactive: false };
  }

  return { defaultOn: false, interactive: false };
}

/** True once a timestamp is a full extra day past the inclusive N-day window. */
function isOutsideRealTimeThreshold(ts: number, now: number, thresholdDays: number): boolean {
  const days = resolveRealTimeThresholdDays(thresholdDays);
  return Math.abs(ts - now) >= (days + 1) * 24 * 60 * 60 * 1000;
}

export function resolveHiResTimestampsEnabled(
  range: TimeRange,
  now = Date.now(),
  thresholdDays = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS
): boolean {
  return getHiResTimestampsState(range, now, thresholdDays).defaultOn;
}
