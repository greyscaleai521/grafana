import { useCallback, useEffect, useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import { reportInteraction } from '@grafana/runtime';
import { ClipboardButton, Field, FieldSet, Input, Spinner, Switch } from '@grafana/ui';

import { type ShareModalTabProps } from './types';
import { buildParamsforShare } from './utils';

export interface Props extends ShareModalTabProps {}

export function ShareLinkCustom({ dashboard }: Props) {
  const [useCurrentTimeRange, setUseCurrentTimeRange] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const isRelativeTime = dashboard ? dashboard.time.to === 'now' : false;

  const generateShareURL = useCallback(() => {
    setIsLoading(true);
    const params = buildParamsforShare({ useCurrentTimeRange, isRelativeTime });
    window.parent.postMessage(
      {
        key: 'share-link',
        value: params.toString(),
      },
      '*'
    );
  }, [useCurrentTimeRange, isRelativeTime]);

  useEffect(() => {
    reportInteraction('grafana_dashboards_link_share_viewed');

    const receiveFromParent = (event: MessageEvent) => {
      if (event.data.key === 'share-link-from-parent') {
        setIsLoading(false);
        event.data.value && setShareUrl(event.data.value);
      }
    };

    window.addEventListener('message', receiveFromParent, false);
    return () => window.removeEventListener('message', receiveFromParent, false);
  }, []);

  useEffect(() => {
    generateShareURL();
  }, [generateShareURL]);

  const onUseCurrentTimeRangeChange = () => {
    setUseCurrentTimeRange((value) => !value);
  };

  const getShareUrl = useCallback(() => shareUrl, [shareUrl]);

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
        {isRelativeTime && (
          <Field label={timeRangeLabelTranslation} description={timeRangeDescriptionTranslation} noMargin>
            <Switch id="share-current-time-range" value={useCurrentTimeRange} onChange={onUseCurrentTimeRangeChange} />
          </Field>
        )}

        <Field label={linkURLTranslation} noMargin>
          <Input
            id="link-url-input"
            value={shareUrl}
            readOnly
            disabled={isLoading}
            addonAfter={
              <ClipboardButton icon="copy" variant="primary" getText={getShareUrl} disabled={isLoading}>
                {isLoading ? <Spinner /> : <Trans i18nKey="share-modal-custom.link.copy-link-button">Copy</Trans>}
              </ClipboardButton>
            }
          />
        </Field>
      </FieldSet>
    </>
  );
}
