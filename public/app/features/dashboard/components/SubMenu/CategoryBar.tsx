import React, { FC } from 'react';

import { TextBoxVariableModel, VariableWithOptions } from '@grafana/data';
import { getLocationSrv } from '@grafana/runtime';
import { VariableHide } from '@grafana/schema';
import { Button, Icon } from '@grafana/ui';
import { ALL_VARIABLE_TEXT } from 'app/features/variables/constants';

import { getTemplateSrv } from '../../../templating/template_srv';
import { VariableModel } from '../../../variables/types';

function splitCategoryLabel(category: string) {
  const spaceIndex = category.indexOf(' ');

  if (spaceIndex === -1) {
    return null;
  }

  return {
    line1: category.slice(0, spaceIndex),
    line2: category.slice(spaceIndex + 1),
  };
}

const COMPACT_SECOND_LINE: Record<string, string> = {
  Parameters: 'Params',
};

function renderCategoryLabel(category: string, counterText?: string) {
  const splitLabel = splitCategoryLabel(category);

  if (!splitLabel) {
    return (
      <>
        <span className="FilterCategoryLabel-full">
          {category}
          {counterText}
        </span>
        <span className="FilterCategoryLabel-compact">
          <span className="FilterCategoryLabel-line">{category}</span>
          {counterText ? <span className="FilterCategoryLabel-line">{counterText}</span> : null}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="FilterCategoryLabel-full">
        {category}
        {counterText}
      </span>
      <span className="FilterCategoryLabel-compact">
        <span className="FilterCategoryLabel-line">{splitLabel.line1}</span>
        <span className="FilterCategoryLabel-line">
          {COMPACT_SECOND_LINE[splitLabel.line2] ?? splitLabel.line2}
          {counterText}
        </span>
      </span>
    </>
  );
}

export interface Props {
  categories: string[];
  onCategoryChange: Function;
  selecedCategory: number;
  categoryFilterCounter?: Record<string, number>;
  variables: VariableModel[];
  isSmallViewport?: boolean;
  expandedCategory?: number | null;
  onCategoryToggle?: (index: number) => void;
}

export const CategoryBar: FC<Props> = ({
  categories,
  onCategoryChange,
  selecedCategory,
  categoryFilterCounter,
  variables,
  isSmallViewport,
  expandedCategory,
  onCategoryToggle,
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
        const isExpanded = expandedCategory === index;
        const counterText =
          categoryFilterCounter && categoryFilterCounter[category] ? `+ ${categoryFilterCounter[category]}` : '';

        return (
          <Button
            className={'FilterCategory' + (index === selecedCategory ? ' FilterCategoryActive' : '')}
            key={index}
            onClick={() => onCategoryChange(index)}
            fill={'text'}
          >
            {renderCategoryLabel(category, counterText)}
            {isSmallViewport && onCategoryToggle && (
              <Icon
                name={isExpanded ? 'angle-up' : 'angle-down'}
                className="FilterCategoryToggleIcon"
                onClick={(event) => {
                  event.stopPropagation();
                  onCategoryToggle(index);
                }}
              />
            )}
          </Button>
        );
      })}
      <Button className="clearall-btn" onClick={onClearAllFilters} fill={'text'}>
        <span className="FilterCategoryLabel-full">Clear All</span>
        <span className="FilterCategoryLabel-compact">
          <span className="FilterCategoryLabel-line">Clear</span>
          <span className="FilterCategoryLabel-line">All</span>
        </span>
      </Button>
    </div>
  );
};
