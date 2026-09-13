import { type TimeRange } from '../types/time';

export const HIRES_TIMESTAMPS_BEYOND_MS = 30 * 24 * 60 * 60 * 1000;
export const HIRES_TIMESTAMPS_SHORT_RANGE_MS = 24 * 60 * 60 * 1000;

export interface HiResTimestampsRuleState {
  defaultOn: boolean;
  interactive: boolean;
}

export function getHiResTimestampsState(range: TimeRange, now = Date.now()): HiResTimestampsRuleState {
  const fromMs = range.from.valueOf();
  const toMs = range.to.valueOf();
  const beyond30Days =
    Math.abs(fromMs - now) > HIRES_TIMESTAMPS_BEYOND_MS || Math.abs(toMs - now) > HIRES_TIMESTAMPS_BEYOND_MS;
  const spanMs = Math.abs(toMs - fromMs);

  if (!beyond30Days) {
    return { defaultOn: true, interactive: false };
  }

  if (spanMs <= HIRES_TIMESTAMPS_SHORT_RANGE_MS) {
    return { defaultOn: true, interactive: false };
  }

  return { defaultOn: false, interactive: false };
}

export function resolveHiResTimestampsEnabled(range: TimeRange, now = Date.now()): boolean {
  return getHiResTimestampsState(range, now).defaultOn;
}
