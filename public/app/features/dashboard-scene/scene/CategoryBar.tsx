import { css, cx } from '@emotion/css';
import { type ReactNode } from 'react';

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
  /** Mobile Filters drawer: stack categories as full-width rows. */
  isNarrow?: boolean;
  /**
   * Mobile true-accordion body: rendered directly under the expanded category
   * row (filters + per-category Clear). Desktop ignores this.
   */
  expandedContent?: ReactNode;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryFilterCounter,
  onClearAll,
  isNarrow = false,
  expandedContent,
}: CategoryBarProps) {
  const styles = useStyles2(getStyles);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className={cx(styles.container, isNarrow && styles.containerNarrow)}>
      {categories.map((category, index) => {
        const count = categoryFilterCounter[category];
        const isExpanded = index === selectedCategory;
        const label = (
          <>
            {category}
            {count ? ` + ${count}` : ''}
            <Icon className={styles.toggleIcon} name={isExpanded ? 'angle-up' : 'angle-down'} />
          </>
        );

        return (
          <div key={category} className={isNarrow ? styles.section : undefined}>
            {/* Narrow: plain <button> avoids Grafana Button's fixed height +
                overflow:hidden, which cropped category labels. */}
            {isNarrow ? (
              <button
                type="button"
                className={cx(styles.categoryNarrow, isExpanded && styles.categoryNarrowActive)}
                onClick={() => onCategoryChange(index)}
              >
                {label}
              </button>
            ) : (
              <Button
                className={cx(styles.category, isExpanded && styles.categoryActive)}
                onClick={() => onCategoryChange(index)}
                fill="text"
              >
                {label}
              </Button>
            )}
            {isNarrow && isExpanded && expandedContent}
          </div>
        );
      })}
      {/* Desktop: Clear All stays in the category strip. Mobile: rendered at the
          bottom of VariableControls so it sits below the accordion. */}
      {!isNarrow && (
        <Button onClick={onClearAll} fill="text" className={styles.clearButton}>
          {t('dashboard-scene.category-bar.clear-all', 'Clear All')}
        </Button>
      )}
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
  // GSAI override (mobile): one category per full-width row with dividers.
  containerNarrow: css({
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 0,
    borderTop: `1px solid ${theme.colors.border.medium}`,
    borderBottom: `1px solid ${theme.colors.border.medium}`,
    marginBottom: theme.spacing(1.5),
  }),
  section: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderBottom: `1px solid ${theme.colors.border.medium}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  }),
  // GSAI override: inactive category tabs are grey; selected is black (no
  // brand-orange accent / underline). Hover + selection use the host left-nav
  // hover background (rgba(241, 91, 42, 0.06)).
  category: css({
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      boxShadow: 'none',
    },
  }),
  categoryActive: css({
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeightMedium,
    backgroundColor: 'rgba(241, 91, 42, 0.06)',
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      boxShadow: 'none',
    },
  }),
  // GSAI override (mobile): full-width hit target, centered label + chevron.
  // Plain button (not Grafana Button) so fixed height / overflow can't crop text.
  categoryNarrow: css({
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    margin: 0,
    cursor: 'pointer',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightRegular,
    lineHeight: theme.typography.body.lineHeight,
    textTransform: 'capitalize',
    color: theme.colors.text.secondary,
    padding: theme.spacing(2.5, 1),
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      outline: 'none',
    },
  }),
  categoryNarrowActive: css({
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeightMedium,
    backgroundColor: 'rgba(241, 91, 42, 0.06)',
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
    },
  }),
  // GSAI override: chevron affordance for collapsible categories (narrow screens)
  toggleIcon: css({
    marginLeft: theme.spacing(0.5),
    flexShrink: 0,
  }),
  // GSAI override: black text with a neutral border; hover uses the host
  // left-nav tint, matching the category tabs.
  clearButton: css({
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.medium}`,
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      boxShadow: 'none',
    },
  }),
});
