import { css } from '@emotion/css';
import { type MouseEvent, useEffect, useState } from 'react';

import { type GrafanaTheme2, type TypedVariableModel, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { locationService } from '@grafana/runtime';
import { Button, useStyles2 } from '@grafana/ui';
import { ALL_VARIABLE_TEXT } from 'app/features/variables/constants';

import { getTemplateSrv } from '../../../templating/template_srv';
import { PickerRenderer } from '../../../variables/pickers/PickerRenderer';

interface Props {
  variables: TypedVariableModel[];
  readOnly?: boolean;
  selectedCategory?: number;
  categories?: string[];
}

export const SubMenuItems = ({ variables, readOnly, selectedCategory, categories = [] }: Props) => {
  const [visibleVariables, setVisibleVariables] = useState<TypedVariableModel[]>([]);
  const styles = useStyles2(getStyles);

  // Derive a stable (by-value) category name; depending on the `categories` array
  // reference directly would loop because the `categories = []` default is a new ref each render.
  const selectedCategoryName =
    categories.length > 0 && selectedCategory !== undefined ? categories[selectedCategory] : undefined;

  useEffect(() => {
    if (selectedCategoryName !== undefined) {
      setVisibleVariables(
        variables.filter((state) => state.hide !== VariableHide.hideVariable && state.category === selectedCategoryName)
      );
    } else {
      setVisibleVariables(variables.filter((state) => state.hide !== VariableHide.hideVariable));
    }
  }, [variables, selectedCategoryName]);

  function onClearCategoryFilters(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const updateQuery: Record<string, string> = {};
    const templateSrv = getTemplateSrv();

    variables
      .filter((variable) => {
        if (selectedCategoryName !== undefined) {
          return variable.hide !== VariableHide.hideVariable && variable.category === selectedCategoryName;
        }
        return variable.hide !== VariableHide.hideVariable;
      })
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

  if (visibleVariables.length === 0) {
    return null;
  }

  return (
    <>
      {visibleVariables.map((variable) => (
        <div
          key={variable.id}
          className={styles.submenuItem}
          data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
        >
          <PickerRenderer variable={variable} readOnly={readOnly} />
        </div>
      ))}
      <Button onClick={onClearCategoryFilters} fill="text">
        {t('dashboard.sub-menu-items.clear', 'Clear')}
      </Button>
    </>
  );
};

SubMenuItems.displayName = 'SubMenu';

const getStyles = (theme: GrafanaTheme2) => ({
  submenuItem: css({
    display: 'inline-block',

    '.fa-caret-down': {
      fontSize: '75%',
      paddingLeft: theme.spacing(1),
    },

    '.gf-form': {
      marginBottom: 0,
    },
  }),
});
