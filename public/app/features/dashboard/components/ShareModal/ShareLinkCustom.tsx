import React, { PureComponent } from 'react';

import { reportInteraction } from '@grafana/runtime/src';
import { ClipboardButton, Field, FieldSet, Input, Spinner, Switch } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';

import { ShareModalTabProps } from './types';
import { buildParamsforShare } from './utils';

export interface Props extends ShareModalTabProps {}

export interface State {
  useCurrentTimeRange: boolean;
  isLoading: boolean;
  shareUrl: string;
}

export class ShareLinkCustom extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      useCurrentTimeRange: true,
      isLoading: false,
      shareUrl: '',
    };
  }

  componentDidMount() {
    reportInteraction('grafana_dashboards_link_share_viewed');
    window.addEventListener('message', this.receiveFromParent, false);
    this.generateShareURL();
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.receiveFromParent, false);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { useCurrentTimeRange } = this.state;
    if (prevState.useCurrentTimeRange !== useCurrentTimeRange) {
      this.generateShareURL();
    }
  }

  sendToParent = (link: string) => {
    this.onIsLoadingChange(true);
    window.parent.postMessage(
      {
        key: 'share-link',
        value: link,
      },
      '*'
    );
  };

  receiveFromParent = (event: MessageEvent) => {
    if (event.data.key === 'share-link-from-parent') {
      this.onIsLoadingChange(false);
      event.data.value && this.setState({ shareUrl: event.data.value });
    }
  };

  generateShareURL = async () => {
    const { useCurrentTimeRange } = this.state;
    const { dashboard } = this.props;
    const isRelativeTime = dashboard ? dashboard.time.to === 'now' : false;
    this.setState({ isLoading: true });
    const params = buildParamsforShare({ useCurrentTimeRange, isRelativeTime });
        this.sendToParent(params.toString());
  };

  onUseCurrentTimeRangeChange = () => {
    this.setState({ useCurrentTimeRange: !this.state.useCurrentTimeRange });
  };

  getShareUrl = () => {
    return this.state.shareUrl;
  };

  onIsLoadingChange = (isLoading: boolean) => {
    this.setState({ isLoading });
  };

  render() {
    const { dashboard } = this.props;
    const isRelativeTime = dashboard ? dashboard.time.to === 'now' : false;
    const { useCurrentTimeRange, shareUrl } = this.state;

    const timeRangeLabelTranslation = t('share-modal-custom.link.time-range-label', `Use Relative Time Range`);

    const timeRangeDescriptionTranslation = t(
      'share-modal-custom.link.time-range-description',
      `Turn off the toggle to convert relative time range to an absolute time range`
    );

    const linkURLTranslation = t('share-modal-custom.link.link-url', `Link URL`);
    return (
      <>
        <p className="share-modal-custom-info-text">
          <Trans i18nKey="share-modal-custom.link.info-text">Share this dashboard.</Trans>
        </p>
        <FieldSet>
          {isRelativeTime && <Field label={timeRangeLabelTranslation} description={timeRangeDescriptionTranslation}>
            <Switch
              id="share-current-time-range"
              value={useCurrentTimeRange}
              onChange={this.onUseCurrentTimeRangeChange}
            />
          </Field>}

          <Field label={linkURLTranslation}>
            <Input
              id="link-url-input"
              value={shareUrl}
              readOnly
              disabled={this.state.isLoading}
              addonAfter={
                <ClipboardButton
                  icon="copy"
                  variant="primary"
                  getText={this.getShareUrl}
                  disabled={this.state.isLoading}
                  style={{width: '7rem', justifyContent: 'center'}}
                >
                  {this.state.isLoading ? (
                    <Spinner />
                  ) : (
                    <Trans i18nKey="share-modal-custom.link.copy-link-button">Copy</Trans>
                  )}
                </ClipboardButton>
              }
            />
          </Field>
        </FieldSet>
      </>
    );
  }
}
