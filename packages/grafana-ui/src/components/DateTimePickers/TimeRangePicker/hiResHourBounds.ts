import {
  dateMath,
  type DateTime,
  dateTimeFormat,
  dateTimeParse,
  HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS,
  isDateTime,
  rangeUtil,
  resolveHiResTimestampsEnabled,
  type TimeRange,
  type TimeZone,
} from '@grafana/data';

import { commonFormat } from '../commonFormat';
import { isValid } from '../utils';

export function utcMinutesSeconds(value: DateTime | string, timeZone?: TimeZone): string {
  if (isDateTime(value)) {
    return dateTimeFormat(value, { timeZone: 'utc', format: 'mmss' });
  }

  const parsed = dateTimeParse(value, { timeZone, format: commonFormat });
  if (!parsed.isValid()) {
    return '';
  }

  return dateTimeFormat(parsed, { timeZone: 'utc', format: 'mmss' });
}

export function hasFractionalHourOffset(timeZone?: TimeZone): boolean {
  const offsetMinutes = dateTimeParse(Date.now(), { timeZone }).utcOffset();
  return offsetMinutes % 60 !== 0;
}

export function valueAsString(value: DateTime | string, timeZone?: TimeZone): string {
  if (isDateTime(value)) {
    return dateTimeFormat(value, { timeZone, format: commonFormat });
  }

  if (value.endsWith('Z')) {
    const dt = dateTimeParse(value);
    return dateTimeFormat(dt, { timeZone, format: commonFormat });
  }

  return value;
}

export function snapAbsoluteTime(value: string, timeZone: TimeZone | undefined, bound: 'start' | 'end'): string {
  if (dateMath.isMathString(value)) {
    return value;
  }

  const parsed = dateTimeParse(value, { timeZone, format: commonFormat });
  if (!parsed.isValid()) {
    return value;
  }

  const utcTime = parsed.utc();
  let snapped;
  if (bound === 'start') {
    // UTC 13:59:59 is the end of an hour; the hour-only start is 13:00:00.000Z.
    snapped = utcTime.startOf('hour');
  } else if (utcTime.format('mmss') === '0000') {
    // UTC 14:00:00.000 is the start of an hour; the hour-only end is 13:59:59.999Z.
    snapped = utcTime.subtract(1, 'millisecond');
  } else {
    snapped = utcTime.endOf('hour');
  }

  return dateTimeFormat(snapped, { timeZone, format: commonFormat });
}

export function applyHourBoundaryMillis(range: TimeRange): TimeRange {
  if (!dateMath.isMathString(range.raw.from) && utcMinutesSeconds(range.from) === '0000') {
    range.from.set('millisecond', 0);
  }
  if (!dateMath.isMathString(range.raw.to) && utcMinutesSeconds(range.to) === '5959') {
    range.to.set('millisecond', 999);
  }
  return range;
}

export function isDisallowedWhenHourOnly(value: string, timeZone: TimeZone | undefined, bound: 'from' | 'to'): boolean {
  if (dateMath.isMathString(value)) {
    return false;
  }

  const minutesAndSeconds = utcMinutesSeconds(value, timeZone);
  if (!minutesAndSeconds) {
    return false;
  }

  // To must end at UTC :59:59. From must start at UTC :00:00.
  if (bound === 'to') {
    return minutesAndSeconds !== '5959';
  }

  return minutesAndSeconds !== '0000';
}

export function shouldBlockHiResMinutes(
  fromValue: string,
  toValue: string,
  timeZone?: TimeZone,
  fiscalYearStartMonth?: number,
  thresholdDays = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS
): boolean {
  if (!isValid(fromValue, false, timeZone) || !isValid(toValue, true, timeZone)) {
    return false;
  }

  const timeRange = rangeUtil.convertRawToRange(
    { from: fromValue, to: toValue },
    timeZone,
    fiscalYearStartMonth,
    commonFormat
  );
  if (!timeRange.from.isValid() || !timeRange.to.isValid()) {
    return false;
  }

  return !resolveHiResTimestampsEnabled(timeRange, Date.now(), thresholdDays);
}

export function rangeNeedsHiResFormat(
  range: TimeRange,
  timeZone?: TimeZone,
  fiscalYearStartMonth?: number,
  thresholdDays = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS
): boolean {
  const fromValue = valueAsString(range.raw.from, timeZone);
  const toValue = valueAsString(range.raw.to, timeZone);
  if (!isValid(fromValue, false, timeZone) || !isValid(toValue, true, timeZone)) {
    return false;
  }

  if (!shouldBlockHiResMinutes(fromValue, toValue, timeZone, fiscalYearStartMonth, thresholdDays)) {
    return false;
  }

  return isDisallowedWhenHourOnly(fromValue, timeZone, 'from') || isDisallowedWhenHourOnly(toValue, timeZone, 'to');
}

export function formatHiResTimeRange(
  range: TimeRange,
  timeZone?: TimeZone,
  fiscalYearStartMonth?: number
): TimeRange {
  const raw = {
    from: snapAbsoluteTime(valueAsString(range.raw.from, timeZone), timeZone, 'start'),
    to: snapAbsoluteTime(valueAsString(range.raw.to, timeZone), timeZone, 'end'),
  };
  return applyHourBoundaryMillis(rangeUtil.convertRawToRange(raw, timeZone, fiscalYearStartMonth, commonFormat));
}
