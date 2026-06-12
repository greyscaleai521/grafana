import { type ChangeEvent, useCallback, useEffect, useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import { reportInteraction } from '@grafana/runtime';
import { Button, Field, FieldSet, Input, Modal, Spinner, Switch } from '@grafana/ui';

import { type ShareModalTabProps } from './types';
import { buildParamsforShare } from './utils';

export interface Props extends ShareModalTabProps {}

export function BookmarkLinkCustom({ dashboard, onDismiss }: Props) {
  const [useCurrentTimeRange, setUseCurrentTimeRange] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filterName, setFilterName] = useState('');

  const isRelativeTime = dashboard ? dashboard.time.to === 'now' : false;

  useEffect(() => {
    reportInteraction('grafana_dashboards_link_share_viewed');

    const receiveFromParent = (event: MessageEvent) => {
      if (event.data.key === 'bookmark-link-from-parent') {
        if (event.data.value === 'success') {
          onDismiss && onDismiss();
        }
        setIsLoading(false);
      }
    };

    window.addEventListener('message', receiveFromParent, false);
    return () => window.removeEventListener('message', receiveFromParent, false);
  }, [onDismiss]);

  const bookmarkDashboard = useCallback(() => {
    setIsLoading(true);
    const params = buildParamsforShare({ useCurrentTimeRange, isRelativeTime });
    window.parent.postMessage(
      {
        key: 'bookmark-link',
        value: params.toString(),
        filterName,
      },
      '*'
    );
  }, [useCurrentTimeRange, isRelativeTime, filterName]);

  const onUseCurrentTimeRangeChange = () => {
    setUseCurrentTimeRange((value) => !value);
  };

  const onFilterNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterName(event.target.value);
  };

  const snapshotNameTranslation = t('bookmark-modal.snapshot.name', `Name*`);
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
      <Field label={snapshotNameTranslation} noMargin>
        <Input id="snapshot-name-input" width={30} value={filterName} onChange={onFilterNameChange} />
      </Field>
      <FieldSet>
        {isRelativeTime && (
          <Field label={timeRangeLabelTranslation} description={timeRangeDescriptionTranslation} noMargin>
            <Switch
              id="bookmark-current-time-range"
              value={useCurrentTimeRange}
              onChange={onUseCurrentTimeRangeChange}
            />
          </Field>
        )}
        <Modal.ButtonRow>
          <Button variant="secondary" onClick={onDismiss} fill="outline">
            <Trans i18nKey="bookmark-modal.cancel-button">Cancel</Trans>
          </Button>
          <Button variant="primary" disabled={isLoading || !filterName} onClick={bookmarkDashboard}>
            {isLoading ? <Spinner /> : <Trans i18nKey="bookmark-modal.local-button">Bookmark</Trans>}
          </Button>
        </Modal.ButtonRow>
      </FieldSet>
    </>
  );
}
