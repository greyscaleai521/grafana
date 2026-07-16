import { type ReactNode } from 'react';

import {
  type DataFrame,
  type Field,
  FieldType,
  formattedValueToString,
  type InterpolateFunction,
  type LinkModel,
  usePluginContext,
} from '@grafana/data';
import { SortOrder, TooltipDisplayMode } from '@grafana/schema';
import {
  VizTooltipContent,
  VizTooltipFooter,
  VizTooltipHeader,
  VizTooltipWrapper,
  getContentItems,
  type VizTooltipItem,
  type AdHocFilterModel,
  type FilterByGroupedLabelsModel,
} from '@grafana/ui/internal';

import { getFieldActions } from '../status-history/utils';

import { isTooltipScrollable } from './utils';

// exemplar / annotation / time region hovering?
// add annotation UI / alert dismiss UI?

export interface TimeSeriesTooltipProps {
  // aligned series frame
  series: DataFrame;

  // aligned fields that are not series
  _rest?: Field[];

  // hovered points
  dataIdxs: Array<number | null>;
  // closest/hovered series
  seriesIdx?: number | null;
  mode?: TooltipDisplayMode;
  sortOrder?: SortOrder;

  isPinned: boolean;

  annotate?: () => void;
  maxHeight?: number;

  // field names always shown in custom tooltip mode, in addition to the hovered series
  fixedFields?: string[];

  replaceVariables?: InterpolateFunction;
  dataLinks: LinkModel[];
  hideZeros?: boolean;
  adHocFilters?: AdHocFilterModel[];
  filterByGroupedLabels?: FilterByGroupedLabelsModel;
  canExecuteActions?: boolean;
  compareDiffMs?: number[];
  // GSAI override: compact left-aligned tooltip (bar chart / status history / state timeline)
  compact?: boolean;
}

export const TimeSeriesTooltip = ({
  series,
  _rest,
  dataIdxs,
  seriesIdx,
  mode = TooltipDisplayMode.Single,
  sortOrder = SortOrder.None,
  isPinned,
  annotate,
  maxHeight,
  replaceVariables = (str) => str,
  dataLinks,
  hideZeros,
  adHocFilters,
  canExecuteActions,
  compareDiffMs,
  filterByGroupedLabels,
  fixedFields,
  compact = false,
}: TimeSeriesTooltipProps) => {
  const pluginContext = usePluginContext();

  const xField = series.fields[0];
  let xVal = xField.values[dataIdxs[0]!];

  if (compareDiffMs != null && xField.type === FieldType.time) {
    xVal += compareDiffMs[seriesIdx ?? 1];
  }

  const xDisp = formattedValueToString(xField.display!(xVal));

  const contentItems = getContentItems(
    series.fields,
    xField,
    dataIdxs,
    seriesIdx,
    mode,
    sortOrder,
    (field) => field.type === FieldType.number || field.type === FieldType.enum,
    hideZeros,
    _rest,
    fixedFields
  );

  let footer: ReactNode;

  if (seriesIdx != null) {
    const field = series.fields[seriesIdx];
    const hasOneClickLink = dataLinks.some((dataLink) => dataLink.oneClick === true);

    if (isPinned || hasOneClickLink) {
      const visualizationType = pluginContext?.meta?.id ?? 'timeseries';
      const dataIdx = dataIdxs[seriesIdx]!;
      const actions = canExecuteActions
        ? getFieldActions(series, field, replaceVariables, dataIdx, visualizationType)
        : [];

      footer = (
        <VizTooltipFooter
          dataLinks={dataLinks}
          actions={actions}
          annotate={annotate}
          adHocFilters={adHocFilters}
          filterByGroupedLabels={filterByGroupedLabels}
        />
      );
    }
  }

  const headerItem: VizTooltipItem = {
    label: xField.type === FieldType.time ? '' : (xField.state?.displayName ?? xField.name),
    value: xDisp,
  };

  // GSAI override: in compact mode merge header into content so columns align in one table
  const items = compact && (headerItem.label || headerItem.value) ? [headerItem, ...contentItems] : contentItems;

  return (
    <VizTooltipWrapper>
      {!compact && headerItem != null && <VizTooltipHeader item={headerItem} isPinned={isPinned} />}
      <VizTooltipContent
        items={items}
        isPinned={isPinned}
        scrollable={isTooltipScrollable({ mode, maxHeight })}
        maxHeight={maxHeight}
        compact={compact}
      />
      {footer}
    </VizTooltipWrapper>
  );
};
