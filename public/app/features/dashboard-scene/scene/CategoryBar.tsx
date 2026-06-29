import { css, cx } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Button, Icon, useStyles2 } from '@grafana/ui';

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
        const isExpanded = index === selectedCategory;
        return (
          <Button
            className={cx(styles.category, isExpanded && styles.categoryActive)}
            key={category}
            onClick={() => onCategoryChange(index)}
            fill="text"
          >
            {category}
            {count ? ` + ${count}` : ''}
            <Icon className={styles.toggleIcon} name={isExpanded ? 'angle-up' : 'angle-down'} />
          </Button>
        );
      })}
      <Button onClick={onClearAll} fill="text" className={styles.clearButton}>
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
  // GSAI override: brand accent for category tabs (see _gsai-overrides.scss)
  category: css({
    color: '#ff5300',
    textTransform: 'capitalize',
    '&:hover': {
      color: '#ff5300',
    },
  }),
  categoryActive: css({
    color: '#ff5300',
    fontWeight: theme.typography.fontWeightMedium,
    borderBottom: '2px solid #ff5300',
  }),
  // GSAI override: chevron affordance for collapsible categories (narrow screens)
  toggleIcon: css({
    marginLeft: theme.spacing(0.5),
  }),
  // GSAI override: brand-orange text + border for the Clear All button
  clearButton: css({
    color: '#ff5300',
    border: '1px solid #ff5300',
    '&:hover': {
      color: '#ff5300',
    },
  }),
});
