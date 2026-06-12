import * as React from 'react';

import { t } from '@grafana/i18n';
import { Modal, ModalTabsHeader, TabContent } from '@grafana/ui';
import { type DashboardModel } from 'app/features/dashboard/state/DashboardModel';
import { type PanelModel } from 'app/features/dashboard/state/PanelModel';

import { BookmarkLinkCustom } from './BookmarkLinkCustom';
import { ShareLinkCustom } from './ShareLinkCustom';
import { type ShareModalTabModel } from './types';

function getTabs(activeTab?: string) {
  const bookmarkLabel = t('share-modal-custom.tab-title.bookmark', 'Bookmark');
  const shareLabel = t('share-modal-custom.tab-title.share', 'Share');

  const tabs: ShareModalTabModel[] = [
    { label: bookmarkLabel, value: 'bookmark', component: BookmarkLinkCustom },
    { label: shareLabel, value: 'share', component: ShareLinkCustom },
  ];

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

export function ShareModalCustom({ dashboard, panel, activeTab: initialActiveTab, onDismiss }: Props) {
  const [activeTab, setActiveTab] = React.useState(() => getTabs(initialActiveTab).activeTab);

  const onSelectTab: React.ComponentProps<typeof ModalTabsHeader>['onChangeTab'] = React.useCallback((tab) => {
    setActiveTab(tab.value);
  }, []);

  const { tabs } = getTabs(activeTab);
  const activeTabModel = tabs.find((tab) => tab.value === activeTab)!;
  const ActiveTab = activeTabModel.component;
  const modalTitle = t('share-modal-custom.dashboard.title', 'Share');

  const title = <ModalTabsHeader title={modalTitle} tabs={tabs} activeTab={activeTab} onChangeTab={onSelectTab} />;

  return (
    <Modal ariaLabel={modalTitle} isOpen={true} title={title} onDismiss={onDismiss}>
      <TabContent>
        <ActiveTab dashboard={dashboard} panel={panel} onDismiss={onDismiss} />
      </TabContent>
    </Modal>
  );
}
