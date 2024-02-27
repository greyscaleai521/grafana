import React, { PureComponent } from 'react';

import { reportInteraction } from '@grafana/runtime/src';
import { Button, Field, FieldSet, Input, Modal, Spinner, Switch } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';

import { ShareModalTabProps } from './types';
import { buildParamsforShare } from './utils';

export interface Props extends ShareModalTabProps {}

export interface State {
  useCurrentTimeRange: boolean;
  isLoading: boolean;
  filterName: string;
}

export class BookmarkLinkCustom extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      useCurrentTimeRange: true,
      isLoading: false,
      filterName: '',
    };
  }

  componentDidMount() {
    reportInteraction('grafana_dashboards_link_share_viewed');
    window.addEventListener('message', this.receiveFromParent, false);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.receiveFromParent, false);
  }

  sendToParent = (link: string, filterName: string) => {
    this.onIsLoadingChange(true);
    window.parent.postMessage(
      {
        key: 'bookmark-link',
        value: link,
        filterName,
      },
      '*'
    );
  };

  receiveFromParent = (event: MessageEvent) => {
    const { onDismiss } = this.props;
    if (event.data.key === 'bookmark-link-from-parent') {
      if (event.data.value === 'success') {
        onDismiss && onDismiss();
      }
      this.onIsLoadingChange(false);
    }
  };

  bookmarkDashboard = async () => {
    const { useCurrentTimeRange } = this.state;
    this.setState({ isLoading: true });
    const params = buildParamsforShare({ useCurrentTimeRange });
    this.sendToParent(params.toString(), this.state.filterName);
  };

  onUseCurrentTimeRangeChange = () => {
    this.setState({ useCurrentTimeRange: !this.state.useCurrentTimeRange });
  };

  onFilterNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ filterName: event.target.value });
  };

  onIsLoadingChange = (isLoading: boolean) => {
    this.setState({ isLoading });
  };

  render() {
    const { dashboard, onDismiss } = this.props;
    const isRelativeTime = dashboard ? dashboard.time.to === 'now' : false;
    const { useCurrentTimeRange, isLoading, filterName } = this.state;
    const snapshotNameTranslation = t('bookmark-modal.snapshot.name', `Filter name*`);
    const timeRangeLabelTranslation = t('bookmark-modal-custom.link.time-range-label', `Use Relative Time Range`);

    const timeRangeDescriptionTranslation = t(
      'bookmark-modal-custom.link.time-range-description',
      `Turn off the toggle to convert relative time range to an absolute time range`
    );

    return (
      <>
        <p className="bookmark-modal-custom-info-text">
          <Trans i18nKey="bookmark-modal-custom.link.info-text">Bookmark this dashboard.</Trans>
        </p>
        <Field label={snapshotNameTranslation}>
          <Input id="snapshot-name-input" width={30} value={filterName} onChange={this.onFilterNameChange}/>
        </Field>
        <FieldSet>
          {isRelativeTime && <Field label={timeRangeLabelTranslation} description={timeRangeDescriptionTranslation}>
            <Switch
              id="bookmark-current-time-range"
              value={useCurrentTimeRange}
              onChange={this.onUseCurrentTimeRangeChange}
            />
          </Field>}
          <Modal.ButtonRow>
            <Button variant="secondary" onClick={onDismiss} fill="outline">
              <Trans i18nKey="bookmark-modal.cancel-button">Cancel</Trans>
            </Button>
            <Button variant="primary" disabled={isLoading || !filterName} onClick={this.bookmarkDashboard} style={{width: '13rem', justifyContent: 'center'}}>
              {this.state.isLoading ? <Spinner /> : <Trans i18nKey="bookmark-modal.local-button">Bookmark Dashboard</Trans>}
            </Button>
          </Modal.ButtonRow>
        </FieldSet>
      </>
    );
  }
}
