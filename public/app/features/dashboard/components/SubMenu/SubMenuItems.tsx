import React, { useEffect, useState } from 'react';

import { TypedVariableModel, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { getLocationSrv } from '@grafana/runtime';
import { Button } from '@grafana/ui';

import { getTemplateSrv } from '../../../templating/template_srv';
import { ALL_VARIABLE_TEXT } from '../../../variables/constants';
import { PickerRenderer } from '../../../variables/pickers/PickerRenderer';
import { TextBoxVariableModel } from '../../../variables/types';

interface Props {
  variables: TypedVariableModel[];
  readOnly?: boolean;
  selectedCategory?: number;
  categories?: any;
}

export const SubMenuItems = ({ variables, readOnly, selectedCategory, categories = [] }: Props) => {
  const optionVariables = variables as TypedVariableModel[];
  const [visibleVariables, setVisibleVariables] = useState<TypedVariableModel[]>([]);

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

  function onClearCategoryFilters(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: any = {};
    const templateSrv = getTemplateSrv();

    optionVariables
      .filter((variable) => {
        if (categories.length && selectedCategory !== undefined) {
          return variable.hide !== VariableHide.hideVariable && variable.category === categories[selectedCategory];
        } else {
          return variable.hide !== VariableHide.hideVariable;
        }
      })
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
      {visibleVariables.map((variable) => (
        <div
          key={variable.id}
          className="submenu-item gf-form-inline"
          data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
        >
          <PickerRenderer variable={variable} readOnly={readOnly} />
        </div>
      ))}
      <Button className="clearall-btn" onClick={onClearCategoryFilters} fill={'text'}>
        Clear
      </Button>
    </>
  );
};

SubMenuItems.displayName = 'SubMenu';
