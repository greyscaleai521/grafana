import { css, cx } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Button, useStyles2 } from '@grafana/ui';

interface CategoryBarProps {
  /** Tab names in display order (may include the synthetic "Other"). */
  categories: string[];
  selectedCategory: number;
  onCategoryChange: (index: number) => void;
  /** Count of non-default filters per category name. */
  categoryFilterCounter: Record<string, number>;
  onClearAll: () => void;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryFilterCounter,
  onClearAll,
}: CategoryBarProps) {
  const styles = useStyles2(getStyles);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {categories.map((category, index) => {
        const count = categoryFilterCounter[category];
        return (
          <Button
            className={cx(styles.category, index === selectedCategory && styles.categoryActive)}
            key={category}
            onClick={() => onCategoryChange(index)}
            fill="text"
          >
            {category}
            {count ? ` + ${count}` : ''}
          </Button>
        );
      })}
      <Button onClick={onClearAll} fill="text">
        {t('dashboard-scene.category-bar.clear-all', 'Clear All')}
      </Button>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexBasis: '100%',
    marginBottom: theme.spacing(1),
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
