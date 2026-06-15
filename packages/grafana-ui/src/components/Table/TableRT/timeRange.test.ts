import { dateTime, isDateTime } from '@grafana/data';

import { getTimeRange, parseUrlParam } from './timeRange';

describe('parseUrlParam', () => {
  it('returns null for empty input', () => {
    expect(parseUrlParam(null)).toBe(null);
    expect(parseUrlParam('')).toBe(null);
  });

  it('returns the raw value for now-relative ranges', () => {
    expect(parseUrlParam('now-24h')).toBe('now-24h');
    expect(parseUrlParam('now')).toBe('now');
  });

  it('parses YYYYMMDD dates', () => {
    const result = parseUrlParam('20240130');
    expect(isDateTime(result)).toBe(true);
  });

  it('parses YYYYMMDDTHHmmss dates', () => {
    const result = parseUrlParam('20240130T120000');
    expect(isDateTime(result)).toBe(true);
  });

  it('parses epoch values', () => {
    const result = parseUrlParam('1706616000000');
    expect(isDateTime(result)).toBe(true);
  });

  it('returns null for non-parseable values', () => {
    expect(parseUrlParam('not-a-date')).toBe(null);
  });
});

describe('getTimeRange', () => {
  it('builds a TimeRange from string inputs and keeps the raw values', () => {
    const tr = getTimeRange({ from: 'now-6h', to: 'now' });

    expect(tr.raw).toEqual({ from: 'now-6h', to: 'now' });
    expect(isDateTime(tr.from)).toBe(true);
    expect(isDateTime(tr.to)).toBe(true);
  });

  it('copies DateTime inputs into the raw values', () => {
    const from = dateTime('2024-01-30T00:00:00Z');
    const to = dateTime('2024-01-31T00:00:00Z');

    const tr = getTimeRange({ from, to });

    expect(isDateTime(tr.raw.from)).toBe(true);
    expect(isDateTime(tr.raw.to)).toBe(true);
  });
});
