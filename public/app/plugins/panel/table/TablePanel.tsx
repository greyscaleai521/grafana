import { css } from '@emotion/css';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  DashboardCursorSync,
  DataFrame,
  FieldMatcherID,
  getFieldDisplayName,
  getFrameDisplayName,
  PanelProps,
  SelectableValue,
} from '@grafana/data';
import { config } from '@grafana/runtime';
import { TableCellDisplayMode } from '@grafana/schema';
import { Select, Table, usePanelContext, useTheme2 } from '@grafana/ui';
import { TableSortByFieldState } from '@grafana/ui/src/components/Table/types';

import { InspectionsImageLinkCell } from './cells/InspectionsImageLinkCell';
import { hasDeprecatedParentRowIndex, migrateFromParentRowIndexToNestedFrames } from './migrations';
import { Options } from './panelcfg.gen';

interface Props extends PanelProps<Options> {}

const OPERATIONAL_EVENTS_TABLE_TITLE = 'Operational Events';
const JOBS_TABLE_TITLE = 'Jobs';
const INSPECTIONS_TABLE_TITLE = 'Inspections';
const INSPECTIONS_IMAGE_COLUMN = 'Image';

function withInspectionsImageIconCell(frame: DataFrame): DataFrame {
  const imageFieldIndex = frame.fields.findIndex((field) => getFieldDisplayName(field, frame) === INSPECTIONS_IMAGE_COLUMN);

  if (imageFieldIndex < 0) {
    return frame;
  }

  return {
    ...frame,
    fields: frame.fields.map((field, index) => {
      if (index !== imageFieldIndex) {
        return field;
      }

      return {
        ...field,
        config: {
          ...field.config,
          custom: {
            ...field.config.custom,
            cellOptions: {
              type: TableCellDisplayMode.Custom,
              cellComponent: InspectionsImageLinkCell,
            },
            displayMode: undefined,
          },
        },
      };
    }),
  };
}

function getTableHeaderLabel(header: Element) {
  const button = header.querySelector('button');
  const label = button?.querySelector('div');
  return (label?.textContent ?? button?.textContent ?? header.textContent ?? '').trim();
}

function getTableColumnOffset(headers: Element[], columnIndex: number) {
  const header = headers[columnIndex] as HTMLElement;
  const inlineLeft = parseFloat(header.style.left);

  if (!Number.isNaN(inlineLeft)) {
    return inlineLeft;
  }

  return headers
    .slice(0, columnIndex)
    .reduce((sum, currentHeader) => sum + (currentHeader as HTMLElement).offsetWidth, 0);
}

function getTableColumnCells(root: HTMLElement, headers: Element[], columnIndex: number): HTMLElement[] {
  if (columnIndex < 0 || !headers[columnIndex]) {
    return [];
  }

  return [
    headers[columnIndex] as HTMLElement,
    ...Array.from(root.querySelectorAll('[role="row"]'))
      .map((row) => row.children[columnIndex] as HTMLElement | undefined)
      .filter((cell): cell is HTMLElement => Boolean(cell)),
  ];
}

function useStringStickyColumn(
  enabled: boolean,
  containerRef: React.RefObject<HTMLDivElement>,
  refreshKey: string
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const root = containerRef.current;
    const PINNED_CLASS = 'table-sticky-col--pinned';
    let scrollContainer: HTMLElement | null = null;

    const clearPinnedState = () => {
      root.querySelectorAll(`.${PINNED_CLASS}`).forEach((element) => {
        element.classList.remove(PINNED_CLASS);
        (element as HTMLElement).style.removeProperty('--table-sticky-left');
      });
    };

    const updatePinnedState = () => {
      const headers = Array.from(root.querySelectorAll('[role="columnheader"]'));
      clearPinnedState();

      const columnIndex = headers.findIndex((header) => getTableHeaderLabel(header) === 'String');

      scrollContainer =
        (root.querySelector('[role="table"]') as HTMLElement | null) ??
        (root.querySelector('.scrollbar-view') as HTMLElement | null);

      if (!scrollContainer || columnIndex < 0) {
        return;
      }

      const columnOffset = getTableColumnOffset(headers, columnIndex);

      if (scrollContainer.scrollLeft >= columnOffset) {
        getTableColumnCells(root, headers, columnIndex).forEach((cell) => {
          cell.classList.add(PINNED_CLASS);
          cell.style.setProperty('--table-sticky-left', '0px');
        });
      }
    };

    const refresh = () => {
      scrollContainer?.removeEventListener('scroll', updatePinnedState);
      updatePinnedState();
      scrollContainer?.addEventListener('scroll', updatePinnedState, { passive: true });
    };

    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', refresh);

    return () => {
      scrollContainer?.removeEventListener('scroll', updatePinnedState);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      clearPinnedState();
    };
  }, [enabled, containerRef, refreshKey]);
}

