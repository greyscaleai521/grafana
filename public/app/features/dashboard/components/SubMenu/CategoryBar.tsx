import React, { FC } from 'react';

import { TextBoxVariableModel, VariableWithOptions } from '@grafana/data';
import { getLocationSrv } from '@grafana/runtime';
import { VariableHide } from '@grafana/schema';
import { Button } from '@grafana/ui';
import { ALL_VARIABLE_TEXT } from 'app/features/variables/constants';

import { getTemplateSrv } from '../../../templating/template_srv';
import { VariableModel } from '../../../variables/types';

export interface Props {
  categories: string[];
  onCategoryChange: Function;
  selecedCategory: number;
  categoryFilterCounter?: Record<string, number>;
  variables: VariableModel[];
}

export const CategoryBar: FC<Props> = ({
  categories,
  onCategoryChange,
  selecedCategory,
  categoryFilterCounter,
  variables,
}) => {
  const optionVariables = variables as VariableWithOptions[];
  if (!categories.length) {
    return null;
  }

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
  return (
    <div>
      {categories.map((category: string, index: number) => {
        return (
          <Button
            className={'FilterCategory' + (index === selecedCategory ? ' FilterCategoryActive' : '')}
            key={index}
            onClick={() => onCategoryChange(index)}
            fill={'text'}
          >
            {category}{' '}
            {categoryFilterCounter && categoryFilterCounter[category] ? `+ ${categoryFilterCounter[category]}` : ''}
          </Button>
        );
      })}
      <Button className="clearall-btn" onClick={onClearAllFilters} fill={'text'}>
        Clear All
      </Button>
    </div>
  );
};
