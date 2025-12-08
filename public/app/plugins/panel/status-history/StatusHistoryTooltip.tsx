import React from 'react';

import {
  DataFrame,
  FALLBACK_COLOR,
  Field,
  FieldType,
  getDisplayProcessor,
  getFieldDisplayName,
  TimeRange,
  TimeZone,
  LinkModel,
} from '@grafana/data';
import { MenuItem, SeriesTableRow, useTheme2 } from '@grafana/ui';
import { findNextStateIndex, fmtDuration } from 'app/core/components/TimelineChart/utils';

interface StatusHistoryTooltipProps {
  data: DataFrame[];
  alignedData: DataFrame;
  seriesIdx: number;
  datapointIdx: number;
  timeZone: TimeZone;
  timeRange?: TimeRange;
  toTimeFieldName?: string;
}

export const StatusHistoryTooltip = ({
  data,
  alignedData,
  seriesIdx,
  datapointIdx,
  timeZone,
  timeRange,
  toTimeFieldName,
}: StatusHistoryTooltipProps) => {
  const theme = useTheme2();

  if (!data || datapointIdx == null) {
    return null;
  }

  const field = alignedData.fields[seriesIdx!];

  // Null value check - don't show tooltip for null values
  const value = field.values[datapointIdx!];
  if (value == null || value === '' || value === undefined) {
    return null;
  }

  const links: Array<LinkModel<Field>> = [];
  const linkLookup = new Set<string>();

  if (field.getLinks) {
    const v = field.values[datapointIdx];
    const disp = field.display ? field.display(v) : { text: `${v}`, numeric: +v };
    field.getLinks({ calculatedValue: disp, valueRowIndex: datapointIdx }).forEach((link) => {
      const key = `${link.title}/${link.href}`;
      if (!linkLookup.has(key)) {
        links.push(link);
        linkLookup.add(key);
      }
    });
  }

  const xField = alignedData.fields[0];
  const xFieldFmt = xField.display || getDisplayProcessor({ field: xField, timeZone, theme });

  const dataFrameFieldIndex = field.state?.origin;
  const fieldFmt = field.display || getDisplayProcessor({ field, timeZone, theme });
  const display = fieldFmt(value);
  const fieldDisplayName = dataFrameFieldIndex
    ? getFieldDisplayName(
        data[dataFrameFieldIndex.frameIndex].fields[dataFrameFieldIndex.fieldIndex],
        data[dataFrameFieldIndex.frameIndex],
        data
      )
    : null;

  // Calculate duration and to_time
  let duration: string | null = null;
  let headerText = xFieldFmt(xField.values[datapointIdx]).text;
  let toTime: number | null = null;

  if (timeRange) {
    const stateTs = xField.values[datapointIdx];

    // Try to find to_time field from original frames
    if (toTimeFieldName && dataFrameFieldIndex) {
      const originalFrame = data[dataFrameFieldIndex.frameIndex];
      const originalField = originalFrame.fields[dataFrameFieldIndex.fieldIndex];
      const timeField = originalFrame.fields.find((f) => f.type === FieldType.time);

      if (timeField) {
        // Find the to_time field
        let toTimeField: Field | undefined;
        for (const f of originalFrame.fields) {
          if (f.name === toTimeFieldName || f.state?.displayName === toTimeFieldName) {
            toTimeField = f;
            break;
          }
        }

        if (!toTimeField) {
          // Fallback: search all frames
          for (const frame of data) {
            for (const f of frame.fields) {
              if (f.name === toTimeFieldName || f.state?.displayName === toTimeFieldName) {
                toTimeField = f;
                break;
              }
            }
            if (toTimeField) {
              break;
            }
          }
        }

        if (toTimeField && timeField) {
          // Find the row index that matches the current timestamp and field value
          for (let i = 0; i < timeField.values.length; i++) {
            const timeVal = timeField.values[i];
            const fieldVal = originalField.values[i];

            // Match by timestamp and ensure the field has a value
            if (timeVal === stateTs && fieldVal != null && fieldVal === value) {
              const toTimeVal = toTimeField.values[i];
              if (toTimeVal != null) {
                toTime = toTimeVal;
                break;
              }
            }
          }
        }
      }
    }

    // Calculate duration
    if (toTime != null) {
      duration = fmtDuration(toTime - stateTs);
      const toTimeFmt = xFieldFmt(toTime);
      headerText = `From ${headerText} to ${toTimeFmt.text}`;
    } else {
      // Fall back to next state change
      const nextStateIdx = findNextStateIndex(field, datapointIdx);
      if (nextStateIdx != null) {
        const nextStateTs = xField.values[nextStateIdx];
        toTime = nextStateTs;
        duration = fmtDuration(nextStateTs - stateTs);
      } else if (timeRange) {
        // Fall back to time range end
        toTime = timeRange.to.valueOf();
        duration = fmtDuration(toTime - stateTs);
      }
    }
  }

  return (
    <div>
      <div style={{ fontSize: theme.typography.bodySmall.fontSize }}>
        <strong>{headerText}</strong>
        <br />
        <SeriesTableRow label={display.text} color={display.color || FALLBACK_COLOR} isActive />
        {fieldDisplayName}
        {duration && (
          <>
            <br />
            <span style={{ color: theme.colors.text.secondary }}>Duration: {duration}</span>
          </>
        )}
      </div>
      {links.length > 0 && (
        <div
          style={{
            margin: theme.spacing(1, -1, -1, -1),
            borderTop: `1px solid ${theme.colors.border.weak}`,
          }}
        >
          {links.map((link, i) => (
            <MenuItem
              key={i}
              icon={'external-link-alt'}
              target={link.target}
              label={link.title}
              url={link.href}
              onClick={link.onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

StatusHistoryTooltip.displayName = 'StatusHistoryTooltip';
