import React, { FC } from 'react';

import { ModalsController } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { VariableModel } from '../../../variables/types';
import { DashboardModel } from '../../state';
import { DashNavButton } from '../DashNav/DashNavButton';
import { ShareModalCustom } from '../ShareModal/ShareModalCustom';

export interface Props {
  dashboard: DashboardModel;
  variables: VariableModel[];
}

export const ShareDashboard: FC<Props> = ({ dashboard, variables }) => {
  return (
    <div style={{ display: 'flex', margin: '10px' }}>
      <ModalsController key="button-bookmark">
        {({ showModal, hideModal }) => (
          <DashNavButton
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
          <DashNavButton
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
    </div>
  );
};
