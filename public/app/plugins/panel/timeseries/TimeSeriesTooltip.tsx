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
import { TextLink } from '@grafana/ui';
import {
  VizTooltipContent,
  VizTooltipFooter,
  VizTooltipHeader,
  VizTooltipRow,
  VizTooltipWrapper,
  getContentItems,
  type VizTooltipItem,
  type AdHocFilterModel,
  type FilterByGroupedLabelsModel,
} from '@grafana/ui/internal';

import { getFieldActions } from '../status-history/utils';

import { isTooltipScrollable } from './utils';

// GSAI override: '_top' (navigate-parent) links break out of the embedding iframe by
// messaging the host. The host merges the current dashboard's filters from localStorage,
// so we only post the link's own interpolated href (matches DataLinksContextMenu/DataHoverView).
const navigateParent = (href: string) => {
  window.parent.postMessage({ key: 'navigateUrl', value: href }, '*');
};

// GSAI override: shared renderer for the compact tooltip "Link" rows. Data links are shown
// inline (visible on hover, not only when pinned) with an explicit "Link" field name and a
// link icon. '_top' links navigate the parent frame; others navigate normally.
export const getCompactLinkRows = (links: LinkModel[], isPinned: boolean): ReactNode => {
  if (links.length === 0) {
    return null;
  }

  return links.map((link, i) => (
    <VizTooltipRow
      key={`link-${i}`}
      label="Link"
      value={
        link.target === '_top' ? (
          <TextLink href={link.href} target="_top" weight="medium" inline={false} onClick={() => navigateParent(link.href)}>
            {link.title}
          </TextLink>
        ) : (
          <TextLink
            href={link.href}
            external={link.target === '_blank'}
            icon="external-link-alt"
            weight="medium"
            inline={false}
            onClick={link.onClick}
          >
            {link.title}
          </TextLink>
        )
      }
      isPinned={isPinned}
      compact
      hideColorIndicator
    />
  ));
};

// GSAI override: resolve a hovered series' data links, preferring live field links (available
// on hover) and falling back to the plugin-provided links (available when pinned).
export const getCompactLinks = (
  series: DataFrame,
  seriesIdx: number,
  dataIdxs: Array<number | null>,
  dataLinks: LinkModel[]
): LinkModel[] => {
  const field = series.fields[seriesIdx];
  const dataIdx = dataIdxs[seriesIdx];
  return (dataIdx != null ? field.getLinks?.({ valueRowIndex: dataIdx }) : undefined) ?? dataLinks;
};

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

  // GSAI override: in compact mode, render data links inline as "Link" rows so they show on
  // hover (not only when the bar is pinned) and carry an explicit "Link" field name.
  const compactLinkRows =
    compact && seriesIdx != null ? getCompactLinkRows(getCompactLinks(series, seriesIdx, dataIdxs, dataLinks), isPinned) : null;

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
          // GSAI override: compact tooltips render links inline instead of in the footer
          dataLinks={compact ? [] : dataLinks}
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
      >
        {compactLinkRows}
      </VizTooltipContent>
      {footer}
    </VizTooltipWrapper>
  );
};
