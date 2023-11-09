import React, { FC } from 'react';

import { Button } from '@grafana/ui';

export interface Props {
  categories: string[];
  onCategoryChange: Function;
  selecedCategory: number;
  categoryFilterCounter?: Record<string, number>;
}

export const CategoryBar: FC<Props> = ({ categories, onCategoryChange, selecedCategory, categoryFilterCounter }) => {
  if (!categories.length) {
    return null;
  }
  return (
    <>
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
    </>
  );
};
