import React, { useEffect, useState } from 'react';

// eslint-disable-next-line no-restricted-imports
import { getTemplateSrv, locationService } from '@grafana/runtime';

import { Button } from '../Button';

import { TableStyles } from './styles';
import { getTimeRange, parseUrlParam } from './timeRange';
import { FilterValues } from './types';
import { getValuesFromSelectedRows, numberWithComas } from './utils';

export interface HeaderActionRowProps {
  itemName?: string;
  actionText?: string;
  exportDataText?: string;
  selectedFlatRows?: any;
  selectedRowIds?: any;
  windowURL?: string;
  tableStyles: TableStyles;
  fields: any[];
}

export const HeaderActionRow = (props: HeaderActionRowProps) => {
  const [showNoRowSelected, setShowNoRowSelected] = useState<boolean>(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const { itemName, actionText, exportDataText, selectedFlatRows, windowURL = '*', tableStyles, fields } = props;
  const noRowSelectedMessage = `Please select at least one ${itemName} to view images`;

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

  const getSelectedFilters = () => {
    const variables = getTemplateSrv().getVariables();
    let factoryLocationVariable: any = {};
    let locationAccessVariable: any[] = [];
    const selectedFilters: FilterValues = {};

    const params = locationService.getSearch();
    const from = parseUrlParam(params?.get('from')!) ?? 'now-24h';
    const to = parseUrlParam(params?.get('to')!) ?? 'now';
    const tr = getTimeRange({ from, to });

    selectedFilters['from'] = { Value: tr.from.toISOString(), Name: 'From' };
    selectedFilters['to'] = { Value: tr.to.toISOString(), Name: 'To' };

    variables.forEach(({ id, current, label, hide, description, name, options }: any) => {
      if (name === 'FactoryLocation') {
        factoryLocationVariable = current || {};
      }
      if (name === 'LocationsAccess') {
        locationAccessVariable = options || [];
      }

      const text = current?.text;
      if (text && !id.includes('Advanced')) {
        selectedFilters[id] = {
          Value: Array.isArray(text) ? text : [text],
          Name: label,
          hide: hide !== 0,
          Description: description,
        };
      }
    });

    const factoryLocationValues = factoryLocationVariable?.value || [];
    if (!factoryLocationValues.includes('$__all')) {
      return selectedFilters;
    }

    const companyUserExists = locationAccessVariable.some((o: any) => o.value === 'NULL');

    if (!companyUserExists) {
      selectedFilters['FactoryLocation'] = {
        ...(selectedFilters['FactoryLocation'] as any || {}),
        Value: locationAccessVariable.filter((o: any) => o.value !== '$__all').map((o: any) => o.value),
      };
    }

    return selectedFilters;
  };

  const onExportDataLinkClick = () => {
    const parentWindow = window.parent || window;
    const selectedFilters = getSelectedFilters();
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
        {selectedFlatRows?.length > 0 && (
          <div>
            {numberWithComas(selectedFlatRows?.length)} {itemName} selected
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
