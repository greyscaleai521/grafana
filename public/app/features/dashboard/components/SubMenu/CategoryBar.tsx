import { css, cx } from '@emotion/css';
import { type MouseEvent } from 'react';

import { type GrafanaTheme2, type TypedVariableModel, VariableHide } from '@grafana/data';
import { t } from '@grafana/i18n';
import { locationService } from '@grafana/runtime';
import { Button, useStyles2 } from '@grafana/ui';
import { ALL_VARIABLE_TEXT } from 'app/features/variables/constants';

import { getTemplateSrv } from '../../../templating/template_srv';

export interface Props {
  categories: string[];
  onCategoryChange: (index: number) => void;
  selecedCategory: number;
  categoryFilterCounter?: Record<string, number>;
  variables: TypedVariableModel[];
}

export const CategoryBar = ({
  categories,
  onCategoryChange,
  selecedCategory,
  categoryFilterCounter,
  variables,
}: Props) => {
  const styles = useStyles2(getStyles);

  if (!categories.length) {
    return null;
  }

  function onClearAllFilters(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: Record<string, string> = {};
    const templateSrv = getTemplateSrv();

    variables
      .filter((variable) => variable.hide !== VariableHide.hideVariable)
      .forEach((variable) => {
        const variableName = `var-${variable.id}`;
        const allValue = templateSrv.getAllValue(variable);
        if (allValue === ALL_VARIABLE_TEXT) {
          updateQuery[variableName] = allValue;
        } else if ('originalQuery' in variable) {
          updateQuery[variableName] = variable.originalQuery ?? '';
        }
      });

    locationService.partial(updateQuery, true);
  }

  return (
    <div className={styles.container}>
      {categories.map((category: string, index: number) => (
        <Button
          className={cx(styles.category, index === selecedCategory && styles.categoryActive)}
          key={index}
          onClick={() => onCategoryChange(index)}
          fill="text"
        >
          {category}{' '}
          {categoryFilterCounter && categoryFilterCounter[category] ? `+ ${categoryFilterCounter[category]}` : ''}
        </Button>
      ))}
      <Button onClick={onClearAllFilters} fill="text">
        {t('dashboard.category-bar.clear-all', 'Clear All')}
      </Button>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  category: css({
    color: theme.colors.text.secondary,
  }),
  categoryActive: css({
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeightMedium,
    borderBottom: `2px solid ${theme.colors.primary.border}`,
  }),
});
