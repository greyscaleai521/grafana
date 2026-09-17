import { css, cx } from '@emotion/css';
import { useEffect, useRef, type ReactNode } from 'react';

import { type DateTime, type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';

import { useStyles2 } from '../../../themes/ThemeContext';
import { Icon } from '../../Icon/Icon';
import { Tooltip } from '../../Tooltip/Tooltip';

import { RelativeTimeFields } from './RelativeTimeFields';

export type CalendarTimeBound = 'from' | 'to';

export interface TimeOfDayParts {
  hour: number;
  minute: number;
  second: number;
}

interface Props {
  from: DateTime;
  to: DateTime;
  activeBound: CalendarTimeBound;
  hourOnly?: boolean;
  calendar?: ReactNode;
  onActiveBoundChange: (bound: CalendarTimeBound) => void;
  onTimeChange: (next: TimeOfDayParts) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES_SECONDS = Array.from({ length: 60 }, (_, index) => index);
const ITEM_HEIGHT = 28;
const VISIBLE_ITEMS = 5;

export function CalendarTimePicker({
  from,
  to,
  activeBound,
  hourOnly = false,
  calendar,
  onActiveBoundChange,
  onTimeChange,
}: Props) {
  const styles = useStyles2(getStyles);
  const active = activeBound === 'from' ? from : to;
  const parts = timeParts(active);

  return (
    <div className={styles.container} data-testid="calendar-time-picker">
      <RelativeTimeFields
        from={`${formatDate(from)} ${formatTime(from)}`}
        to={`${formatDate(to)} ${formatTime(to)}`}
        readOnly
        activeBound={activeBound}
        onFromFocus={() => onActiveBoundChange('from')}
        onToFocus={() => onActiveBoundChange('to')}
      />
      {calendar}
      <div className={styles.wheels}>
        <div className={styles.highlight} />
        <TimeWheel
          label={t('time-picker.calendar.hour', 'Hour')}
          values={HOURS}
          value={parts.hour}
          onChange={(hour) => onTimeChange({ ...parts, hour })}
        />
        <TimeWheel
          label={t('time-picker.calendar.minute', 'Min')}
          values={MINUTES_SECONDS}
          value={parts.minute}
          disabled={hourOnly}
          onChange={(minute) => onTimeChange({ ...parts, minute })}
        />
        <TimeWheel
          label={t('time-picker.calendar.second', 'Sec')}
          values={MINUTES_SECONDS}
          value={parts.second}
          disabled={hourOnly}
          onChange={(second) => onTimeChange({ ...parts, second })}
        />
      </div>
    </div>
  );
}

interface TimeWheelProps {
  label: string;
  values: number[];
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function TimeWheel({ label, values, value, disabled, onChange }: TimeWheelProps) {
  const styles = useStyles2(getStyles);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const isProgrammaticScroll = useRef(false);
  const isUserScroll = useRef(false);
  const userScrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const wheelDelta = useRef(0);
  const unit = label.toLowerCase();

  valueRef.current = value;
  onChangeRef.current = onChange;

  const snapTo = (next: number, behavior: ScrollBehavior = 'auto') => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const top = next * ITEM_HEIGHT;
    if (Math.abs(node.scrollTop - top) < 1) {
      return;
    }
    isProgrammaticScroll.current = true;
    node.scrollTo({ top, behavior });
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  };

  const commitIndex = (index: number) => {
    const next = values[Math.max(0, Math.min(values.length - 1, index))];
    if (next !== valueRef.current) {
      onChangeRef.current(next);
    }
    snapTo(next);
  };

  useEffect(() => {
    if (!isUserScroll.current) {
      snapTo(value);
    }
  }, [value]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || disabled) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      wheelDelta.current += event.deltaY;
      if (Math.abs(wheelDelta.current) < ITEM_HEIGHT) {
        return;
      }
      const direction = Math.sign(wheelDelta.current);
      wheelDelta.current = 0;
      commitIndex(valueRef.current + direction);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      clearTimeout(userScrollTimeout.current);
    };
  }, [disabled, values]);

  const onScroll = () => {
    if (disabled || isProgrammaticScroll.current) {
      return;
    }

    isUserScroll.current = true;
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    const next = values[Math.max(0, Math.min(values.length - 1, Math.round(node.scrollTop / ITEM_HEIGHT)))];
    if (next !== valueRef.current) {
      onChangeRef.current(next);
    }

    clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      isUserScroll.current = false;
      snapTo(next, 'smooth');
    }, 80);
  };

  return (
    <div className={cx(styles.wheel, disabled && styles.wheelDisabled)} aria-disabled={disabled || undefined}>
      <div className={styles.wheelLabel}>
        <span>{label}</span>
        {disabled && (
          <Tooltip content={t('time-picker.calendar.wheel-disabled', 'Disabled')}>
            <span className={styles.wheelInfo} aria-label={t('time-picker.calendar.wheel-disabled', 'Disabled')}>
              <Icon name="info-circle" size="sm" />
            </span>
          </Tooltip>
        )}
      </div>
      <div
        ref={scrollerRef}
        className={cx(styles.scroller, disabled && styles.scrollerDisabled)}
        data-testid={`calendar-time-wheel-${unit}`}
        onScroll={disabled ? undefined : onScroll}
      >
        <div className={styles.spacer} />
        {values.map((item) => (
          <button
            key={item}
            type="button"
            className={cx(styles.item, item === value && styles.itemSelected)}
            aria-label={`${label} ${pad(item)}`}
            aria-pressed={item === value}
            disabled={disabled}
            onClick={() => onChange(item)}
          >
            {pad(item)}
          </button>
        ))}
        <div className={styles.spacer} />
      </div>
    </div>
  );
}

