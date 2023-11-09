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
  readOnly?: boolean;
  selectedCategory?: number;
  categories?: any;
}

export const SubMenuItems: FunctionComponent<Props> = ({ variables, readOnly, selectedCategory, categories = [] }) => {
  const optionVariables = variables as VariableWithOptions[];
  const [visibleVariables, setVisibleVariables] = useState<VariableModel[]>([]);

  useEffect(() => {
    let visibleVariables = [];
    if (categories.length && selectedCategory !== undefined) {
      visibleVariables = optionVariables.filter(
        (state) => state.hide !== VariableHide.hideVariable && state.category === categories[selectedCategory]
      );
    } else {
      visibleVariables = optionVariables.filter((state) => state.hide !== VariableHide.hideVariable);
    }
    setVisibleVariables(visibleVariables);
  }, [optionVariables, selectedCategory, categories]);

  function onClearAllFilters(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: any = {};
    const templateSrv = getTemplateSrv();

    optionVariables
      .filter((variable) => variable.hide !== VariableHide.hideVariable)
      .map((variable) => {
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
      <Button className="clearall-btn" onClick={onClearAllFilters} fill={'text'}>
        Clear All
      </Button>
    </>
  );
};

SubMenuItems.displayName = 'SubMenu';
