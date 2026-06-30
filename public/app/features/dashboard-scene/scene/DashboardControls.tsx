import { css, cx } from '@emotion/css';
import { useEffect, useState } from 'react';
import Skeleton from 'react-loading-skeleton';

import { type GrafanaTheme2, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';
import { config, reportInteraction } from '@grafana/runtime';
import {
  type SceneObjectState,
  SceneObjectBase,
  type SceneComponentProps,
  SceneTimePicker,
  SceneRefreshPicker,
  SceneDebugger,
  VariableDependencyConfig,
  sceneGraph,
  SceneObjectUrlSyncConfig,
  type SceneObjectUrlValues,
  type CancelActivationHandler,
  sceneUtils,
} from '@grafana/scenes';
import { Box, Button, ButtonGroup, Drawer, Icon, ToolbarButton, useStyles2 } from '@grafana/ui';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { contextSrv } from 'app/core/services/context_srv';
import { playlistSrv } from 'app/features/playlist/PlaylistSrv';
import { ContextualNavigationPaneToggle } from 'app/features/scopes/dashboards/ContextualNavigationPaneToggle';
import { KioskMode } from 'app/types/dashboard';

import { PanelEditControls } from '../panel-edit/PanelEditControls';
import { getDashboardSceneFor } from '../utils/utils';

import { DashboardDataLayerControls } from './DashboardDataLayerControls';
import { DashboardLinksControls } from './DashboardLinksControls';
import { type DashboardScene } from './DashboardScene';
import { DrilldownControls } from './DrilldownControls';
import { VariableControls } from './VariableControls';
import { DashboardControlsButton } from './dashboard-controls-menu/DashboardControlsMenuButton';
import { hasDashboardControls, useHasDashboardControls } from './dashboard-controls-menu/utils';
import { DashboardFiltersOverviewPaneToggle } from './dashboard-filters-overview/DashboardFiltersOverviewPaneToggle';
import { EditDashboardSwitch } from './new-toolbar/actions/EditDashboardSwitch';
import { MakeDashboardEditableButton } from './new-toolbar/actions/MakeDashboardEditableButton';
import { SaveDashboard } from './new-toolbar/actions/SaveDashboard';
import { ShareDashboardButton } from './new-toolbar/actions/ShareDashboardButton';
import { useIsNarrow } from './useIsNarrow';

export interface DashboardControlsState extends SceneObjectState {
  timePicker: SceneTimePicker;
  refreshPicker: SceneRefreshPicker;
  hideTimeControls?: boolean;
  hideVariableControls?: boolean;
  hideLinksControls?: boolean;
  // Hides the dashboard-controls dropdown menu
  hideDashboardControls?: boolean;
  hidePlaylistNav?: boolean;
}

export class DashboardControls extends SceneObjectBase<DashboardControlsState> {
  static Component = DashboardControlsRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    onAnyVariableChanged: this._onAnyVariableChanged.bind(this),
  });

  protected _urlSync = new SceneObjectUrlSyncConfig(this, {
    keys: [
      '_dash.hideTimePicker',
      '_dash.hideVariables',
      '_dash.hideLinks',
      '_dash.hideDashboardControls',
      '_dash.hidePlaylistNav',
    ],
  });

  /**
   * We want the hideXX url keys to only sync one way (url => state) on init
   * We don't want these flags to be added to URL.
   */
  getUrlState() {
    return {};
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const { hideTimeControls, hideVariableControls, hideLinksControls, hideDashboardControls, hidePlaylistNav } =
      this.state;
    const isEnabledViaUrl = (key: string) => values[key] === 'true' || values[key] === '';

    if (!hideTimeControls && isEnabledViaUrl('_dash.hideTimePicker')) {
      this.setState({ hideTimeControls: true });
    }

    if (!hideVariableControls && isEnabledViaUrl('_dash.hideVariables')) {
      this.setState({ hideVariableControls: true });
    }

    if (!hideLinksControls && isEnabledViaUrl('_dash.hideLinks')) {
      this.setState({ hideLinksControls: true });
    }

    if (!hideDashboardControls && isEnabledViaUrl('_dash.hideDashboardControls')) {
      this.setState({ hideDashboardControls: true });
    }

    if (!hidePlaylistNav && isEnabledViaUrl('_dash.hidePlaylistNav')) {
      this.setState({ hidePlaylistNav: true });
    }
  }

  public constructor(state: Partial<DashboardControlsState>) {
    super({
      timePicker: state.timePicker ?? new SceneTimePicker({}),
      refreshPicker: state.refreshPicker ?? new SceneRefreshPicker({}),
      ...state,
    });

    this.addActivationHandler(() => {
      let refreshPickerDeactivation: CancelActivationHandler | undefined;

      if (this.state.hideTimeControls) {
        refreshPickerDeactivation = this.state.refreshPicker.activate();
      }

      // Subscribe to time range changes to track interactions
      const timeRange = sceneGraph.getTimeRange(this);
      const timeRangeSubscription = timeRange.subscribeToState((newState, prevState) => {
        if (newState.value !== prevState.value) {
          reportInteraction('grafana_dashboards_time_picker_changed');
        }
      });

      return () => {
        if (refreshPickerDeactivation) {
          refreshPickerDeactivation();
        }
        timeRangeSubscription.unsubscribe();
      };
    });
  }

  /**
   * Links can include all variables so we need to re-render when any change
   */
  private _onAnyVariableChanged(): void {
    const dashboard = getDashboardSceneFor(this);
    if (dashboard.state.links?.length > 0) {
      this.forceRender();
    }
  }

  public hasControls(): boolean {
    const dashboard = getDashboardSceneFor(this);
    const hasVariables = sceneGraph
      .getVariables(this)
      ?.state.variables.some((v) => v.state.hide !== VariableHide.hideVariable);
    const hasAnnotations = sceneGraph.getDataLayers(this).some((d) => d.state.isEnabled && !d.state.isHidden);
    const hasLinks = getDashboardSceneFor(this).state.links?.length > 0;
    const hideLinks = this.state.hideLinksControls || !hasLinks;
    const hideVariables = this.state.hideVariableControls || (!hasAnnotations && !hasVariables);
    const hideTimePicker = this.state.hideTimeControls;
    const hideDashboardControls = this.state.hideDashboardControls || !hasDashboardControls(dashboard);

    return !(hideVariables && hideLinks && hideTimePicker && hideDashboardControls);
  }
}

