import { type FC } from 'react';

import { t } from '@grafana/i18n';
import { ButtonGroup, ModalsController, ToolbarButton } from '@grafana/ui';

import { type DashboardModel } from '../../state/DashboardModel';
import { ShareModalCustom } from '../ShareModal/ShareModalCustom';

export interface Props {
  dashboard: DashboardModel;
}

export const ShareDashboard: FC<Props> = ({ dashboard }) => {
  return (
    <ButtonGroup>
      <ModalsController key="button-bookmark">
        {({ showModal, hideModal }) => (
          <ToolbarButton
            tooltip={t('dashboard.toolbar.bookmark', 'Bookmark dashboard')}
            icon="star"
            iconSize="lg"
            onClick={() => {
              showModal(ShareModalCustom, {
                dashboard,
                activeTab: 'bookmark',
                onDismiss: hideModal,
              });
            }}
          />
        )}
      </ModalsController>
      <ModalsController key="button-share">
        {({ showModal, hideModal }) => (
          <ToolbarButton
            tooltip={t('dashboard.toolbar.share', 'Share dashboard')}
            icon="share-alt"
            iconSize="lg"
            onClick={() => {
              showModal(ShareModalCustom, {
                dashboard,
                activeTab: 'share',
                onDismiss: hideModal,
              });
            }}
          />
        )}
      </ModalsController>
    </ButtonGroup>
  );
};
