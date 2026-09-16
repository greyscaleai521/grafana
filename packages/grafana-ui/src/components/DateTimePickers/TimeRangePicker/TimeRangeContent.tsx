import { css } from '@emotion/css';
import { type FormEvent, useCallback, useEffect, useId, useState } from 'react';
import * as React from 'react';

import {
  type DateTime,
  dateTimeParse,
  type GrafanaTheme2,
  HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS,
  rangeUtil,
  type RawTimeRange,
  type TimeRange,
  type TimeZone,
} from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t, Trans } from '@grafana/i18n';

import { useStyles2 } from '../../../themes/ThemeContext';
import { Button } from '../../Button/Button';
import { Field } from '../../Forms/Field';
import { FieldValidationMessage } from '../../Forms/FieldValidationMessage';
import { Icon } from '../../Icon/Icon';
import { Input } from '../../Input/Input';
import { Tooltip } from '../../Tooltip/Tooltip';
import { useHiResTimestamps } from '../HiResTimestampsContext';
import { type WeekStart } from '../WeekStartPicker';
import { commonFormat } from '../commonFormat';
import { isValid } from '../utils';

import TimePickerCalendar from './TimePickerCalendar';
import {
  applyHourBoundaryMillis,
  hasFractionalHourOffset,
  isDisallowedWhenHourOnly,
  shouldBlockHiResMinutes,
  snapAbsoluteTime,
  valueAsString,
} from './hiResHourBounds';

interface Props {
  isFullscreen: boolean;
  value: TimeRange;
  onApply: (range: TimeRange) => void;
  timeZone?: TimeZone;
  fiscalYearStartMonth?: number;
  roundup?: boolean;
  isReversed?: boolean;
  onError?: (error?: string) => void;
  weekStart?: WeekStart;
}

interface InputState {
  value: string;
  invalid: boolean;
  errorMessage: string;
  hiResInvalid?: boolean;
}

const ERROR_MESSAGES = {
  default: () => t('time-picker.range-content.default-error', 'Please enter a past date or "{{now}}"', { now: 'now' }),
  range: () => t('time-picker.range-content.range-error', '"From" can\'t be after "To"'),
  hiResFrom: () =>
    t('time-picker.range-content.hires-from-error', 'HiRes is off. Format sets time to the hour start.'),
  hiResTo: () => t('time-picker.range-content.hires-to-error', 'HiRes is off. Format sets time to the hour end.'),
};

