import { css, cx } from '@emotion/css';
import { useCallback, useState } from 'react';
import Calendar, { type CalendarType } from 'react-calendar';

import {
  type DateTime,
  dateTimeForTimeZone,
  dateTimeParse,
  getTimeZone,
  type GrafanaTheme2,
  type TimeZone,
} from '@grafana/data';
import { t } from '@grafana/i18n';

import { useStyles2 } from '../../../themes/ThemeContext';
import { Icon } from '../../Icon/Icon';
import { getWeekStart, type WeekStart } from '../WeekStartPicker';
import { commonFormat } from '../commonFormat';
import { adjustDateForReactCalendar } from '../utils/adjustDateForReactCalendar';

import { type TimePickerCalendarProps } from './TimePickerCalendar';
import { snapAbsoluteTime, valueAsString } from './hiResHourBounds';

const weekStartMap: Record<WeekStart, CalendarType> = {
  saturday: 'islamic',
  sunday: 'gregory',
  monday: 'iso8601',
};

export function Body({
  onChange,
  from,
  to,
  timeZone,
  weekStart,
  hourOnly,
  onRangeDayClick,
  inline,
}: TimePickerCalendarProps) {
  const value = inputToValue(from, to, new Date(), timeZone);
  const [activeStartDate, setActiveStartDate] = useState<Date | undefined>();
  const onCalendarChange = useOnCalendarChange(onChange, from, to, timeZone, hourOnly, setActiveStartDate);
  const styles = useStyles2(getBodyStyles);
  const weekStartValue = getWeekStart(weekStart);

  return (
    <Calendar
      selectRange={true}
      next2Label={null}
      prev2Label={null}
      className={cx(styles.body, inline && styles.bodyFit)}
      tileClassName={styles.title}
      value={value}
      {...(activeStartDate ? { activeStartDate } : {})}
      onActiveStartDateChange={({ action, activeStartDate: next }) => {
        if (!next || action === 'onChange') {
          return;
        }
        setActiveStartDate(next);
      }}
      nextLabel={<Icon name="angle-right" />}
      nextAriaLabel={t('time-picker.calendar.next-month', 'Next month')}
      prevLabel={<Icon name="angle-left" />}
      prevAriaLabel={t('time-picker.calendar.previous-month', 'Previous month')}
      onChange={onCalendarChange}
      onClickDay={onRangeDayClick}
      locale="en"
      calendarType={weekStartMap[weekStartValue]}
    />
  );
}

Body.displayName = 'Body';

export function inputToValue(
  from: DateTime,
  to: DateTime,
  invalidDateDefault: Date = new Date(),
  timezone?: string
): [Date, Date] {
  let fromAsDate = from.isValid() ? from.toDate() : invalidDateDefault;
  let toAsDate = to.isValid() ? to.toDate() : invalidDateDefault;

  if (timezone) {
    fromAsDate = adjustDateForReactCalendar(fromAsDate, timezone);
    toAsDate = adjustDateForReactCalendar(toAsDate, timezone);
  }

  if (fromAsDate > toAsDate) {
    return [toAsDate, fromAsDate];
  }

  return [fromAsDate, toAsDate];
}

function useOnCalendarChange(
  onChange: (from: DateTime, to: DateTime) => void,
  from: DateTime,
  to: DateTime,
  timeZone?: TimeZone,
  hourOnly?: boolean,
  onRangeSelected?: (toDate: Date) => void
) {
  return useCallback<NonNullable<React.ComponentProps<typeof Calendar>['onChange']>>(
    (value) => {
      if (!Array.isArray(value)) {
        return console.error('onCalendarChange: should be run in selectRange={true}');
      }

      if (value[0] && value[1]) {
        let nextFrom = applyCalendarDate(from, value[0], timeZone, 'start');
        let nextTo = applyCalendarDate(to, value[1], timeZone, 'end');

        if (hourOnly) {
          nextFrom = snapCalendarDateTime(nextFrom, timeZone, 'start');
          nextTo = snapCalendarDateTime(nextTo, timeZone, 'end');
        }

        onChange(nextFrom, nextTo);
        onRangeSelected?.(value[1]);
      }
    },
    [from, hourOnly, onChange, onRangeSelected, timeZone, to]
  );
}

export function applyCalendarDate(
  existing: DateTime,
  calendarDate: Date,
  timeZone?: TimeZone,
  timeOfDay: 'start' | 'end' | 'keep' = 'keep'
): DateTime {
  const next = existing.isValid()
    ? dateTimeForTimeZone(getTimeZone({ timeZone }), existing)
    : dateTimeParse(dateInfo(calendarDate), { timeZone });

  next.set('year', calendarDate.getFullYear());
  next.set('month', calendarDate.getMonth());
  next.set('date', calendarDate.getDate());

  if (timeOfDay === 'start') {
    next.set('hour', 0);
    next.set('minute', 0);
    next.set('second', 0);
    next.set('millisecond', 0);
  } else if (timeOfDay === 'end') {
    next.set('hour', 23);
    next.set('minute', 59);
    next.set('second', 59);
    next.set('millisecond', 0);
  }

  return next;
}

