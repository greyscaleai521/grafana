import { css, cx } from '@emotion/css';
import { useId, type ClipboardEvent, type KeyboardEvent } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';

import { useStyles2 } from '../../../themes/ThemeContext';
import { Combobox } from '../../Combobox/Combobox';
import { type ComboboxOption } from '../../Combobox/types';
import { FieldValidationMessage } from '../../Forms/FieldValidationMessage';
import { Input } from '../../Input/Input';

export const RELATIVE_TIME_OPTIONS: Array<ComboboxOption<string>> = [
  'now',
  'now-5m',
  'now-15m',
  'now-30m',
  'now-1h',
  'now-3h',
  'now-6h',
  'now-12h',
  'now-24h',
  'now-2d',
  'now-7d',
  'now-30d',
  'now-90d',
  'now-6M',
  'now-1y',
  'now-2y',
  'now-5y',
].map((value) => ({ label: value, value }));

export function startsWithNow(value: string): boolean {
  return value.trim().toLowerCase().startsWith('now');
}

export function isAllowedNowInput(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === '' || 'now'.startsWith(normalized) || normalized.startsWith('now');
}

function nextValueFromEdit(input: HTMLInputElement, inserted: string): string {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  return input.value.slice(0, start) + inserted + input.value.slice(end);
}

function guardNowKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
    return;
  }
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  if (!isAllowedNowInput(nextValueFromEdit(event.target, event.key))) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function guardNowPaste(event: ClipboardEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  if (!isAllowedNowInput(nextValueFromEdit(event.target, event.clipboardData.getData('text')))) {
    event.preventDefault();
    event.stopPropagation();
  }
}

interface Props {
  from: string;
  to: string;
  fromInvalid?: boolean;
  toInvalid?: boolean;
  fromError?: string;
  toError?: string;
  readOnly?: boolean;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  onFromFocus?: () => void;
  onToFocus?: () => void;
  activeBound?: 'from' | 'to';
}

export function RelativeTimeFields({
  from,
  to,
  fromInvalid,
  toInvalid,
  fromError,
  toError,
  readOnly = false,
  onFromChange,
  onToChange,
  onFromFocus,
  onToFocus,
  activeBound,
}: Props) {
  const styles = useStyles2(getStyles);
  const fromId = useId();
  const toId = useId();

  return (
    <div className={styles.container} data-testid={readOnly ? 'absolute-time-fields' : 'relative-time-fields'}>
      <label className={styles.label} htmlFor={fromId}>
        {t('time-picker.range-content.from-input', 'From')}
      </label>
      <div className={styles.control}>
        {readOnly ? (
          <Input
            id={fromId}
            value={from}
            readOnly
            invalid={fromInvalid}
            className={cx(activeBound === 'from' && styles.active)}
            data-testid={selectors.components.TimePicker.fromField}
            onFocus={onFromFocus}
          />
        ) : (
          <div onKeyDownCapture={guardNowKeyDown} onPasteCapture={guardNowPaste}>
            <Combobox
              id={fromId}
              options={RELATIVE_TIME_OPTIONS}
              value={from || null}
              createCustomValue
              isClearable
              invalid={fromInvalid}
              placeholder={t('time-picker.relative.placeholder', 'now-5m')}
              data-testid={selectors.components.TimePicker.fromField}
              onChange={(option) => {
                const next = option?.value ?? '';
                if (next && !isAllowedNowInput(next)) {
                  return;
                }
                onFromChange?.(next);
              }}
            />
          </div>
        )}
        {fromInvalid && fromError && <FieldValidationMessage>{fromError}</FieldValidationMessage>}
      </div>
      <label className={styles.label} htmlFor={toId}>
        {t('time-picker.range-content.to-input', 'To')}
      </label>
      <div className={styles.control}>
        {readOnly ? (
          <Input
            id={toId}
            value={to}
            readOnly
            invalid={toInvalid}
            className={cx(activeBound === 'to' && styles.active)}
            data-testid={selectors.components.TimePicker.toField}
            onFocus={onToFocus}
          />
        ) : (
          <div onKeyDownCapture={guardNowKeyDown} onPasteCapture={guardNowPaste}>
            <Combobox
              id={toId}
              options={RELATIVE_TIME_OPTIONS}
              value={to || null}
              createCustomValue
              isClearable
              invalid={toInvalid}
              placeholder={t('time-picker.relative.placeholder-to', 'now')}
              data-testid={selectors.components.TimePicker.toField}
              onChange={(option) => {
                const next = option?.value ?? '';
                if (next && !isAllowedNowInput(next)) {
                  return;
                }
                onToChange?.(next);
              }}
            />
          </div>
        )}
        {toInvalid && toError && <FieldValidationMessage>{toError}</FieldValidationMessage>}
      </div>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  const orange = theme.v1.palette.orange;

  return {
    container: css({
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      columnGap: theme.spacing(1),
      rowGap: theme.spacing(1),
      alignItems: 'center',
      width: '100%',
    }),
    label: css({
      margin: 0,
      color: theme.colors.text.primary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: theme.spacing(theme.components.height.md),
    }),
    control: css({
      minWidth: 0,
    }),
    active: css({
      input: {
        borderColor: orange,
      },
      '&:hover input': {
        borderColor: orange,
      },
    }),
  };
}
