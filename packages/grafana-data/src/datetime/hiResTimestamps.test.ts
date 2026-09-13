import { type TimeRange } from '../types/time';

import {
  getHiResTimestampsState,
  HIRES_TIMESTAMPS_BEYOND_MS,
  HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS,
  HIRES_TIMESTAMPS_SHORT_RANGE_MS,
  resolveHiResTimestampsEnabled,
  resolveRealTimeThresholdDays,
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

  it('keeps Last N days ON when now has advanced a few seconds past parse time', () => {
    const from = dateTime(NOW).subtract(30, 'd');
    const to = dateTime(NOW);
    const range: TimeRange = { from, to, raw: { from: 'now-30d', to: 'now' } };

    expect(getHiResTimestampsState(range, NOW + 5000)).toEqual({ defaultOn: true, interactive: false });
  });

  it('stays ON for the rest of the inclusive threshold day', () => {
    expect(getHiResTimestampsState(rangeAt(-HIRES_TIMESTAMPS_BEYOND_MS - 23 * HOUR, 0), NOW)).toEqual({
      defaultOn: true,
      interactive: false,
    });
  });

  it('turns OFF at a full extra day beyond the threshold when the span is over 24h', () => {
    expect(getHiResTimestampsState(rangeAt(-31 * 24 * HOUR, 0), NOW)).toEqual({
      defaultOn: false,
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

  it('uses a custom RealTimeThresholdInDays value', () => {
    expect(resolveHiResTimestampsEnabled(rangeAt(-10 * 24 * HOUR, -8 * 24 * HOUR), NOW, 7)).toBe(false);
    expect(resolveHiResTimestampsEnabled(rangeAt(-5 * 24 * HOUR, 0), NOW, 7)).toBe(true);
    expect(resolveHiResTimestampsEnabled(rangeAt(-7 * 24 * HOUR, 0), NOW, 7)).toBe(true);
  });
});

describe('resolveRealTimeThresholdDays', () => {
  it('defaults to 30 when missing or invalid', () => {
    expect(resolveRealTimeThresholdDays(undefined)).toBe(HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS);
    expect(resolveRealTimeThresholdDays('$RealTimeThresholdInDays')).toBe(HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS);
    expect(resolveRealTimeThresholdDays('abc')).toBe(HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS);
    expect(resolveRealTimeThresholdDays(0)).toBe(HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS);
    expect(resolveRealTimeThresholdDays(-5)).toBe(HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS);
  });

  it('parses a positive number or numeric string', () => {
    expect(resolveRealTimeThresholdDays(7)).toBe(7);
    expect(resolveRealTimeThresholdDays('14')).toBe(14);
    expect(resolveRealTimeThresholdDays(['21'])).toBe(21);
  });
});
