import React, { FunctionComponent, useEffect, useState } from 'react';
import { TextBoxVariableModel, VariableHide, VariableModel } from '../../../variables/types';
import { selectors } from '@grafana/e2e-selectors';
import { PickerRenderer } from '../../../variables/pickers/PickerRenderer';
import { ALL_VARIABLE_TEXT } from '../../../variables/state/types';
import { getLocationSrv } from '@grafana/runtime';
import { getTemplateSrv } from '../../../templating/template_srv';
import { Button } from '@grafana/ui';

interface Props {
  variables: VariableModel[];
}

export const SubMenuItems: FunctionComponent<Props> = ({ variables }) => {
  const [visibleVariables, setVisibleVariables] = useState<VariableModel[]>([]);

  useEffect(() => {
    setVisibleVariables(variables.filter((state) => state.hide !== VariableHide.hideVariable));
  }, [variables]);

  function onClearAllFilters(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: any = {};
    const templateSrv = getTemplateSrv();

    visibleVariables.map((variable) => {
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
            <PickerRenderer variable={variable} />
          </div>
        );
      })}

      <Button className="clearall-btn" onClick={onClearAllFilters} fill={'text'}>
        Clear All
      </Button>
    </>
  );
};

SubMenuItems.displayName = 'SubMenu';
