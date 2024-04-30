import { DateTime, TimeRange, TimeZone, dateMath, dateTime, isDateTime, toUtc } from '@grafana/data';

export function parseUrlParam(value: any) {
  if (!value) {
    return null;
  }
  if (value.indexOf('now') !== -1) {
    return value;
  }
  if (value.length === 8) {
    const utcValue = toUtc(value, 'YYYYMMDD');
    if (utcValue.isValid()) {
      return utcValue;
    }
  } else if (value.length === 15) {
    const utcValue = toUtc(value, 'YYYYMMDDTHHmmss');
    if (utcValue.isValid()) {
      return utcValue;
    }
  }

  if (!isNaN(value)) {
    const epoch = parseInt(value, 10);
    return toUtc(epoch);
  }

  return null;
}

export interface TimeModel {
  time: any;
  fiscalYearStartMonth?: number;
  refresh: any;
  timepicker: any;
  getTimezone(): TimeZone;
  timeRangeUpdated(timeRange: TimeRange): void;
}

export const getTimeRange = (
  time: { from: DateTime | string; to: DateTime | string },
  timeModel?: TimeModel
): TimeRange => {
  // make copies if they are moment  (do not want to return out internal moment, because they are mutable!)
  const raw = {
    from: isDateTime(time.from) ? dateTime(time.from) : time.from,
    to: isDateTime(time.to) ? dateTime(time.to) : time.to,
  };

  const timezone = timeModel ? timeModel.getTimezone() : undefined;

  return {
    from: dateMath.parse(raw.from, false, timezone, timeModel?.fiscalYearStartMonth)!,
    to: dateMath.parse(raw.to, true, timezone, timeModel?.fiscalYearStartMonth)!,
    raw: raw,
  };
};
