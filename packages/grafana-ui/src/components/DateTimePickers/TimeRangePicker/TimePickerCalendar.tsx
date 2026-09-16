import { css } from '@emotion/css';
import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import { OverlayContainer, useOverlay } from '@react-aria/overlays';
import { createRef, type FormEvent, memo, useCallback, useEffect, useState } from 'react';

import { type DateTime, dateTimeForTimeZone, getTimeZone, type GrafanaTheme2, type TimeZone } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { useStyles2, useTheme2 } from '../../../themes/ThemeContext';
import { getModalStyles } from '../../Modal/getModalStyles';
import { type WeekStart } from '../WeekStartPicker';

import { Body, snapCalendarDateTime } from './CalendarBody';
import { Footer } from './CalendarFooter';
import { Header } from './CalendarHeader';
import { CalendarTimePicker, type CalendarTimeBound, type TimeOfDayParts } from './CalendarTimePicker';

export const getStyles = (theme: GrafanaTheme2, isReversed = false) => {
  return {
    container: css({
      top: 0,
      position: 'absolute',
      [`${isReversed ? 'left' : 'right'}`]: '546px', // lmao
    }),

    modalContainer: css({
      label: 'modalContainer',
      margin: '0 auto',
    }),

    calendar: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      padding: theme.spacing(1),
      label: 'calendar',
      boxShadow: theme.shadows.z3,
      backgroundColor: theme.colors.background.elevated,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),

    inline: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      marginTop: theme.spacing(1),
      flex: 1,
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
      label: 'calendar-inline',
    }),

    modal: css({
      label: 'modal',
      boxShadow: theme.shadows.z3,
      left: '50%',
      position: 'fixed',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: theme.zIndex.modal,
    }),
  };
};

export interface TimePickerCalendarProps {
  isOpen: boolean;
  from: DateTime;
  to: DateTime;
  onClose: () => void;
  onApply: (e: FormEvent<HTMLButtonElement>) => void;
  onChange: (from: DateTime, to: DateTime) => void;
  weekStart?: WeekStart;

  /**
   * When true, the calendar is rendered as a floating "tooltip" next to the input.
   * When false, the calendar is rendered "fullscreen" in a modal. Yes. Don't ask.
   */
  isFullscreen: boolean;
  timeZone?: TimeZone;
  isReversed?: boolean;
  hourOnly?: boolean;
  onRangeDayClick?: () => void;
  /** Render the calendar and time wheels in-place instead of a popup. */
  inline?: boolean;
}

function TimePickerCalendar(props: TimePickerCalendarProps) {
  const theme = useTheme2();
  const { modalBackdrop } = useStyles2(getModalStyles);
  const styles = getStyles(theme, props.isReversed);
  const { isOpen, isFullscreen: isFullscreenProp, onClose, from, to, timeZone, hourOnly, onChange, inline } = props;
  const ref = createRef<HTMLElement>();
  const [activeBound, setActiveBound] = useState<CalendarTimeBound>('from');
  const [pickingStart, setPickingStart] = useState(true);
  const { dialogProps } = useDialog(
    {
      'aria-label': selectors.components.TimePicker.calendar.label,
    },
    ref
  );
  const { overlayProps } = useOverlay(
    {
      isDismissable: true,
      isOpen,
      onClose,
    },
    ref
  );

  useEffect(() => {
    if (isOpen || inline) {
      setActiveBound('from');
      setPickingStart(true);
    }
  }, [inline, isOpen]);

  const onRangeDayClick = useCallback(() => {
    if (pickingStart) {
      setActiveBound('to');
      setPickingStart(false);
    } else {
      setPickingStart(true);
    }
  }, [pickingStart]);

  const onTimeChange = useCallback(
    (parts: TimeOfDayParts) => {
      const current = activeBound === 'from' ? from : to;
      let next = applyTimeOfDay(current, parts, timeZone);
      if (hourOnly) {
        next = snapCalendarDateTime(next, timeZone, activeBound === 'from' ? 'start' : 'end');
      }
      if (activeBound === 'from') {
        onChange(next, to);
      } else {
        onChange(from, next);
      }
    },
    [activeBound, from, hourOnly, onChange, timeZone, to]
  );

  // This prop is confusingly worded, so rename it to something more intuitive.
  const showInModal = !isFullscreenProp;

  const timePicker = (
    <CalendarTimePicker
      from={from}
      to={to}
      activeBound={activeBound}
      hourOnly={hourOnly}
      onActiveBoundChange={setActiveBound}
      onTimeChange={onTimeChange}
    />
  );

  if (inline) {
    return (
      <section
        className={styles.inline}
        data-testid={selectors.components.TimePicker.calendar.label}
        aria-label={selectors.components.TimePicker.calendar.label}
      >
        <Body {...props} onRangeDayClick={onRangeDayClick} />
        {timePicker}
      </section>
    );
  }

  if (!isOpen) {
    return null;
  }

  const calendar = (
    <section
      className={styles.calendar}
      ref={ref}
      {...overlayProps}
      {...dialogProps}
      data-testid={selectors.components.TimePicker.calendar.label}
    >
      <Header {...props} />
      <Body {...props} onRangeDayClick={onRangeDayClick} />
      {timePicker}
      {showInModal && <Footer {...props} />}
    </section>
  );

  if (!showInModal) {
    return (
      <FocusScope contain restoreFocus autoFocus>
        <div className={styles.container}>{calendar}</div>
      </FocusScope>
    );
  }

  return (
    <OverlayContainer>
      <div className={modalBackdrop} />

      <FocusScope contain autoFocus restoreFocus>
        <div className={styles.modal}>
          <div className={styles.modalContainer}>{calendar}</div>
        </div>
      </FocusScope>
    </OverlayContainer>
  );
}
function applyTimeOfDay(existing: DateTime, parts: TimeOfDayParts, timeZone?: TimeZone): DateTime {
  const next = dateTimeForTimeZone(getTimeZone({ timeZone }), existing.isValid() ? existing : new Date());
  next.set('hour', parts.hour);
  next.set('minute', parts.minute);
  next.set('second', parts.second);
  next.set('millisecond', 0);
  return next;
}

export default memo(TimePickerCalendar);
TimePickerCalendar.displayName = 'TimePickerCalendar';
