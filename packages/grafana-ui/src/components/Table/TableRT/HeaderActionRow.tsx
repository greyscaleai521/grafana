import { useEffect, useState } from 'react';
import { type Row } from 'react-table';

import { type Field, type TypedVariableModel } from '@grafana/data';
import { t } from '@grafana/i18n';

import { Button } from '../../Button/Button';
import { type FilterValues } from '../types';
import { getValuesFromSelectedRows, numberWithComas } from '../utils';

import { type TableStyles } from './styles';
import { getTimeRange, parseUrlParam } from './timeRange';

export interface HeaderActionRowProps {
  itemName?: string;
  actionText?: string;
  exportDataText?: string;
  selectedFlatRows?: Row[];
  selectedRowIds?: Record<string, boolean>;
  windowURL?: string;
  tableStyles: TableStyles;
  fields: Field[];
}

export const HeaderActionRow = (props: HeaderActionRowProps) => {
  const [showNoRowSelected, setShowNoRowSelected] = useState<boolean>(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const { itemName, actionText, exportDataText, selectedFlatRows = [], windowURL = '*', tableStyles, fields } = props;
  const noRowSelectedMessage = t(
    'grafana-ui.table.no-row-selected',
    'Please select at least one {{itemName}} to view images',
    { itemName }
  );

  const onActionLinkClick = () => {
    if (selectedFlatRows.length === 0) {
      setShowNoRowSelected(true);
      return;
    }
    const parentWindow = window.parent || window;
    parentWindow.postMessage(
      {
        payload: getValuesFromSelectedRows(selectedFlatRows, fields),
        source: 'grafana-table-plugin',
        isMultipleImages: true,
      },
      windowURL
    );
  };

  const buildSelectedFilters = (variables: TypedVariableModel[], params: URLSearchParams): FilterValues => {
    let selectedFilters: FilterValues = {};
    const from = parseUrlParam(params.get('from')) ?? 'now-24h';
    const to = parseUrlParam(params.get('to')) ?? 'now';
    const tr = getTimeRange({ from, to });

    selectedFilters = {
      from: { Value: tr.from.toISOString(), Name: 'To' },
      to: { Value: tr.to.toISOString(), Name: 'From' },
    };

    variables.forEach((variable: TypedVariableModel) => {
      const { id, label, hide, description } = variable;
      const current = 'current' in variable ? variable.current : undefined;
      if (!id.includes('Advanced')) {
        const text = current && 'text' in current ? current.text : undefined;

        if ((text && text.length) || id === 'Weight') {
          selectedFilters[id] = {
            Value: Array.isArray(text) ? text : [text ?? ''],
            Name: label ?? '',
            hide: hide !== 0,
            Description: description ?? '',
          };
        }
      }
    });

    return selectedFilters;
  };

  const onExportDataLinkClick = async () => {
    const parentWindow = window.parent || window;
    // @grafana/runtime is loaded lazily so grafana-ui's static module graph stays free of the runtime barrel.
    // eslint-disable-next-line no-restricted-imports
    const { getTemplateSrv, locationService } = await import('@grafana/runtime');
    const selectedFilters = buildSelectedFilters(getTemplateSrv().getVariables(), locationService.getSearch());
    if (Object.keys(selectedFilters).length) {
      parentWindow.postMessage({ payload: selectedFilters, source: 'grafana-table-plugin', isExport: true }, windowURL);
    }
    setIsButtonDisabled(true);

    setTimeout(() => {
      setIsButtonDisabled(false);
    }, 6000);
  };

  useEffect(() => {
    setShowNoRowSelected(false);
  }, [selectedFlatRows]);

  return (
    <div className={tableStyles.selectedRowHeader}>
      <div className={tableStyles.rowCountTextCont}>
        {showNoRowSelected === true && <div className={tableStyles.noRowSelectedText}>{noRowSelectedMessage}</div>}
        {selectedFlatRows.length > 0 && (
          <div>
            {t('grafana-ui.table.rows-selected', '{{num}} {{itemName}} selected', {
              num: numberWithComas(selectedFlatRows.length),
              itemName,
            })}
          </div>
        )}
      </div>
      <div className={tableStyles.viewImageButton} style={{ display: 'flex' }}>
        {actionText && (
          <Button onClick={onActionLinkClick} fill={'text'}>
            {actionText}
          </Button>
        )}
        {exportDataText && (
          <Button onClick={onExportDataLinkClick} fill={'text'} disabled={isButtonDisabled}>
            {exportDataText}
          </Button>
        )}
      </div>
    </div>
  );
};