export const TimeRangeContent = (props: Props) => {
  const {
    value,
    isFullscreen = false,
    timeZone,
    onApply: onApplyFromProps,
    isReversed,
    fiscalYearStartMonth,
    onError,
    weekStart,
  } = props;
  const hiResTimestamps = useHiResTimestamps();
  const enforceHiResTimestamps = Boolean(hiResTimestamps);
  const thresholdDays = hiResTimestamps?.thresholdDays ?? HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS;
  const [fromValue, toValue] = valueToState(
    value.raw.from,
    value.raw.to,
    timeZone,
    fiscalYearStartMonth,
    enforceHiResTimestamps,
    thresholdDays
  );
  const style = useStyles2(getStyles);

  const [from, setFrom] = useState<InputState>(fromValue);
  const [to, setTo] = useState<InputState>(toValue);
  const [isOpen, setOpen] = useState(false);

  const fromFieldId = useId();
  const toFieldId = useId();

  // Synchronize internal state with external value
  useEffect(() => {
    const [fromValue, toValue] = valueToState(
      value.raw.from,
      value.raw.to,
      timeZone,
      fiscalYearStartMonth,
      enforceHiResTimestamps,
      thresholdDays
    );
    setFrom(fromValue);
    setTo(toValue);
  }, [value.raw.from, value.raw.to, timeZone, fiscalYearStartMonth, enforceHiResTimestamps, thresholdDays]);

  const onOpen = useCallback(
    (event: FormEvent<HTMLElement>) => {
      event.preventDefault();
      setOpen(true);
    },
    [setOpen]
  );

  const applySnappedRange = useCallback(
    (fromValue: string, toValue: string) => {
      const formattedFrom = snapAbsoluteTime(fromValue, timeZone, 'start');
      const formattedTo = snapAbsoluteTime(toValue, timeZone, 'end');
      const [nextFrom, nextTo] = valueToState(
        formattedFrom,
        formattedTo,
        timeZone,
        fiscalYearStartMonth,
        enforceHiResTimestamps,
        thresholdDays
      );
      setFrom(nextFrom);
      setTo(nextTo);

      if (nextFrom.invalid || nextTo.invalid) {
        return false;
      }

      const raw: RawTimeRange = { from: nextFrom.value, to: nextTo.value };
      onApplyFromProps(
        applyHourBoundaryMillis(
          rangeUtil.convertRawToRange(raw, timeZone, fiscalYearStartMonth, commonFormat)
        )
      );
      return true;
    },
    [enforceHiResTimestamps, fiscalYearStartMonth, onApplyFromProps, thresholdDays, timeZone]
  );

  const onApply = useCallback(() => {
    const [nextFrom, nextTo] = valueToState(
      from.value,
      to.value,
      timeZone,
      fiscalYearStartMonth,
      enforceHiResTimestamps,
      thresholdDays
    );
    setFrom(nextFrom);
    setTo(nextTo);

    if (nextFrom.invalid || nextTo.invalid) {
      const hasOtherErrors =
        (nextFrom.invalid && !nextFrom.hiResInvalid) || (nextTo.invalid && !nextTo.hiResInvalid);
      if (!hasOtherErrors && (nextFrom.hiResInvalid || nextTo.hiResInvalid)) {
        applySnappedRange(from.value, to.value);
      }
      return;
    }

    const raw: RawTimeRange = { from: nextFrom.value, to: nextTo.value };
    const timeRange = applyHourBoundaryMillis(
      rangeUtil.convertRawToRange(raw, timeZone, fiscalYearStartMonth, commonFormat)
    );

    onApplyFromProps(timeRange);
  }, [
    applySnappedRange,
    enforceHiResTimestamps,
    from.value,
    onApplyFromProps,
    thresholdDays,
    timeZone,
    to.value,
    fiscalYearStartMonth,
  ]);

  const onChange = useCallback(
    (from: DateTime | string, to: DateTime | string) => {
      const [fromValue, toValue] = valueToState(
        from,
        to,
        timeZone,
        fiscalYearStartMonth,
        enforceHiResTimestamps,
        thresholdDays
      );
      setFrom(fromValue);
      setTo(toValue);
    },
    [enforceHiResTimestamps, fiscalYearStartMonth, thresholdDays, timeZone]
  );

  const hourOnly =
    enforceHiResTimestamps &&
    shouldBlockHiResMinutes(from.value, to.value, timeZone, fiscalYearStartMonth, thresholdDays);
  const showUtcHourNote = hourOnly && hasFractionalHourOffset(timeZone);

  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onApply();
    }
  };

  const onCopy = () => {
    const rawSource: RawTimeRange = value.raw;
    const clipboardPayload = rangeUtil.formatRawTimeRange(rawSource);
    navigator.clipboard.writeText(JSON.stringify(clipboardPayload));
  };

  const onPaste = async () => {
    const raw = await navigator.clipboard.readText();
    let range;

    try {
      range = JSON.parse(raw);
    } catch (error) {
      if (onError) {
        onError(raw);
      }
      return;
    }

    const [fromValue, toValue] = valueToState(
      range.from,
      range.to,
      timeZone,
      fiscalYearStartMonth,
      enforceHiResTimestamps,
      thresholdDays
    );
    setFrom(fromValue);
    setTo(toValue);
  };

  const fiscalYear = rangeUtil.convertRawToRange({ from: 'now/fy', to: 'now/fy' }, timeZone, fiscalYearStartMonth);

  const fyTooltip = (
    <div className={style.tooltip}>
      {rangeUtil.isFiscal(value) ? (
        <Tooltip
          content={t('time-picker.range-content.fiscal-year', 'Fiscal year: {{from}} - {{to}}', {
            from: fiscalYear.from.format('MMM-DD'),
            to: fiscalYear.to.format('MMM-DD'),
          })}
        >
          <Icon name="info-circle" />
        </Tooltip>
      ) : null}
    </div>
  );

  const icon = (
    <Button
      aria-label={t('time-picker.range-content.open-input-calendar', 'Open calendar')}
      data-testid={selectors.components.TimePicker.calendar.openButton}
      icon="calendar-alt"
      variant="secondary"
      type="button"
      onClick={onOpen}
    />
  );

  return (
    <div>
      <div className={style.fieldContainer}>
        <div>
          <Field
            label={t('time-picker.range-content.from-input', 'From')}
            invalid={from.invalid && !from.hiResInvalid}
            error={from.hiResInvalid ? undefined : from.errorMessage}
            noMargin={from.hiResInvalid}
          >
            <Input
              id={fromFieldId}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChange(event.currentTarget.value, to.value)}
              onBlur={() => onChange(from.value, to.value)}
              addonAfter={icon}
              onKeyDown={submitOnEnter}
              data-testid={selectors.components.TimePicker.fromField}
              value={from.value}
            />
          </Field>
          {from.hiResInvalid && (
            <FieldValidationMessage className={style.hiResAlert}>{from.errorMessage}</FieldValidationMessage>
          )}
        </div>
        {fyTooltip}
      </div>
      <div className={style.fieldContainer}>
        <div>
          <Field
            label={t('time-picker.range-content.to-input', 'To')}
            invalid={to.invalid && !to.hiResInvalid}
            error={to.hiResInvalid ? undefined : to.errorMessage}
            noMargin={to.hiResInvalid}
          >
            <Input
              id={toFieldId}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChange(from.value, event.currentTarget.value)}
              onBlur={() => onChange(from.value, to.value)}
              addonAfter={icon}
              onKeyDown={submitOnEnter}
              data-testid={selectors.components.TimePicker.toField}
              value={to.value}
            />
          </Field>
          {to.hiResInvalid && (
            <FieldValidationMessage className={style.hiResAlert}>{to.errorMessage}</FieldValidationMessage>
          )}
        </div>
        {fyTooltip}
      </div>
      {showUtcHourNote && (
        <div className={style.utcHourNote}>
          <Icon name="info-circle" size="sm" />
          <span>
            <Trans i18nKey="time-picker.range-content.utc-hour-snap-note">
              HiRes off snaps hours in UTC. In this timezone that shows as :30 or :29.
            </Trans>
          </span>
        </div>
      )}
      <div className={style.buttonsContainer}>
        <Button
          data-testid={selectors.components.TimePicker.copyTimeRange}
          icon="copy"
          variant="secondary"
          tooltip={t('time-picker.copy-paste.tooltip-copy', 'Copy time range to clipboard')}
          type="button"
          onClick={onCopy}
        />
        <Button
          data-testid={selectors.components.TimePicker.pasteTimeRange}
          icon="clipboard-alt"
          variant="secondary"
          tooltip={t('time-picker.copy-paste.tooltip-paste', 'Paste time range')}
          type="button"
          onClick={onPaste}
        />
        <Button data-testid={selectors.components.TimePicker.applyTimeRange} type="button" onClick={onApply}>
          <Trans i18nKey="time-picker.range-content.apply-button">Apply time range</Trans>
        </Button>
      </div>

      <TimePickerCalendar
        isFullscreen={isFullscreen}
        isOpen={isOpen}
        from={dateTimeParse(from.value, { timeZone })}
        to={dateTimeParse(to.value, { timeZone })}
        onApply={onApply}
        onClose={() => setOpen(false)}
        onChange={onChange}
        timeZone={timeZone}
        isReversed={isReversed}
        weekStart={weekStart}
      />
    </div>
  );
};

