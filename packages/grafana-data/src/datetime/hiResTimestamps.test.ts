import { type TimeRange } from '../types/time';

import {
  getHiResTimestampsState,
  HIRES_TIMESTAMPS_BEYOND_MS,
  HIRES_TIMESTAMPS_SHORT_RANGE_MS,
  resolveHiResTimestampsEnabled,
} from './hiResTimestamps';
import { dateTime } from './moment_wrapper';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function rangeAt(fromOffsetMs: number, toOffsetMs: number): TimeRange {
  const from = dateTime(NOW + fromOffsetMs);
  const to = dateTime(NOW + toOffsetMs);
  return { from, to, raw: { from, to } };
}

describe('getHiResTimestampsState', () => {
  it('Condition A: both from and to within 30 days are ON and read-only', () => {
    expect(getHiResTimestampsState(rangeAt(-6 * HOUR, 0), NOW)).toEqual({ defaultOn: true, interactive: false });
    expect(
      getHiResTimestampsState(
        rangeAt((10 * HIRES_TIMESTAMPS_BEYOND_MS) / 30, (11 * HIRES_TIMESTAMPS_BEYOND_MS) / 30),
        NOW
      )
    ).toEqual({
      defaultOn: true,
      interactive: false,
    });
  });

  it('Condition B: beyond 30 days and span > 24h is OFF and read-only', () => {
    expect(getHiResTimestampsState(rangeAt(-40 * 24 * HOUR, -35 * 24 * HOUR), NOW)).toEqual({
      defaultOn: false,
      interactive: false,
    });
    expect(getHiResTimestampsState(rangeAt(-90 * 24 * HOUR, 0), NOW)).toEqual({ defaultOn: false, interactive: false });
    expect(getHiResTimestampsState(rangeAt(40 * 24 * HOUR, 50 * 24 * HOUR), NOW)).toEqual({
      defaultOn: false,
      interactive: false,
    });
  });

  it('Condition C: beyond 30 days and span <= 24h is ON and read-only', () => {
    expect(getHiResTimestampsState(rangeAt(-40 * 24 * HOUR, -40 * 24 * HOUR + 2 * HOUR), NOW)).toEqual({
      defaultOn: true,
      interactive: false,
    });
    expect(
      getHiResTimestampsState(rangeAt(-40 * 24 * HOUR, -40 * 24 * HOUR + HIRES_TIMESTAMPS_SHORT_RANGE_MS), NOW)
    ).toEqual({ defaultOn: true, interactive: false });
  });

  it('span just over 24h is Condition B', () => {
    expect(
      getHiResTimestampsState(rangeAt(-40 * 24 * HOUR, -40 * 24 * HOUR + HIRES_TIMESTAMPS_SHORT_RANGE_MS + 1), NOW)
    ).toEqual({ defaultOn: false, interactive: false });
  });

  it('exactly 30 days away is still Condition A', () => {
    expect(
      getHiResTimestampsState(rangeAt(-HIRES_TIMESTAMPS_BEYOND_MS, -HIRES_TIMESTAMPS_BEYOND_MS + HOUR), NOW)
    ).toEqual({
      defaultOn: true,
      interactive: false,
    });
  });
});

describe('resolveHiResTimestampsEnabled', () => {
  it('is true for Condition A and C and false for Condition B', () => {
    expect(resolveHiResTimestampsEnabled(rangeAt(-6 * HOUR, 0), NOW)).toBe(true);
    expect(resolveHiResTimestampsEnabled(rangeAt(-40 * 24 * HOUR, -40 * 24 * HOUR + 2 * HOUR), NOW)).toBe(true);
    expect(resolveHiResTimestampsEnabled(rangeAt(-90 * 24 * HOUR, 0), NOW)).toBe(false);
  });
});