function useOperationalEventsStickyColumn(
  enabled: boolean,
  containerRef: React.RefObject<HTMLDivElement>,
  refreshKey: string
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const root = containerRef.current;
    let scrollContainer: HTMLElement | null = null;
    let eventColumnIndex = -1;
    let eventColumnOffset = 0;

    const getEventHeaderLabel = getTableHeaderLabel;

    const markCompactColumns = (headers: Element[]) => {
      root.querySelectorAll('.operational-events-col-event-time, .operational-events-col-event').forEach((element) => {
        element.classList.remove('operational-events-col-event-time', 'operational-events-col-event');
      });

      const columnClasses: Array<[string, string]> = [
        ['Event Time', 'operational-events-col-event-time'],
        ['Event', 'operational-events-col-event'],
      ];

      columnClasses.forEach(([label, className]) => {
        const columnIndex = headers.findIndex((header) => getEventHeaderLabel(header) === label);

        if (columnIndex < 0) {
          return;
        }

        headers[columnIndex]?.classList.add(className);

        root.querySelectorAll('[role="row"]').forEach((row) => {
          row.children[columnIndex]?.classList.add(className);
        });
      });
    };

    const getColumnOffset = getTableColumnOffset;
    const getColumnCells = (headers: Element[], columnIndex: number) => getTableColumnCells(root, headers, columnIndex);

    const clearPinnedState = () => {
      root
        .querySelectorAll(
          '.operational-events-sticky-col--pinned, .operational-events-sticky-col--pinned-event-time, .operational-events-sticky-col--pinned-event'
        )
        .forEach((element) => {
          element.classList.remove(
            'operational-events-sticky-col--pinned',
            'operational-events-sticky-col--pinned-event-time',
            'operational-events-sticky-col--pinned-event'
          );
          (element as HTMLElement).style.removeProperty('--operational-events-sticky-left');
        });
    };

    const pinColumnCells = (cells: HTMLElement[], className: string, stickyLeft: number) => {
      cells.forEach((cell) => {
        cell.classList.add(className);
        cell.style.setProperty('--operational-events-sticky-left', `${stickyLeft}px`);
      });
    };

    const updatePinnedState = () => {
      const headers = Array.from(root.querySelectorAll('[role="columnheader"]'));
      markCompactColumns(headers);
      clearPinnedState();

      const eventTimeColumnIndex = headers.findIndex((header) => getEventHeaderLabel(header) === 'Event Time');
      eventColumnIndex = headers.findIndex((header) => getEventHeaderLabel(header) === 'Event');

      scrollContainer =
        (root.querySelector('[role="table"]') as HTMLElement | null) ??
        (root.querySelector('.scrollbar-view') as HTMLElement | null);

      if (!scrollContainer || eventColumnIndex < 0) {
        return;
      }

      const isWideViewport = window.matchMedia('(min-width: 621px)').matches;
      const scrollLeft = scrollContainer.scrollLeft;
      eventColumnOffset = getColumnOffset(headers, eventColumnIndex);

      let eventTimeColumnWidth = 0;
      let eventTimePinned = false;

      if (isWideViewport && eventTimeColumnIndex >= 0) {
        const eventTimeColumnOffset = getColumnOffset(headers, eventTimeColumnIndex);
        eventTimePinned = scrollLeft >= eventTimeColumnOffset;

        if (eventTimePinned) {
          eventTimeColumnWidth = (headers[eventTimeColumnIndex] as HTMLElement).offsetWidth;
          pinColumnCells(
            getColumnCells(headers, eventTimeColumnIndex),
            'operational-events-sticky-col--pinned-event-time',
            0
          );
        }
      }

      if (scrollLeft >= eventColumnOffset) {
        const eventStickyLeft = isWideViewport && eventTimePinned ? eventTimeColumnWidth : 0;
        pinColumnCells(getColumnCells(headers, eventColumnIndex), 'operational-events-sticky-col--pinned-event', eventStickyLeft);
      }
    };

    const refresh = () => {
      scrollContainer?.removeEventListener('scroll', updatePinnedState);
      updatePinnedState();
      scrollContainer?.addEventListener('scroll', updatePinnedState, { passive: true });
    };

    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', refresh);

    return () => {
      scrollContainer?.removeEventListener('scroll', updatePinnedState);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      root
        .querySelectorAll(
          '.operational-events-sticky-col--pinned, .operational-events-sticky-col--pinned-event-time, .operational-events-sticky-col--pinned-event'
        )
        .forEach((element) => {
          element.classList.remove(
            'operational-events-sticky-col--pinned',
            'operational-events-sticky-col--pinned-event-time',
            'operational-events-sticky-col--pinned-event'
          );
          (element as HTMLElement).style.removeProperty('--operational-events-sticky-left');
        });
      root.querySelectorAll('.operational-events-col-event-time, .operational-events-col-event').forEach((element) => {
        element.classList.remove('operational-events-col-event-time', 'operational-events-col-event');
      });
    };
  }, [enabled, containerRef, refreshKey]);
}

