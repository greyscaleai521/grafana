import { dateTime, dateTimeParse } from '@grafana/data';

import { applyCalendarDate, inputToValue } from './CalendarBody';

describe('inputToValue', () => {
  describe('when called with valid dates', () => {
    describe('and from is after to', () => {
      it('then to should be first in the result', () => {
        const from = dateTime('2020-04-16T11:00:00.000Z');
        const to = dateTime('2020-04-16T10:00:00.000Z');

        const result = inputToValue(from, to);

        expect(result).toEqual([new Date('2020-04-16T10:00:00.000Z'), new Date('2020-04-16T11:00:00.000Z')]);
      });
    });

    describe('and from is before to', () => {
      it('then to should be second in the result', () => {
        const from = dateTime('2020-04-16T10:00:00.000Z');
        const to = dateTime('2020-04-16T11:00:00.000Z');

        const result = inputToValue(from, to);

        expect(result).toEqual([new Date('2020-04-16T10:00:00.000Z'), new Date('2020-04-16T11:00:00.000Z')]);
      });
    });
  });

  describe('when called with an invalid from datetime', () => {
    it('then from should replaced with specified default', () => {
      const from = dateTime('2020-04-32T10:00:00.000Z'); // invalid date
      const to = dateTime('2020-04-16T10:00:00.000Z');
      const invalidDateDefault = new Date('2020-04-16T11:00:00.000Z');

      const result = inputToValue(from, to, invalidDateDefault);

      expect(result).toEqual([new Date('2020-04-16T10:00:00.000Z'), new Date('2020-04-16T11:00:00.000Z')]);
    });
  });

  describe('when called with an invalid to datetime', () => {
    it('then to should replaced with specified default', () => {
      const from = dateTime('2020-04-16T10:00:00.000Z');
      const to = dateTime('2020-04-32T10:00:00.000Z'); // invalid date
      const invalidDateDefault = new Date('2020-04-16T11:00:00.000Z');

      const result = inputToValue(from, to, invalidDateDefault);

      expect(result).toEqual([new Date('2020-04-16T10:00:00.000Z'), new Date('2020-04-16T11:00:00.000Z')]);
    });
  });
});

describe('applyCalendarDate', () => {
  it('keeps the existing time of day when the calendar date changes', () => {
    const existing = dateTimeParse('2021-06-17 14:32:08', { timeZone: 'utc' });
    const next = applyCalendarDate(existing, new Date(2021, 5, 19), 'utc');

    expect(next.utc().format('YYYY-MM-DD HH:mm:ss')).toBe('2021-06-19 14:32:08');
  });

  it('defaults from to the start of the day and to to the end of the day', () => {
    const existing = dateTimeParse('2021-06-17 14:32:08', { timeZone: 'utc' });
    const from = applyCalendarDate(existing, new Date(2021, 5, 18), 'utc', 'start');
    const to = applyCalendarDate(existing, new Date(2021, 5, 20), 'utc', 'end');

    expect(from.utc().format('YYYY-MM-DD HH:mm:ss')).toBe('2021-06-18 00:00:00');
    expect(to.utc().format('YYYY-MM-DD HH:mm:ss')).toBe('2021-06-20 23:59:59');
  });
});