function DashboardControlsRenderer({ model }: SceneComponentProps<DashboardControls>) {
  const {
    refreshPicker,
    timePicker,
    hideTimeControls,
    hideVariableControls,
    hideLinksControls,
    hideDashboardControls,
    hidePlaylistNav,
  } = model.useState();

  const dashboard = getDashboardSceneFor(model);
  const { links, editPanel, isEditing, title } = dashboard.useState();
  const isQueryEditorNext = Boolean(editPanel?.state.useQueryExperienceNext);
  const styles = useStyles2(getStyles, isQueryEditorNext);
  const showDebugger = window.location.search.includes('scene-debugger');
  const hasDashboardControls = useHasDashboardControls(dashboard);

  // GSAI override (mobile): on narrow viewports the filter categories and the
  // time/refresh picker move behind a single "Filters" button that opens a
  // drawer overlay. Collapsed by default.
  const isNarrow = useIsNarrow();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The refresh-picker auto-refresh timer is tied to its component being
  // mounted. On mobile, while the drawer is closed the picker is unmounted, so
  // keep it activated (mirrors the `hideTimeControls` precedent in the
  // constructor). activate() is ref-counted, so it is safe alongside the
  // component's own activation when the drawer is open.
  useEffect(() => {
    if (!isNarrow || filtersOpen || hideTimeControls) {
      return;
    }
    return refreshPicker.activate();
  }, [isNarrow, filtersOpen, hideTimeControls, refreshPicker]);

  // Show the mobile Filters trigger when narrow and there is something to put
  // behind it (the time picker and/or the filter categories). Editing is a
  // desktop flow, so keep the inline layout while editing.
  const showMobileFilters = isNarrow && !editPanel && !isEditing && (!hideVariableControls || !hideTimeControls);

  // Mobile controls bar: the Filters trigger sits on the left, the dashboard
  // name fills the empty space on the right.
  const mobileBar = showMobileFilters ? (
    <div className={styles.mobileControlsBar}>
      {title ? (
        <div className={styles.mobileDashboardTitle} title={title}>
          {title}
        </div>
      ) : null}
      <MobileFiltersControl
        dashboard={dashboard}
        timePicker={timePicker}
        refreshPicker={refreshPicker}
        hideTimeControls={hideTimeControls}
        hideVariableControls={hideVariableControls}
        open={filtersOpen}
        onOpen={() => setFiltersOpen(true)}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  ) : null;

  // Get adhoc and groupby variables for drilldown controls
  const { variables } = sceneGraph.getVariables(dashboard)?.useState() ?? { variables: [] };
  const visibleVariables = variables.filter((v) => v.state.hide !== VariableHide.inControlsMenu);
  const adHocVar = visibleVariables.find((v) => sceneUtils.isAdHocVariable(v));
  const groupByVar = visibleVariables.find((v) => sceneUtils.isGroupByVariable(v));
  const useUnifiedDrilldownUI = config.featureToggles.dashboardAdHocAndGroupByWrapper && adHocVar && groupByVar;

  if (!model.hasControls()) {
    // If dynamic dashboards is enabled, we need to show the edit/share/playlist buttons
    // However we shouldn't do it if we're in edit panel view
    // `DashboardControlActions` already check for edit panel view but we need to prevent showing the container as well
    if (config.featureToggles.dashboardNewLayouts && !editPanel) {
      return (
        <>
          <div data-testid={selectors.pages.Dashboard.Controls} className={styles.controls}>
            <div className={styles.rightControls}>
              <div className={styles.fixedControls}>
                <DashboardControlActions dashboard={dashboard} hidePlaylistNav={hidePlaylistNav} />
              </div>
            </div>
          </div>
          <RenderHiddenVariables dashboard={dashboard} />
        </>
      );
    }

    // To still have spacing when no controls are rendered
    return (
      <Box padding={1}>
        <RenderHiddenVariables dashboard={dashboard} />
      </Box>
    );
  }

  // When dashboardAdHocAndGroupByWrapper is enabled, use the new layout with topRow
  if (useUnifiedDrilldownUI) {
    return (
      <div
        data-testid={selectors.pages.Dashboard.Controls}
        className={cx(styles.controls, editPanel && styles.controlsPanelEdit)}
      >
        <div className={styles.topRow}>
          {config.featureToggles.scopeFilters && !editPanel && (
            <ContextualNavigationPaneToggle className={styles.contextualNavToggleNewLayout} hideWhenOpen={true} />
          )}
          {!hideVariableControls && (
            <div className={styles.drilldownControlsContainer}>
              <DrilldownControls adHocVar={adHocVar} groupByVar={groupByVar} isEditing={isEditing} />
            </div>
          )}
          {showMobileFilters ? (
            mobileBar
          ) : (
            <div className={cx(styles.rightControlsNewLayout, editPanel && styles.rightControlsWrap)}>
              {!hideTimeControls && (
                <div className={styles.fixedControlsNewLayout}>
                  <timePicker.Component model={timePicker} />
                  <refreshPicker.Component model={refreshPicker} />
                </div>
              )}
              {config.featureToggles.dashboardNewLayouts && (
                <div className={styles.fixedControlsNewLayout}>
                  <DashboardControlActions dashboard={dashboard} hidePlaylistNav={hidePlaylistNav} />
                </div>
              )}
              {(config.featureToggles.dashboardFiltersOverview ||
                config.featureToggles.dashboardUnifiedDrilldownControls) &&
                !config.featureToggles.dashboardNewLayouts && (
                  <div className={styles.fixedControls}>
                    <DashboardFiltersOverviewPaneToggle dashboard={dashboard} />
                  </div>
                )}
            </div>
          )}
        </div>
        {!hideVariableControls && (
          <>
            {!showMobileFilters && <VariableControls dashboard={dashboard} />}
            <DashboardDataLayerControls dashboard={dashboard} />
          </>
        )}
        {!hideLinksControls && !editPanel && <DashboardLinksControls links={links} dashboard={dashboard} />}
        {!hideDashboardControls && hasDashboardControls && <DashboardControlsButton dashboard={dashboard} />}
        <DefaultControlsLoadingSkeleton
          dashboard={dashboard}
          hideVariableControls={hideVariableControls}
          hideLinksControls={hideLinksControls}
        />
        {editPanel && <PanelEditControls panelEditor={editPanel} />}
        {showDebugger && <SceneDebugger scene={model} key={'scene-debugger'} />}
      </div>
    );
  }

  // Original layout when feature toggle is off
  return (
    <div
      data-testid={selectors.pages.Dashboard.Controls}
      className={cx(styles.controls, editPanel && styles.controlsPanelEdit)}
    >
      {showMobileFilters ? (
        mobileBar
      ) : (
        <div className={cx(styles.rightControls, editPanel && styles.rightControlsWrap)}>
          {!hideTimeControls && (
            <div className={styles.fixedControls}>
              <timePicker.Component model={timePicker} />
              <refreshPicker.Component model={refreshPicker} />
            </div>
          )}
          {config.featureToggles.dashboardNewLayouts && (
            <div className={styles.fixedControls}>
              <DashboardControlActions dashboard={dashboard} hidePlaylistNav={hidePlaylistNav} />
            </div>
          )}
          {(config.featureToggles.dashboardFiltersOverview ||
            config.featureToggles.dashboardUnifiedDrilldownControls) &&
            !config.featureToggles.dashboardNewLayouts && (
              <div className={styles.fixedControls}>
                <DashboardFiltersOverviewPaneToggle dashboard={dashboard} />
              </div>
            )}
        </div>
      )}
      {config.featureToggles.scopeFilters && !editPanel && (
        <ContextualNavigationPaneToggle className={styles.contextualNavToggle} hideWhenOpen={true} />
      )}
      {!hideVariableControls && (
        <>
          {!showMobileFilters && <VariableControls dashboard={dashboard} />}
          <DashboardDataLayerControls dashboard={dashboard} />
        </>
      )}
      {!hideLinksControls && !editPanel && <DashboardLinksControls links={links} dashboard={dashboard} />}
      {!hideDashboardControls && hasDashboardControls && <DashboardControlsButton dashboard={dashboard} />}
      <DefaultControlsLoadingSkeleton
        dashboard={dashboard}
        hideVariableControls={hideVariableControls}
        hideLinksControls={hideLinksControls}
      />
      {editPanel && <PanelEditControls panelEditor={editPanel} />}
      {showDebugger && <SceneDebugger scene={model} key={'scene-debugger'} />}
    </div>
  );
}

