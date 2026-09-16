import { css, cx } from '@emotion/css';
import { useEffect, useRef } from 'react';

import { type DateTime, type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';

import { useStyles2 } from '../../../themes/ThemeContext';

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
  onActiveBoundChange,
  onTimeChange,
}: Props) {
  const styles = useStyles2(getStyles);
  const active = activeBound === 'from' ? from : to;
  const parts = timeParts(active);

  return (
    <div className={styles.container} data-testid="calendar-time-picker">
      <div className={styles.toggle} role="tablist" aria-label={t('time-picker.calendar.time-bound', 'Time bound')}>
        <BoundTab
          bound="from"
          label={t('time-picker.range-content.from-input', 'From')}
          value={from}
          selected={activeBound === 'from'}
          testId={selectors.components.TimePicker.fromField}
          onSelect={onActiveBoundChange}
        />
        <BoundTab
          bound="to"
          label={t('time-picker.range-content.to-input', 'To')}
          value={to}
          selected={activeBound === 'to'}
          testId={selectors.components.TimePicker.toField}
          onSelect={onActiveBoundChange}
        />
      </div>
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

interface BoundTabProps {
  bound: CalendarTimeBound;
  label: string;
  value: DateTime;
  selected: boolean;
  testId: string;
  onSelect: (bound: CalendarTimeBound) => void;
}

function BoundTab({ bound, label, value, selected, testId, onSelect }: BoundTabProps) {
  const styles = useStyles2(getStyles);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-testid={testId}
      className={cx(styles.tab, selected && styles.tabSelected)}
      onClick={() => onSelect(bound)}
    >
      <span>{label}</span>
      <span className={styles.tabDate}>{formatDate(value)}</span>
      <span className={styles.tabTime}>{formatTime(value)}</span>
    </button>
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
      <div className={styles.wheelLabel}>{label}</div>
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
    toggle: css({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      padding: 2,
      background: theme.colors.background.secondary,
      borderRadius: theme.shape.radius.default,
    }),
    tab: css({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
      padding: theme.spacing(0.5, 1),
      border: 'none',
      borderRadius: theme.shape.radius.default,
      background: 'transparent',
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      textAlign: 'left',
      cursor: 'pointer',
    }),
    tabSelected: css({
      background: theme.colors.background.primary,
      color: theme.colors.text.primary,
      boxShadow: theme.shadows.z1,
    }),
    tabDate: css({
      fontVariantNumeric: 'tabular-nums',
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
    }),
    tabTime: css({
      fontVariantNumeric: 'tabular-nums',
      fontWeight: theme.typography.fontWeightRegular,
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
      textAlign: 'center',
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.spacing(2.5),
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
