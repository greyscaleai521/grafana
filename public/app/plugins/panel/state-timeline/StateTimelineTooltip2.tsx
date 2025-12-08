import React from 'react';

import { Field, FieldType, getFieldDisplayName, LinkModel, TimeRange } from '@grafana/data';
import { SortOrder } from '@grafana/schema/dist/esm/common/common.gen';
import { TooltipDisplayMode, useStyles2 } from '@grafana/ui';
import { VizTooltipContent } from '@grafana/ui/src/components/VizTooltip/VizTooltipContent';
import { VizTooltipFooter } from '@grafana/ui/src/components/VizTooltip/VizTooltipFooter';
import { VizTooltipHeader } from '@grafana/ui/src/components/VizTooltip/VizTooltipHeader';
import { LabelValue } from '@grafana/ui/src/components/VizTooltip/types';
import { getContentItems } from '@grafana/ui/src/components/VizTooltip/utils';
import { findNextStateIndex, fmtDuration } from 'app/core/components/TimelineChart/utils';

import { getDataLinks } from '../status-history/utils';
import { TimeSeriesTooltipProps, getStyles } from '../timeseries/TimeSeriesTooltip';

interface StateTimelineTooltip2Props extends TimeSeriesTooltipProps {
  timeRange: TimeRange;
  withDuration: boolean;
  toTimeFieldName?: string;
}

export const StateTimelineTooltip2 = ({
  frames,
  seriesFrame,
  dataIdxs,
  seriesIdx,
  mode = TooltipDisplayMode.Single,
  sortOrder = SortOrder.None,
  scrollable = false,
  isPinned,
  annotate,
  timeRange,
  withDuration,
  toTimeFieldName,
}: StateTimelineTooltip2Props) => {
  const styles = useStyles2(getStyles);

  const xField = seriesFrame.fields[0];

  let dataIdx = seriesIdx != null ? dataIdxs[seriesIdx] : dataIdxs.find((idx) => idx != null);

  // If the value at dataIdx is null for the hovered field, try to find a non-null value at the same timestamp
  if (seriesIdx != null && dataIdx != null) {
    const field = seriesFrame.fields[seriesIdx];
    const value = field?.values[dataIdx];

    if (value == null || value === '' || value === undefined) {
      const targetTime = xField.values[dataIdx];

      // Search for a non-null value at the same timestamp
      for (let i = 0; i < xField.values.length; i++) {
        if (xField.values[i] === targetTime) {
          const candidateValue = field?.values[i];
          if (candidateValue != null && candidateValue !== '' && candidateValue !== undefined) {
            dataIdx = i;
            break;
          }
        }
      }
    }
  }

  // Don't render tooltip if we still have no valid data
  if (dataIdx == null) {
    return null;
  }

  const xVal = xField.display!(xField.values[dataIdx]).text;

  mode = isPinned ? TooltipDisplayMode.Single : mode;

  const contentItems = getContentItems(seriesFrame.fields, xField, dataIdxs, seriesIdx, mode, sortOrder);

  // append duration in single mode
  if (withDuration && mode === TooltipDisplayMode.Single) {
    const field = seriesFrame.fields[seriesIdx!];
    const stateTs = xField.values[dataIdx!];
    let duration: string;
    let toTime: number | null = null;

    // Try to find to_time field from original frames if toTimeFieldName is provided
    if (toTimeFieldName && frames) {
      const dataFrameFieldIndex = field.state?.origin;
      if (dataFrameFieldIndex) {
        const originalFrame = frames[dataFrameFieldIndex.frameIndex];
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
            for (const frame of frames) {
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
            const fieldValue = field.values[dataIdx!];
            for (let i = 0; i < timeField.values.length; i++) {
              const timeVal = timeField.values[i];
              const fieldVal = originalField.values[i];

              // Match by timestamp and ensure the field has a value
              if (timeVal === stateTs && fieldVal != null && fieldVal === fieldValue) {
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
    }

    // Calculate duration
    if (toTime != null) {
      duration = fmtDuration(toTime - stateTs);
    } else {
      // Fall back to next state change
      const nextStateIdx = findNextStateIndex(field, dataIdx!);
      if (nextStateIdx) {
        const nextStateTs = xField.values[nextStateIdx!];
        duration = fmtDuration(nextStateTs - stateTs);
      } else {
        // Fall back to time range end
        const to = timeRange.to.valueOf();
        duration = fmtDuration(to - stateTs);
      }
    }

    contentItems.push({ label: 'Duration', value: duration });
  }

  let links: Array<LinkModel<Field>> = [];

  if (seriesIdx != null) {
    const field = seriesFrame.fields[seriesIdx];
    const dataIdx = dataIdxs[seriesIdx]!;
    links = getDataLinks(field, dataIdx);
  }

  const headerItem: LabelValue = {
    label: xField.type === FieldType.time ? '' : getFieldDisplayName(xField, seriesFrame, frames),
    value: xVal,
  };

  return (
    <div>
      <div className={styles.wrapper}>
        <VizTooltipHeader headerLabel={headerItem} isPinned={isPinned} />
        <VizTooltipContent contentLabelValue={contentItems} isPinned={isPinned} scrollable={scrollable} />
        {isPinned && <VizTooltipFooter dataLinks={links} annotate={annotate} />}
      </div>
    </div>
  );
};