/**
 * GSAI override (mobile): renders the "Filters" trigger button plus the drawer
 * overlay that holds the time/refresh picker and the filter categories on
 * narrow viewports. The drawer is collapsed by default.
 */
function MobileFiltersControl({
  dashboard,
  timePicker,
  refreshPicker,
  hideTimeControls,
  hideVariableControls,
  open,
  onOpen,
  onClose,
}: {
  dashboard: DashboardScene;
  timePicker: SceneTimePicker;
  refreshPicker: SceneRefreshPicker;
  hideTimeControls?: boolean;
  hideVariableControls?: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const styles = useStyles2(getStyles, false);
  const title = t('dashboard.controls.filters', 'Filters');

  return (
    <>
      <ToolbarButton
        variant="canvas"
        onClick={onOpen}
        className={cx(styles.filtersButton, open && styles.filtersButtonOpen)}
      >
        <Icon name="angle-left" className={styles.filtersArrow} />
        {title}
      </ToolbarButton>
      {open && (
        <Drawer title={title} size="md" onClose={onClose}>
          <div className={styles.mobileFiltersBody}>
            {!hideTimeControls && (
              <div className={styles.mobileFiltersTimeRow}>
                <timePicker.Component model={timePicker} />
                <refreshPicker.Component model={refreshPicker} />
              </div>
            )}
            {!hideVariableControls && (
              <div className={styles.mobileFiltersVariables}>
                <VariableControls dashboard={dashboard} />
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function DashboardControlActions({
  dashboard,
  hidePlaylistNav,
}: {
  dashboard: DashboardScene;
  hidePlaylistNav?: boolean;
}) {
  const { isEditing, editPanel, uid, meta, editable } = dashboard.useState();
  const { isPlaying } = playlistSrv.useState();
  const { chrome } = useGrafana();
  const { kioskMode } = chrome.useState();

  if (editPanel) {
    return null;
  }

  if (kioskMode === KioskMode.Full) {
    return null;
  }

  const canEditDashboard = dashboard.canEditDashboard();
  const canSave = Boolean(meta.canSave);
  const canSaveAs = contextSrv.hasEditPermissionInFolders;
  const hasUid = Boolean(uid);
  const isSnapshot = Boolean(meta.isSnapshot);
  const isEmbedded = meta.isEmbedded;
  const isEditable = Boolean(editable);
  const showShareButton = hasUid && !isSnapshot && !isEmbedded && !isPlaying;

  return (
    <>
      {showShareButton && <ShareDashboardButton dashboard={dashboard} />}
      {isEditing && (canSave || canSaveAs) && <SaveDashboard dashboard={dashboard} />}
      {!isPlaying && canEditDashboard && isEditable && <EditDashboardSwitch dashboard={dashboard} />}
      {!isPlaying && canEditDashboard && !isEditable && !isEditing && (
        <MakeDashboardEditableButton dashboard={dashboard} />
      )}
      {isPlaying && (
        <ButtonGroup>
          {!hidePlaylistNav && (
            <Button
              variant="secondary"
              data-testid={selectors.pages.Dashboard.DashNav.playlistControls.prev}
              tooltip={t('dashboard.toolbar.new.playlist-previous', 'Go to previous dashboard')}
              icon="backward"
              onClick={() => playlistSrv.prev()}
            />
          )}
          <Button
            variant="secondary"
            onClick={() => playlistSrv.stop()}
            data-testid={selectors.pages.Dashboard.DashNav.playlistControls.stop}
          >
            <Trans i18nKey="dashboard.toolbar.new.playlist-stop">Stop playlist</Trans>
          </Button>
          {!hidePlaylistNav && (
            <Button
              variant="secondary"
              data-testid={selectors.pages.Dashboard.DashNav.playlistControls.next}
              tooltip={t('dashboard.toolbar.new.playlist-next', 'Go to next dashboard')}
              icon="forward"
              onClick={() => playlistSrv.next()}
            />
          )}
        </ButtonGroup>
      )}
    </>
  );
}

function RenderHiddenVariables({ dashboard }: { dashboard: DashboardScene }) {
  const { variables } = sceneGraph.getVariables(dashboard).useState();
  const renderAsHiddenVariables = variables.filter((v) => v.UNSAFE_renderAsHidden);
  if (renderAsHiddenVariables && renderAsHiddenVariables.length > 0) {
    return (
      <>
        {renderAsHiddenVariables.map((v) => (
          <v.Component model={v} key={v.state.key} />
        ))}
      </>
    );
  }
  return null;
}

function DefaultControlsLoadingSkeleton({
  dashboard,
  hideVariableControls,
  hideLinksControls,
}: {
  dashboard: DashboardScene;
  hideVariableControls?: boolean;
  hideLinksControls?: boolean;
}) {
  const { defaultVariablesLoading, defaultLinksLoading } = dashboard.useState();
  const styles = useStyles2(getSkeletonStyles);

  const showVariablesSkeleton = defaultVariablesLoading && !hideVariableControls;
  const showLinksSkeleton = defaultLinksLoading && !hideLinksControls;

  if (!showVariablesSkeleton && !showLinksSkeleton) {
    return null;
  }

  return <Skeleton width={60} height={32} containerClassName={styles.skeletonContainer} />;
}

const getSkeletonStyles = (theme: GrafanaTheme2) => ({
  skeletonContainer: css({
    display: 'inline-flex',
    lineHeight: 1,
    verticalAlign: 'middle',
    marginBottom: theme.spacing(1),
    marginRight: theme.spacing(1),
  }),
});

function getStyles(theme: GrafanaTheme2, isQueryEditorNext: boolean) {
  return {
    // Original controls style
    controls: css({
      gap: theme.spacing(1),
      padding: theme.spacing(2, 2, 1, 2),
      flexDirection: 'row',
      flexWrap: 'nowrap',
      position: 'relative',
      width: '100%',
      marginLeft: 'auto',
      display: 'inline-block',
      [theme.breakpoints.down('sm')]: {
        flexDirection: 'column-reverse',
        alignItems: 'stretch',
      },

      '&:hover .dashboard-canvas-controls': {
        opacity: 1,
      },
    }),
    controlsPanelEdit: css({
      flexWrap: 'wrap-reverse',
      ...(isQueryEditorNext && {
        padding: 0,
        marginBottom: theme.spacing(-1),
      }),
      paddingRight: 0,
    }),
    // New layout styles (used when feature toggle is on)
    topRow: css({
      display: 'flex',
      alignItems: 'flex-start',
      gap: theme.spacing(1),
      width: '100%',
      marginBottom: theme.spacing(1),
      // GSAI override (responsive): wrap from the host breakpoint (<=768) instead
      // of only the much-smaller sm breakpoint, so it tracks the host nav-hide.
      [theme.breakpoints.down('md')]: {
        flexWrap: 'wrap',
      },
    }),
    drilldownControlsContainer: css({
      flex: 1,
      minWidth: 0,
      display: 'flex',
      [theme.breakpoints.down('sm')]: {
        order: 1, // Move below the time controls
        flex: '1 1 100%', // Take full width to force new line
      },
    }),
    embedded: css({
      background: 'unset',
      position: 'unset',
    }),
    // Original rightControls style
    rightControls: css({
      display: 'flex',
      gap: theme.spacing(1),
      float: 'right',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      maxWidth: '100%',
      minWidth: 0,
      // GSAI override (responsive): at <=768px (matches host nav-hide) stop
      // floating the time picker so it takes its own row above the filter bar
      // instead of overlapping the filter categories.
      [theme.breakpoints.down('md')]: {
        float: 'none',
        width: '100%',
        justifyContent: 'flex-end',
      },
    }),
    // Modified rightControls for new layout
    rightControlsNewLayout: css({
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      flexShrink: 0,
      // GSAI override (responsive): full-width row at <=768px to avoid overlap.
      [theme.breakpoints.down('md')]: {
        width: '100%',
        justifyContent: 'flex-end',
      },
    }),
    // Original fixedControls style
    fixedControls: css({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1),
      order: 2,
      marginLeft: 'auto',
      flexShrink: 0,
      alignSelf: 'flex-start',
    }),
    // Fixed controls for new layout (no margin/order)
    fixedControlsNewLayout: css({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: theme.spacing(1),
      flexShrink: 0,
      alignSelf: 'flex-start',
    }),
    dashboardControlsButton: css({
      order: 2,
      marginLeft: 'auto',
    }),
    rightControlsWrap: css({
      flexWrap: 'wrap',
      marginLeft: 'auto',
    }),
    contextualNavToggle: css({
      display: 'inline-flex',
      margin: theme.spacing(0, 1, 1, 0),
    }),
    contextualNavToggleNewLayout: css({
      display: 'inline-flex',
      flexShrink: 0,
    }),
    // GSAI override (mobile): full-width bar with the Filters trigger on the
    // left and the dashboard name filling the space on the right.
    mobileControlsBar: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      width: '100%',
      flexBasis: '100%',
      marginBottom: theme.spacing(1),
    }),
    mobileDashboardTitle: css({
      flex: 1,
      minWidth: 0,
      marginRight: 'auto',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
    }),
    // GSAI override (mobile): Filters trigger — white at rest; brand tint while
    // the drawer is open. `&&` beats ToolbarButton `canvas` (secondary.main grey).
    filtersButton: css({
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      border: '1px solid #e0e0e0',
      borderRadius: theme.shape.radius.default,
      boxShadow: 'none',
      fontFamily: 'Roboto, sans-serif',
      fontWeight: theme.typography.fontWeightRegular,
      fontSize: 'clamp(0.6875rem, 3.6vw, 0.8125rem)',
      color: '#000',
      '&&': {
        background: '#fff',
        '&:hover, &:focus, &:focus-visible': {
          background: 'rgba(0, 0, 0, 0.04)',
          border: '1px solid #e0e0e0',
          color: '#000',
          boxShadow: 'none',
        },
      },
    }),
    // Same light brand tint as active category rows while the Filters drawer is open.
    filtersButtonOpen: css({
      '&&': {
        background: 'rgba(241, 91, 42, 0.06)',
        '&:hover, &:focus, &:focus-visible, &:active': {
          background: 'rgba(241, 91, 42, 0.1)',
          border: '1px solid #e0e0e0',
          color: '#000',
          boxShadow: 'none',
        },
      },
    }),
    filtersArrow: css({
      color: '#ff5300',
      marginRight: theme.spacing(0.5),
      alignSelf: 'center',
    }),
    // GSAI override (mobile): layout for the Filters drawer contents.
    mobileFiltersBody: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    }),
    mobileFiltersTimeRow: css({
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing(1),
    }),
    mobileFiltersVariables: css({
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
    }),
  };
}