export function TablePanel(props: Props) {
  const { data, height, width, options, timeRange, title } = props;
  const isOperationalEventsTable = title === OPERATIONAL_EVENTS_TABLE_TITLE;
  const isJobsTable = title === JOBS_TABLE_TITLE;
  const isInspectionsTable = title === INSPECTIONS_TABLE_TITLE;
  const isStringStickyTable = isJobsTable || isInspectionsTable;
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const theme = useTheme2();
  const panelContext = usePanelContext();
  const frames = hasDeprecatedParentRowIndex(data.series)
    ? migrateFromParentRowIndexToNestedFrames(data.series)
    : data.series;
  const count = frames?.length;
  const hasFields = frames[0]?.fields.length;
  const currentIndex = getCurrentFrameIndex(frames, options);
  const main = frames[currentIndex];
  const tableData = useMemo(() => {
    if (!isInspectionsTable || !main) {
      return main;
    }

    return withInspectionsImageIconCell(main);
  }, [isInspectionsTable, main]);

  let tableHeight = height;

  const stickyRefreshKey = `${main?.fields.length ?? 0}-${main?.length ?? 0}-${options.showRowSelection}-${height}-${width}`;

  useOperationalEventsStickyColumn(
    isOperationalEventsTable && Boolean(count && hasFields),
    tableContainerRef,
    stickyRefreshKey
  );

  useStringStickyColumn(isStringStickyTable && Boolean(count && hasFields), tableContainerRef, stickyRefreshKey);

  if (!count || !hasFields) {
    return <div className={tableStyles.noData}>No data</div>;
  }

  if (count > 1) {
    const inputHeight = theme.spacing.gridSize * theme.components.height.md;
    const padding = theme.spacing.gridSize;

    tableHeight = height - inputHeight - padding;
  }

  const enableSharedCrosshair = panelContext.sync && panelContext.sync() !== DashboardCursorSync.Off;

  const tableElement = (
    <div
      ref={tableContainerRef}
      className={
        isOperationalEventsTable
          ? 'operational-events-table'
          : isJobsTable
            ? 'jobs-table'
            : isInspectionsTable
              ? 'inspections-table'
              : undefined
      }
      style={{ height: '100%', width: '100%' }}
    >
      <Table
        height={tableHeight}
        width={width}
        data={tableData}
        noHeader={!options.showHeader}
        showTypeIcons={options.showTypeIcons}
        resizable={true}
        initialSortBy={options.sortBy}
        onSortByChange={(sortBy) => onSortByChange(sortBy, props)}
        onColumnResize={(displayName, resizedWidth) => onColumnResize(displayName, resizedWidth, props)}
        onCellFilterAdded={panelContext.onAddAdHocFilter}
        footerOptions={options.footer}
        enablePagination={options.footer?.enablePagination}
        cellHeight={options.cellHeight}
        timeRange={timeRange}
        enableSharedCrosshair={config.featureToggles.tableSharedCrosshair && enableSharedCrosshair}
        showRowSelection={options.showRowSelection}
        itemName={options.tableName}
        actionText={options.actionLinkText}
        exportDataText={options.exportDataText}
        windowURL={options.windowURL}
      />
    </div>
  );

  if (count === 1) {
    return tableElement;
  }

  const names = frames.map((frame, index) => {
    return {
      label: getFrameDisplayName(frame),
      value: index,
    };
  });

  return (
    <div className={tableStyles.wrapper}>
      {tableElement}
      <div className={tableStyles.selectWrapper}>
        <Select options={names} value={names[currentIndex]} onChange={(val) => onChangeTableSelection(val, props)} />
      </div>
    </div>
  );
}

function getCurrentFrameIndex(frames: DataFrame[], options: Options) {
  return options.frameIndex > 0 && options.frameIndex < frames.length ? options.frameIndex : 0;
}

function onColumnResize(fieldDisplayName: string, width: number, props: Props) {
  const { fieldConfig } = props;
  const { overrides } = fieldConfig;

  const matcherId = FieldMatcherID.byName;
  const propId = 'custom.width';

  // look for existing override
  const override = overrides.find((o) => o.matcher.id === matcherId && o.matcher.options === fieldDisplayName);

  if (override) {
    // look for existing property
    const property = override.properties.find((prop) => prop.id === propId);
    if (property) {
      property.value = width;
    } else {
      override.properties.push({ id: propId, value: width });
    }
  } else {
    overrides.push({
      matcher: { id: matcherId, options: fieldDisplayName },
      properties: [{ id: propId, value: width }],
    });
  }

  props.onFieldConfigChange({
    ...fieldConfig,
    overrides,
  });
}

function onSortByChange(sortBy: TableSortByFieldState[], props: Props) {
  props.onOptionsChange({
    ...props.options,
    sortBy,
  });
}

function onChangeTableSelection(val: SelectableValue<number>, props: Props) {
  props.onOptionsChange({
    ...props.options,
    frameIndex: val.value || 0,
  });
}

const tableStyles = {
  wrapper: css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  `,
  selectWrapper: css`
    padding: 8px 8px 0px 8px;
  `,
  noData: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  `,
};