export function snapCalendarDateTime(value: DateTime, timeZone: TimeZone | undefined, bound: 'start' | 'end'): DateTime {
  return dateTimeParse(snapAbsoluteTime(valueAsString(value, timeZone), timeZone, bound), {
    timeZone,
    format: commonFormat,
  });
}

function dateInfo(date: Date): number[] {
  return [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
}

export const getBodyStyles = (theme: GrafanaTheme2) => {
  // If a time range is part of only 1 day but does not encompass the whole day,
  // the class that react-calendar uses is '--hasActive' by itself (without being part of a '--range')
  const hasActiveSelector = `.react-calendar__tile--hasActive:not(.react-calendar__tile--range)`;

  return {
    title: css({
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.primary,
      fontSize: theme.typography.size.md,
      border: '1px solid transparent',

      '&:hover, &:focus': {
        position: 'relative',
      },

      '&:disabled': {
        color: theme.colors.action.disabledText,
        cursor: 'not-allowed',
      },
    }),
    bodyFit: css({
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',

      '.react-calendar__month-view__weekdays, .react-calendar__month-view__days': {
        display: 'flex',
        flexWrap: 'wrap',
      },

      '.react-calendar__tile, .react-calendar__month-view__weekdays__weekday': {
        flex: '0 0 14.2857%',
        maxWidth: '14.2857%',
        boxSizing: 'border-box',
      },
    }),
    body: css({
      zIndex: theme.zIndex.modal,
      backgroundColor: theme.colors.background.elevated,
      width: '268px',

      '.react-calendar__navigation': {
        display: 'flex',
      },

      '.react-calendar__navigation__label, .react-calendar__navigation__arrow, .react-calendar__navigation': {
        paddingTop: '4px',
        backgroundColor: 'inherit',
        color: theme.colors.text.primary,
        border: 0,
        fontWeight: theme.typography.fontWeightMedium,
      },

      '.react-calendar__month-view__weekdays': {
        backgroundColor: 'inherit',
        textAlign: 'center',
        color: theme.colors.text.primary,

        abbr: {
          border: 0,
          textDecoration: 'none',
          cursor: 'default',
          display: 'block',
          padding: '4px 0 4px 0',
        },
      },

      '.react-calendar__month-view__days': {
        backgroundColor: 'inherit',
      },

      '.react-calendar__tile': {
        marginBottom: '4px',
        backgroundColor: 'inherit',
        height: '26px',
      },

      '.react-calendar__tile--now:not(.react-calendar__tile--active):not(.react-calendar__tile--hasActive)': {
        color: theme.v1.palette.orange,
        fontWeight: theme.typography.fontWeightMedium,
      },

      '.react-calendar__navigation__label, .react-calendar__navigation > button:focus, .time-picker-calendar-tile:focus':
        {
          outline: 0,
        },

      // The --hover modifier is active when the user is selecting a range and hovering over a tile - it shows the pending range.
      // It is applied to all dates between the clicked date and the hovered date.
      // The *clicked* date should have primary bg, while *pending* range dates should have hover bg.
      '.react-calendar__tile--hover': {
        backgroundColor: theme.colors.action.hover,
        // eslint-disable-next-line @grafana/no-border-radius-literal
        borderRadius: 0,
      },

      '.react-calendar__tile--hoverStart': {
        borderTopLeftRadius: theme.shape.radius.pill,
        borderBottomLeftRadius: theme.shape.radius.pill,
      },

      '.react-calendar__tile--hoverEnd': {
        borderTopRightRadius: theme.shape.radius.pill,
        borderBottomRightRadius: theme.shape.radius.pill,
      },

      // Addiitonally, when hovering a date before clicking any, it should show the hover bg.
      '.react-calendar__tile:hover:not(.react-calendar__tile--hover):not(.react-calendar__tile--active):not(.react-calendar__tile--hasActive)':
        {
          backgroundColor: theme.colors.action.hover,
          borderRadius: theme.shape.radius.pill,
        },

      // When the user is selecting a range (they've clicked one date, tiles have --hover), both --rangeStart and --rangeEnd are on the tile.
      // The --hover classes above  handle the rounding of the tiles so they're contigious with the range
      [`${hasActiveSelector}, .react-calendar__tile--rangeStart:not(.react-calendar__tile--hover)`]: {
        borderTopLeftRadius: theme.shape.radius.pill,
        borderBottomLeftRadius: theme.shape.radius.pill,
      },

      [`${hasActiveSelector}, .react-calendar__tile--rangeEnd:not(.react-calendar__tile--hover)`]: {
        borderTopRightRadius: theme.shape.radius.pill,
        borderBottomRightRadius: theme.shape.radius.pill,
      },

      [`${hasActiveSelector}, .react-calendar__tile--active, .react-calendar__tile--rangeEnd, .react-calendar__tile--rangeStart`]:
        {
          color: theme.colors.text.primary,
          fontWeight: theme.typography.fontWeightMedium,
          background: `color-mix(in srgb, ${theme.v1.palette.orange} 16%, transparent)`,
          border: '0px',
        },
    }),
  };
};
