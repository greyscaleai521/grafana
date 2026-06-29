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
import { isVariableActive, OTHER_CATEGORY, parseVariableCategory } from './categoryFilters';
import { ControlActionsPopover, ControlEditActions } from './ControlActionsPopover';
import { DashboardScene } from './DashboardScene';
import { ExclusiveMultiValueSelect } from './ExclusiveMultiValueSelect';
import { AddVariableButton } from './VariableControlsAddButton';
import { VariableDescriptionTooltip } from './VariableDescriptionTooltip';

// GSAI override (F10 responsive): matches the host left-nav breakpoint (<=768px).
// Below this width, filter categories collapse into accordion tabs.
const NARROW_QUERY = '(max-width: 768px)';

function matchesNarrow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(NARROW_QUERY).matches
    : false;
}

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(matchesNarrow);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Re-read the media query on every event. We listen to BOTH the matchMedia
    // `change` event and the window `resize` event: the latter fires reliably
    // when the viewport is resized for testing / when the embedded iframe is
    // resized, where the `change` event alone can be missed.
    const update = () => setIsNarrow(matchesNarrow());
    update();

    const mql = typeof window.matchMedia === 'function' ? window.matchMedia(NARROW_QUERY) : undefined;
    mql?.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      mql?.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isNarrow;
}

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
  // -1 means "no category expanded" (collapsed). We start collapsed on narrow
  // screens; categories are collapsible via the chevron on every device.
  const [selectedCategory, setSelectedCategory] = useState(() => (matchesNarrow() ? -1 : 0));
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

  // Only act when the viewport actually crosses the breakpoint:
  //  - narrow:  collapse every category
  //  - wide:    re-open the last expanded (or first) category if collapsed
  // Guarding on the previous value keeps this from re-expanding a category the
  // user manually collapsed while staying on the same (large) screen.
  useEffect(() => {
    if (prevNarrowRef.current === isNarrow) {
      return;
    }
    const crossedToNarrow = isNarrow;
    prevNarrowRef.current = isNarrow;
    setSelectedCategory((cur) => {
      if (crossedToNarrow) {
        return -1;
      }
      return cur < 0 ? lastExpandedRef.current : cur;
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

  return (
    <>
      {showCategoryBar && (
        <CategoryBar
          categories={tabs}
          selectedCategory={selectedIndex}
          onCategoryChange={onCategoryChange}
          categoryFilterCounter={categoryFilterCounter}
          onClearAll={onClearAll}
        />
      )}
      {filteredVariables.length > 0 &&
        filteredVariables.map((variable) => (
          <VariableValueSelectWrapper
            key={variable.state.key}
            variable={variable}
            isEditingNewLayouts={isEditingNewLayouts}
          />
        ))}
      {showCategoryBar && filteredVariables.length > 0 && (
        <Button onClick={onClearCategory} fill="text" className={styles.clearButton}>
          {t('dashboard-scene.category-bar.clear', 'Clear')}
        </Button>
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
  const mvState = state as Partial<{ isMulti: boolean; includeAll: boolean }>;
  const useExclusivePicker =
    variable instanceof MultiValueVariable && Boolean(mvState.isMulti) && Boolean(mvState.includeAll);
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
  // F4/F10 — align the per-category Clear button with the filter input row
  // (filters carry a bottom margin and are taller, so the bare button drifted up).
  // GSAI override: brand-orange text + border to match the Clear All button.
  clearButton: css({
    alignSelf: 'center',
    marginBottom: theme.spacing(1),
    color: '#ff5300',
    border: '1px solid #ff5300',
    '&:hover': {
      color: '#ff5300',
    },
  }),
});
