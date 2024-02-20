import React from 'react';

import { reportInteraction } from '@grafana/runtime/src';
import { Modal, ModalTabsHeader, TabContent } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { DashboardModel, PanelModel } from 'app/features/dashboard/state';

import { BookmarkLinkCustom } from './BookmarkLinkCustom';
import { ShareLinkCustom } from './ShareLinkCustom';
import { ShareModalTabModel } from './types';

const customDashboardTabs: ShareModalTabModel[] = [];
const customPanelTabs: ShareModalTabModel[] = [];

export function addDashboardShareTab(tab: ShareModalTabModel) {
  customDashboardTabs.push(tab);
}

export function addPanelShareTab(tab: ShareModalTabModel) {
  customPanelTabs.push(tab);
}

function getTabs(panel?: PanelModel, activeTab?: string) {
  const bookmarkLabel = t('share-modal-custom-custom.tab-title.bookmark', 'Bookmark');
  const shareLabel = t('share-modal-custom-custom.tab-title.share', 'Share');
  const tabs: ShareModalTabModel[] = [{ label: bookmarkLabel, value: 'bookmark', component: BookmarkLinkCustom }];
  tabs.push({ label: shareLabel, value: 'share', component: ShareLinkCustom });

  const at = tabs.find((t) => t.value === activeTab);

  return {
    tabs,
    activeTab: at?.value ?? tabs[0].value,
  };
}

interface Props {
  dashboard: DashboardModel;
  panel?: PanelModel;
  activeTab?: string;

  onDismiss(): void;
}

interface State {
  tabs: ShareModalTabModel[];
  activeTab: string;
}

function getInitialState(props: Props): State {
  const { tabs, activeTab } = getTabs(props.panel, props.activeTab);

  return {
    tabs,
    activeTab,
  };
}

export class ShareModalCustom extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = getInitialState(props);
  }

  componentDidMount() {
    reportInteraction('grafana_dashboards_share_modal_custom_viewed');
  }

  onSelectTab = (t: any) => {
    this.setState((prevState) => ({ ...prevState, activeTab: t.value }));
  };

  getActiveTab() {
    const { tabs, activeTab } = this.state;
    return tabs.find((t) => t.value === activeTab)!;
  }

  renderTitle() {
    const { activeTab } = this.state;
    const title = '';
    const tabs = getTabs(this.props.panel, this.state.activeTab).tabs;

    return (
      <ModalTabsHeader
        title={title}
        icon="share-alt"
        tabs={tabs}
        activeTab={activeTab}
        onChangeTab={this.onSelectTab}
      />
    );
  }

  render() {
    const { dashboard, panel } = this.props;
    const activeTabModel = this.getActiveTab();
    const ActiveTab = activeTabModel.component;

    return (
      <Modal isOpen={true} title={this.renderTitle()} onDismiss={this.props.onDismiss}>
        <TabContent>
          <ActiveTab dashboard={dashboard} panel={panel} onDismiss={this.props.onDismiss} />
        </TabContent>
      </Modal>
    );
  }
}
