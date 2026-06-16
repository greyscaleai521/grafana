import { type ReactNode } from 'react';

import { type DataFrame, type Field, FieldType, type TimeRange, usePluginContext } from '@grafana/data';
import { SortOrder } from '@grafana/schema';
import { TooltipDisplayMode } from '@grafana/ui';
import {
  VizTooltipContent,
  VizTooltipFooter,
  VizTooltipHeader,
  VizTooltipWrapper,
  getContentItems,
  type VizTooltipItem,
} from '@grafana/ui/internal';
import { findNextStateIndex, fmtDuration } from 'app/core/components/TimelineChart/utils';

import { getFieldActions } from '../status-history/utils';
import { type TimeSeriesTooltipProps } from '../timeseries/TimeSeriesTooltip';
import { isTooltipScrollable } from '../timeseries/utils';

interface StateTimelineTooltipProps extends TimeSeriesTooltipProps {
  timeRange: TimeRange;
  withDuration: boolean;
  toTimeFieldName?: string;
  frames?: DataFrame[];
}

export const StateTimelineTooltip = ({
  series,
  dataIdxs,
  seriesIdx,
  mode = TooltipDisplayMode.Single,
  sortOrder = SortOrder.None,
  isPinned,
  annotate,
  timeRange,
  withDuration,
  toTimeFieldName,
  frames,
  maxHeight,
  replaceVariables,
  dataLinks,
}: StateTimelineTooltipProps) => {
  const pluginContext = usePluginContext();
  const xField = series.fields[0];

  const dataIdx = seriesIdx != null ? dataIdxs[seriesIdx] : dataIdxs.find((idx) => idx != null);

  const xVal = xField.display!(xField.values[dataIdx!]).text;

  mode = isPinned ? TooltipDisplayMode.Single : mode;

  const contentItems = getContentItems(series.fields, xField, dataIdxs, seriesIdx, mode, sortOrder);
  let endTime = null;

  // append duration in single mode
  if (withDuration && mode === TooltipDisplayMode.Single) {
    const field = series.fields[seriesIdx!];
    const stateTs = xField.values[dataIdx!];
    let duration: string;
    let toTime: number | null = null;

    // Try to resolve an explicit to_time field from the original frames when configured
    if (toTimeFieldName && frames) {
      const origin = field.state?.origin;
      if (origin) {
        const originalFrame = frames[origin.frameIndex];
        const originalField = originalFrame?.fields[origin.fieldIndex];
        const timeField = originalFrame?.fields.find((f) => f.type === FieldType.time);

        if (originalFrame && originalField && timeField) {
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

          if (toTimeField) {
            // Match the row by timestamp and field value, then read its to_time
            const fieldValue = field.values[dataIdx!];
            for (let i = 0; i < timeField.values.length; i++) {
              const timeVal = timeField.values[i];
              const fieldVal = originalField.values[i];

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

    if (toTime != null) {
      duration = fmtDuration(toTime - stateTs);
      endTime = toTime;
    } else {
      // Fall back to the next state change, then the time range end
      const nextStateIdx = findNextStateIndex(field, dataIdx!);
      let nextStateTs;
      if (nextStateIdx != null) {
        nextStateTs = xField.values[nextStateIdx];
      }

      if (nextStateTs) {
        duration = nextStateTs && fmtDuration(nextStateTs - stateTs);
        endTime = nextStateTs;
      } else {
        const to = timeRange.to.valueOf();
        duration = fmtDuration(to - stateTs);
        endTime = to;
      }
    }

    contentItems.push({ label: 'Duration', value: duration });
  }

  let footer: ReactNode;

  if (seriesIdx != null) {
    const field = series.fields[seriesIdx];
    const hasOneClickLink = dataLinks.some((dataLink) => dataLink.oneClick === true);

    if (isPinned || hasOneClickLink) {
      const visualizationType = pluginContext?.meta?.id ?? 'state-timeline';
      const dataIdx = dataIdxs[seriesIdx]!;
      const actions = getFieldActions(series, field, replaceVariables!, dataIdx, visualizationType);

      footer = <VizTooltipFooter dataLinks={dataLinks} actions={actions} annotate={annotate} />;
    }
  }

  const headerItem: VizTooltipItem = {
    label: xField.type === FieldType.time ? '' : (xField.state?.displayName ?? xField.name),
    value: endTime ? xVal + ' - \n' + xField.display!(endTime).text : xVal,
  };

  return (
    <VizTooltipWrapper>
      <VizTooltipHeader item={headerItem} isPinned={isPinned} />
      <VizTooltipContent
        items={contentItems}
        isPinned={isPinned}
        scrollable={isTooltipScrollable({ mode, maxHeight })}
        maxHeight={maxHeight}
      />
      {footer}
    </VizTooltipWrapper>
  );
};