function isRangeInvalid(from: string, to: string, timezone?: string): boolean {
  const raw: RawTimeRange = { from, to };
  const timeRange = rangeUtil.convertRawToRange(raw, timezone, undefined, commonFormat);
  const valid = timeRange.from.isSame(timeRange.to) || timeRange.from.isBefore(timeRange.to);

  return !valid;
}

function valueToState(
  rawFrom: DateTime | string,
  rawTo: DateTime | string,
  timeZone?: TimeZone,
  fiscalYearStartMonth?: number,
  enforceHiResTimestamps = false,
  thresholdDays = HIRES_TIMESTAMPS_DEFAULT_THRESHOLD_DAYS
): [InputState, InputState] {
  const fromValue = valueAsString(rawFrom, timeZone);
  const toValue = valueAsString(rawTo, timeZone);
  const fromInvalid = !isValid(fromValue, false, timeZone);
  const toInvalid = !isValid(toValue, true, timeZone);
  // If "To" is invalid, we should not check the range anyways
  const rangeInvalid = isRangeInvalid(fromValue, toValue, timeZone) && !toInvalid;
  const blockMinutes =
    enforceHiResTimestamps &&
    shouldBlockHiResMinutes(fromValue, toValue, timeZone, fiscalYearStartMonth, thresholdDays);
  const fromHiResInvalid = blockMinutes && !fromInvalid && isDisallowedWhenHourOnly(fromValue, timeZone, 'from');
  const toHiResInvalid = blockMinutes && !toInvalid && isDisallowedWhenHourOnly(toValue, timeZone, 'to');

  return [
    {
      value: fromValue,
      invalid: fromInvalid || rangeInvalid || fromHiResInvalid,
      hiResInvalid: fromHiResInvalid,
      errorMessage: fromHiResInvalid
        ? ERROR_MESSAGES.hiResFrom()
        : rangeInvalid && !fromInvalid
          ? ERROR_MESSAGES.range()
          : ERROR_MESSAGES.default(),
    },
    {
      value: toValue,
      invalid: toInvalid || toHiResInvalid,
      hiResInvalid: toHiResInvalid,
      errorMessage: toHiResInvalid ? ERROR_MESSAGES.hiResTo() : ERROR_MESSAGES.default(),
    },
  ];
}

function getStyles(theme: GrafanaTheme2) {
  return {
    fieldContainer: css({
      display: 'flex',
    }),
    buttonsContainer: css({
      display: 'flex',
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(1),
    }),
    tooltip: css({
      paddingLeft: theme.spacing(1),
      paddingTop: theme.spacing(3),
    }),
    utcHourNote: css({
      display: 'flex',
      alignItems: 'flex-start',
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(1),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.typography.bodySmall.lineHeight,
    }),
    hiResAlert: css({
      color: '#111',
      background: '#fff',
      border: `1px solid ${theme.colors.border.medium}`,
      marginTop: 5,
      marginBottom: theme.spacing(2),
      a: {
        color: '#111',
      },
      '&:before': {
        left: '8px',
        top: '-6px',
        borderWidth: '0 5px 6px 5px',
        borderColor: `transparent transparent ${theme.colors.border.medium} transparent`,
      },
      '&:after': {
        content: '""',
        position: 'absolute',
        left: '9px',
        top: '-5px',
        width: 0,
        height: 0,
        borderWidth: '0 4px 5px 4px',
        borderStyle: 'solid',
        borderColor: 'transparent transparent #fff transparent',
      },
    }),
  };
}