function timeParts(value: DateTime): TimeOfDayParts {
  if (!value.isValid()) {
    return { hour: 0, minute: 0, second: 0 };
  }

  return {
    hour: Number(value.format('HH')),
    minute: Number(value.format('mm')),
    second: Number(value.format('ss')),
  };
}

function formatDate(value: DateTime) {
  return value.isValid() ? value.format('YYYY-MM-DD') : '----/--/--';
}

function formatTime(value: DateTime) {
  return value.isValid() ? value.format('HH:mm:ss') : '--:--:--';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getStyles(theme: GrafanaTheme2) {
  const wheelHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
    }),
    wheels: css({
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: theme.spacing(0.5),
    }),
    highlight: css({
      position: 'absolute',
      left: 0,
      right: 0,
      top: `calc(${theme.spacing(2.5)} + ${ITEM_HEIGHT * 2}px)`,
      height: ITEM_HEIGHT,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.action.hover,
      pointerEvents: 'none',
    }),
    wheel: css({
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    }),
    wheelDisabled: css({
      opacity: 0.45,
    }),
    wheelLabel: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(0.25),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.spacing(2.5),
    }),
    wheelInfo: css({
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'help',
    }),
    scroller: css({
      height: wheelHeight,
      overflowY: 'auto',
      scrollSnapType: 'y mandatory',
      overscrollBehavior: 'contain',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    }),
    scrollerDisabled: css({
      overflow: 'hidden',
      pointerEvents: 'none',
      touchAction: 'none',
      overscrollBehavior: 'none',
    }),
    spacer: css({
      height: ITEM_HEIGHT * 2,
    }),
    item: css({
      display: 'block',
      width: '100%',
      height: ITEM_HEIGHT,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontVariantNumeric: 'tabular-nums',
      lineHeight: `${ITEM_HEIGHT}px`,
      textAlign: 'center',
      cursor: 'pointer',
      scrollSnapAlign: 'center',
      scrollSnapStop: 'always',
    }),
    itemSelected: css({
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
    }),
  };
}
