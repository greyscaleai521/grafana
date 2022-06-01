import React, { FunctionComponent, useEffect, useState } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { getLocationSrv } from '@grafana/runtime';
import { Button } from '@grafana/ui';

import { getTemplateSrv } from '../../../templating/template_srv';
import { ALL_VARIABLE_TEXT } from '../../../variables/constants';
import { PickerRenderer } from '../../../variables/pickers/PickerRenderer';
import { TextBoxVariableModel, VariableHide, VariableModel, VariableWithOptions } from '../../../variables/types';

interface Props {
  variables: VariableModel[];
  filtersExpanded: boolean;
  ExpandFilters: Function;
  readOnly?: boolean;
}

export const SubMenuItems: FunctionComponent<Props> = ({ variables, filtersExpanded, ExpandFilters, readOnly }) => {
  const modelVariable = variables as VariableWithOptions[];
  const [visibleVariables, setVisibleVariables] = useState<VariableModel[]>([]);
  let advanceFilters = modelVariable.filter(
    (vairable) => vairable.id.toLowerCase().startsWith('advanced') && !isDefault(vairable)
  ).length;

  useEffect(() => {
    setVisibleVariables(
      modelVariable.filter(
        (state) =>
          state.hide !== VariableHide.hideVariable &&
          (filtersExpanded || !state.id.toLowerCase().startsWith('advanced'))
      )
    );
  }, [modelVariable, filtersExpanded]);

  function isDefault(filter: VariableWithOptions) {
    return filter.current.value.toString() === '' || filter.current.value.toString() === '$__all' ? true : false;
  }
  function ChildFilters() {
    event?.preventDefault();
    ExpandFilters();
  }
  function onClearAllFilters(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: any = {};
    const templateSrv = getTemplateSrv();

    modelVariable.map((variable) => {
      const variableName = `var-${variable.id}`;
      let allValue = templateSrv.getAllValue(variable);
      if (allValue === ALL_VARIABLE_TEXT) {
        updateQuery[variableName] = allValue;
      } else {
        let variableAsText = variable as TextBoxVariableModel;
        if (variableAsText) {
          updateQuery[variableName] = variableAsText.originalQuery;
        }
      }
    });

    getLocationSrv().update({
      query: updateQuery,
      partial: true,
      replace: true,
    });
  }

  if (visibleVariables.length === 0) {
    return null;
  }

  return (
    <>
      {visibleVariables.map((variable) => {
        return (
          <div
            key={variable.id}
            className="submenu-item gf-form-inline"
            data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
          >
            <PickerRenderer variable={variable} readOnly={readOnly} />
          </div>
        );
      })}
      {!filtersExpanded && advanceFilters > 0 && (
        <Button className="FilterCounter" onClick={ChildFilters} fill={'text'}>
          + {advanceFilters} Filters Applied
        </Button>
      )}
      <Button className="clearall-btn" onClick={onClearAllFilters} fill={'text'}>
        Clear All
      </Button>
    </>
  );
};

SubMenuItems.displayName = 'SubMenu';
