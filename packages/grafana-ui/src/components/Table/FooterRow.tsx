import React from 'react';
import { ColumnInstance, HeaderGroup } from 'react-table';

import { selectors } from '@grafana/e2e-selectors';

import { useStyles2 } from '../../themes';

import { EmptyCell, FooterCell } from './FooterCell';
import { getTableStyles, TableStyles } from './styles';
import { FooterItem } from './types';

export interface FooterRowProps {
  totalColumnsWidth: number;
  footerGroups: HeaderGroup[];
  footerValues: FooterItem[];
  isPaginationVisible: boolean;
}

export const FooterRow = (props: FooterRowProps) => {
  const { totalColumnsWidth, footerGroups, isPaginationVisible } = props;
  const e2eSelectorsTable = selectors.components.Panels.Visualization.Table;
  const tableStyles = useStyles2(getTableStyles);

  return (
    <div
      style={{
        position: isPaginationVisible ? 'relative' : 'absolute',
        width: totalColumnsWidth ? `${totalColumnsWidth}px` : '100%',
        bottom: '0px',
      }}
    >
      {footerGroups.map((footerGroup: HeaderGroup) => {
        const { key, ...footerGroupProps } = footerGroup.getFooterGroupProps();
        return (
          <div className={tableStyles.tfoot} {...footerGroupProps} key={key} data-testid={e2eSelectorsTable.footer}>
            {footerGroup.headers.map((column: ColumnInstance) => renderFooterCell(column, tableStyles))}
          </div>
        );
      })}
    </div>
  );
};

function renderFooterCell(column: ColumnInstance, tableStyles: TableStyles) {
  const footerProps = column.getHeaderProps();

  if (!footerProps) {
    return null;
  }

  footerProps.style = footerProps.style ?? {};
  footerProps.style.position = 'absolute';
  footerProps.style.justifyContent = (column as any).justifyContent;

  return (
    <div className={tableStyles.headerCell} {...footerProps}>
      {column.render('Footer')}
    </div>
  );
}

export function getFooterValue(index: number, footerValues?: FooterItem[], isCountRowsSet?: boolean) {
  if (footerValues === undefined) {
    return EmptyCell;
  }

  if (isCountRowsSet) {
    const count = footerValues[index];
    if (typeof count !== 'string') {
      return EmptyCell;
    }

    return FooterCell({ value: [{ Count: count }] });
  }

  return FooterCell({ value: footerValues[index] });
}
