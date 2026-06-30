import { css, cx } from '@emotion/css';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';

import { type GrafanaTheme2, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { config, reportInteraction } from '@grafana/runtime';
import {
  ControlsLabel,
  type ControlsLayout,
  MultiValueVariable,
  sceneGraph,
  sceneUtils,
  type SceneVariable,
  type SceneVariables,
  SceneVariableSet,
  type SceneVariableState,
  SceneVariableValueChangedEvent,
  useSceneObjectState,
} from '@grafana/scenes';
import { Button, useElementSelection, useStyles2 } from '@grafana/ui';

import { dashboardEditActions } from '../edit-pane/shared';
import {
  getValidationConfigSnapshot,
  subscribeToValidationPatterns,
} from '../serialization/custom-variables/validationPatternRegistry';
import { clearVariableToDefault } from '../serialization/custom-variables/variableDefaultsRegistry';
import { filterSectionRepeatLocalVariables } from '../variables/utils';

import { CategoryBar } from './CategoryBar';
import { ControlActionsPopover, ControlEditActions } from './ControlActionsPopover';
import { DashboardScene } from './DashboardScene';
import { ExclusiveMultiValueSelect } from './ExclusiveMultiValueSelect';
import { AddVariableButton } from './VariableControlsAddButton';
import { VariableDescriptionTooltip } from './VariableDescriptionTooltip';
import { isVariableActive, OTHER_CATEGORY, parseVariableCategory } from './categoryFilters';
import { useIsNarrow } from './useIsNarrow';

export function VariableControls({ dashboard }: { dashboard: DashboardScene }) {
  const styles = useStyles2(getStyles);
  const { variables } = sceneGraph.getVariables(dashboard)!.useState();
  const { isEditing } = dashboard.useState();
  const isEditingNewLayouts = isEditing && config.featureToggles.dashboardNewLayouts;
  const isNarrow = useIsNarrow();

  // Host-supplied default-value config (drives the non-default counter).
  const filterConfig = useSyncExternalStore(
    subscribeToValidationPatterns,
    getValidationConfigSnapshot,
    getValidationConfigSnapshot
  );

  // Recompute the per-category counter when any variable value changes (the
  // variable set only re-renders us on add/remove, not on value change).
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  // -1 means "no category expanded" (collapsed). The first category is open by
  // default on every device (incl. mobile, where filters live in the Filters
  // drawer); categories remain collapsible via the chevron.
  const [selectedCategory, setSelectedCategory] = useState(0);
  // Remember the last expanded category so we can restore it when the viewport
  // grows back above the breakpoint.
  const lastExpandedRef = useRef(selectedCategory >= 0 ? selectedCategory : 0);
  // Track the previous breakpoint so the effect below only reacts to a REAL
  // narrow<->wide crossing and never re-expands a category the user just
  // collapsed on a stable (large) screen.
  const prevNarrowRef = useRef(isNarrow);

  // Subscribe to variable value changes to track interactions
  useEffect(() => {
    const subscription = dashboard.subscribeToEvent(SceneVariableValueChangedEvent, () => {
      reportInteraction('grafana_dashboards_variable_changed');
      forceRender();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dashboard]);

  // Keep track of the last expanded category (for restoring on viewport grow).
  useEffect(() => {
    if (selectedCategory >= 0) {
      lastExpandedRef.current = selectedCategory;
    }
  }, [selectedCategory]);

  // Only act when the viewport actually crosses the breakpoint. In both
  // directions we keep an expanded category: if nothing is open, open the first
  // (narrow) or the last-expanded/first (wide). Guarding on the previous value
  // keeps this from re-expanding a category the user manually collapsed while
  // staying on the same screen.
  useEffect(() => {
    if (prevNarrowRef.current === isNarrow) {
      return;
    }
    const crossedToNarrow = isNarrow;
    prevNarrowRef.current = isNarrow;
    setSelectedCategory((cur) => {
      if (cur >= 0) {
        return cur;
      }
      return crossedToNarrow ? 0 : lastExpandedRef.current;
    });
  }, [isNarrow]);

  const visibleVariables = variables.filter(
    (v: SceneVariable) =>
      v.state.hide !== VariableHide.inControlsMenu &&
      (v.state.hide !== VariableHide.hideVariable || v.UNSAFE_renderAsHidden)
  );

  const adHocVar = visibleVariables.find((v) => sceneUtils.isAdHocVariable(v));
  const groupByVar = visibleVariables.find((v) => sceneUtils.isGroupByVariable(v));

  const restVariables = visibleVariables.filter(
    (v) => v.state.name !== adHocVar?.state.name && v.state.name !== groupByVar?.state.name
  );

  const hasDrilldownControls = config.featureToggles.dashboardAdHocAndGroupByWrapper && adHocVar && groupByVar;
  const variablesToRender = hasDrilldownControls ? restVariables : visibleVariables;

  // F4 — derive category tabs from each variable's `description`.
  const parsed = variablesToRender.map((variable) => ({
    variable,
    category: parseVariableCategory(variable.state.description).category,
  }));

  const categories: string[] = [];
  for (const { category } of parsed) {
    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  }
  const hasUncategorized = parsed.some(({ category }) => !category);
  const showCategoryBar = categories.length > 0;
  const tabs = hasUncategorized ? [...categories, OTHER_CATEGORY] : categories;
  const selectedIndex = showCategoryBar
    ? selectedCategory < 0
      ? -1
      : Math.min(selectedCategory, tabs.length - 1)
    : 0;
  const selectedTab = selectedIndex >= 0 ? tabs[selectedIndex] : undefined;

  // Chevron accordion on every device: clicking the expanded category collapses
  // it, clicking another expands that one. Compare against the visible (clamped)
  // index so the currently-open tab always toggles shut.
  const onCategoryChange = (index: number) =>
    setSelectedCategory((cur) => {
      const curVisible = cur < 0 ? -1 : Math.min(cur, tabs.length - 1);
      return curVisible === index ? -1 : index;
    });

  const filteredVariables = !showCategoryBar
    ? variablesToRender
    : selectedTab === undefined
      ? []
      : parsed
          .filter(({ category }) => (selectedTab === OTHER_CATEGORY ? !category : category === selectedTab))
          .map(({ variable }) => variable);

  const categoryFilterCounter: Record<string, number> = {};
  if (showCategoryBar) {
    for (const { variable, category } of parsed) {
      if (isVariableActive(variable, filterConfig)) {
        const tab = category ?? OTHER_CATEGORY;
        categoryFilterCounter[tab] = (categoryFilterCounter[tab] ?? 0) + 1;
      }
    }
  }

  const onClearAll = () => variablesToRender.forEach(clearVariableToDefault);
  const onClearCategory = () => filteredVariables.forEach(clearVariableToDefault);

  const filterControls =
    filteredVariables.length > 0
      ? filteredVariables.map((variable) => (
          <VariableValueSelectWrapper
            key={variable.state.key}
            variable={variable}
            isEditingNewLayouts={isEditingNewLayouts}
          />
        ))
      : null;

  const clearCategoryButton =
    showCategoryBar && filteredVariables.length > 0 ? (
      isNarrow ? (
        <div className={styles.clearActionsRow}>
          <Button
            onClick={onClearCategory}
            fill="text"
            className={cx(styles.clearButton, styles.clearButtonProminent)}
          >
            {t('dashboard-scene.category-bar.clear', 'Clear')}
          </Button>
        </div>
      ) : (
        <Button onClick={onClearCategory} fill="text" className={styles.clearButton}>
          {t('dashboard-scene.category-bar.clear', 'Clear')}
        </Button>
      )
    ) : null;

  // Mobile true accordion: filters + Clear nest under the open category row.
  const narrowExpandedContent =
    isNarrow && filteredVariables.length > 0 ? (
      <div className={styles.expandedFilters}>
        {filterControls}
        {clearCategoryButton}
      </div>
    ) : undefined;

  return (
    <>
      {showCategoryBar && (
        <CategoryBar
          categories={tabs}
          selectedCategory={selectedIndex}
          onCategoryChange={onCategoryChange}
          categoryFilterCounter={categoryFilterCounter}
          onClearAll={onClearAll}
          isNarrow={isNarrow}
          expandedContent={narrowExpandedContent}
        />
      )}
      {/* Desktop (and uncategorized): filters stay below the category strip. */}
      {!(isNarrow && showCategoryBar) && filterControls}
      {!(isNarrow && showCategoryBar) && clearCategoryButton}
      {/* Mobile: Clear All always at the bottom of the Filters drawer list. */}
      {showCategoryBar && isNarrow && (
        <div className={styles.clearActionsRow}>
          <Button onClick={onClearAll} fill="text" className={cx(styles.clearButton, styles.clearButtonProminent)}>
            {t('dashboard-scene.category-bar.clear-all', 'Clear All')}
          </Button>
        </div>
      )}
      {config.featureToggles.dashboardNewLayouts ? <AddVariableButton dashboard={dashboard} /> : null}
    </>
  );
}

interface VariableSelectProps {
  variable: SceneVariable;
  inMenu?: boolean;
  isEditingNewLayouts?: boolean;
}

export function VariableValueSelectWrapper({ variable, inMenu, isEditingNewLayouts }: VariableSelectProps) {
  const styles = useStyles2(getStyles);
  const state = useSceneObjectState<SceneVariableState>(variable, { shouldActivateOrKeepAlive: true });
  const { isSelected, isSelectable } = useElementSelection(variable.state.key);
  const isHidden = state.hide === VariableHide.hideVariable;

  const onClickEditVariable = useCallback(() => {
    const dashboard = sceneGraph.getAncestor(variable, DashboardScene);
    dashboard.state.editPane.selectObject(variable, variable.state.key!);
  }, [variable]);

  const onClickDeleteVariable = useCallback(() => {
    const set = variable.parent;
    if (set instanceof SceneVariableSet) {
      dashboardEditActions.removeVariable({ source: set, removedObject: variable });
    }
  }, [variable]);

  const editActions = useMemo(
    () => <ControlEditActions onClickEdit={onClickEditVariable} onClickDelete={onClickDeleteVariable} />,
    [onClickDeleteVariable, onClickEditVariable]
  );

  // GSAI override (F8): multi-value variables with an "All" option use a picker
  // that keeps "All" and individual items mutually exclusive live in the menu.
  const useExclusivePicker =
    variable instanceof MultiValueVariable &&
    Boolean(variable.state.isMulti) &&
    Boolean(variable.state.includeAll);
  const picker = useExclusivePicker ? (
    <ExclusiveMultiValueSelect model={variable} />
  ) : (
    <variable.Component model={variable} />
  );

  // UNSAFE_renderAsHidden variables (like ScopesVariable) should always render invisibly
  if (isHidden && variable.UNSAFE_renderAsHidden) {
    return <variable.Component model={variable} />;
  }

  if (isHidden && !isEditingNewLayouts) {
    return null;
  }

  // For switch variables in menu, we want to show the switch on the left and the label on the right
  if (inMenu && sceneUtils.isSwitchVariable(variable)) {
    return (
      <ControlActionsPopover isEditable={Boolean(isSelectable)} content={editActions}>
        <div
          className={cx(
            styles.switchMenuContainer,
            isSelected && 'dashboard-selected-element',
            isSelectable && !isSelected && 'dashboard-selectable-element'
          )}
          data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
        >
          <div className={styles.switchControl}>
            <variable.Component model={variable} />
          </div>
          <VariableLabel
            variable={variable}
            layout={'vertical'}
            className={cx(isSelectable && styles.labelSelectable, styles.switchLabel)}
          />
        </div>
      </ControlActionsPopover>
    );
  }

  if (inMenu) {
    return (
      <ControlActionsPopover isEditable={Boolean(isSelectable)} content={editActions}>
        <div
          className={cx(
            styles.verticalContainer,
            isSelected && 'dashboard-selected-element',
            isSelectable && !isSelected && 'dashboard-selectable-element'
          )}
          data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
        >
          <VariableLabel
            variable={variable}
            layout={'vertical'}
            className={cx(isSelectable && styles.labelSelectable)}
          />
          {picker}
        </div>
      </ControlActionsPopover>
    );
  }

  return (
    <ControlActionsPopover isEditable={Boolean(isSelectable)} content={editActions}>
      <div
        className={cx(
          styles.container,
          isSelected && 'dashboard-selected-element',
          isSelectable && !isSelected && 'dashboard-selectable-element'
        )}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
      >
        <VariableLabel variable={variable} className={cx(isSelectable && styles.labelSelectable, styles.label)} />
        {picker}
      </div>
    </ControlActionsPopover>
  );
}

function VariableLabel({
  variable,
  className,
  layout,
}: {
  variable: SceneVariable;
  className?: string;
  layout?: ControlsLayout;
}) {
  const { state } = variable;
  const elementId = `var-${state.key}`;

  if (variable.state.hide === VariableHide.hideLabel) {
    return null;
  }

  const labelOrName = state.label || state.name;
  const controlsLayout = layout ?? 'horizontal';
  // F4 — the description may encode the category before an `@info:` token; only
  // the part after it (if any) is shown in the tooltip.
  const { info } = parseVariableCategory(state.description);
  const descriptionSuffix = info ? (
    <VariableDescriptionTooltip description={info} placement={controlsLayout === 'vertical' ? 'top' : 'bottom'} />
  ) : undefined;

  return (
    <ControlsLabel
      htmlFor={elementId}
      isLoading={state.loading}
      onCancel={() => variable.onCancel?.()}
      label={labelOrName}
      error={state.error}
      layout={controlsLayout}
      description={undefined}
      suffix={descriptionSuffix}
      className={className}
    />
  );
}

export function SectionVariableControls({ variableSet }: { variableSet: SceneVariables }) {
  const { variables } = variableSet.useState();
  const styles = useStyles2(getSectionVariableStyles);

  const visibleVariables = filterSectionRepeatLocalVariables(variables, variableSet).filter(
    (v) => v.state.hide !== VariableHide.hideVariable
  );

  if (visibleVariables.length === 0) {
    return null;
  }

  return (
    <div className={styles.sectionVariables}>
      {visibleVariables.map((variable) => (
        <VariableValueSelectWrapper key={variable.state.key} variable={variable} />
      ))}
    </div>
  );
}

const getSectionVariableStyles = (theme: GrafanaTheme2) => ({
  sectionVariables: css({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
});

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    // No border for second element (inputs) as label and input border is shared
    '> :nth-child(2)': css({
      borderTopLeftRadius: 'unset',
      borderBottomLeftRadius: 'unset',
    }),
    marginBottom: theme.spacing(1),
    marginRight: theme.spacing(1),
  }),
  verticalContainer: css({
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1),
  }),
  switchMenuContainer: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
  }),
  switchControl: css({
    '& > div': {
      border: 'none',
      background: 'transparent',
      paddingRight: theme.spacing(0.5),
      height: theme.spacing(2),
    },
  }),
  switchLabel: css({
    marginTop: 0,
    marginBottom: 0,
  }),
  labelSelectable: css({
    cursor: 'pointer',
  }),
  label: css({
    display: 'flex',
    alignItems: 'center',
  }),
  // GSAI override (mobile): filters nest under the open category in the accordion.
  expandedFilters: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    width: '100%',
    padding: theme.spacing(1, 0.5, 0.5),
    boxSizing: 'border-box',
  }),
  // F4/F10 — align the per-category Clear button with the filter input row
  // (filters carry a bottom margin and are taller, so the bare button drifted up).
  // GSAI override: black text + neutral border; hover uses the host left-nav
  // tint, matching the category tabs and Clear All.
  clearButton: css({
    alignSelf: 'center',
    marginBottom: theme.spacing(1),
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.medium}`,
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      boxShadow: 'none',
    },
  }),
  // GSAI override (mobile): pin Clear / Clear All to their own centered row
  // under the filters (flex parent wraps variables).
  clearActionsRow: css({
    flexBasis: '100%',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(1),
  }),
  // GSAI override (mobile): make Clear / Clear All stand out from category
  // rows and filter inputs (stronger border, solid surface, weight).
  clearButtonProminent: css({
    marginBottom: 0,
    minWidth: theme.spacing(12),
    justifyContent: 'center',
    fontWeight: theme.typography.fontWeightMedium,
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.strong}`,
    boxShadow: theme.shadows.z1,
    '&:hover, &:focus, &:focus-visible, &:active': {
      color: theme.colors.text.primary,
      backgroundColor: 'rgba(241, 91, 42, 0.06)',
      border: `1px solid ${theme.colors.border.strong}`,
      boxShadow: theme.shadows.z1,
    },
  }),
});
