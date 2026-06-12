import { useEffect, useReducer, useState } from 'react';

import { dateMath, dateTime, type RawTimeRange, type TimeRange, type TimeZone } from '@grafana/data';
import { t } from '@grafana/i18n';
import { reportInteraction, TimeRangeUpdatedEvent } from '@grafana/runtime';
import { defaultIntervals, isWeekStart, RefreshPicker } from '@grafana/ui';
import { appEvents } from 'app/core/app_events';
import { TimePickerWithHistory } from 'app/core/components/TimePicker/TimePickerWithHistory';
import { AutoRefreshInterval } from 'app/core/services/context_srv';
import { getTimeSrv } from 'app/features/dashboard/services/TimeSrv';

import { ShiftTimeEvent, ShiftTimeEventDirection, ZoomOutEvent } from '../../../../types/events';
import { type DashboardModel } from '../../state/DashboardModel';
import { ShareDashboard } from '../SubMenu/ShareDashboard';

export interface Props {
  dashboard: DashboardModel;
  onChangeTimeZone: (timeZone: TimeZone) => void;
  isOnCanvas?: boolean;
  onToolbarRefreshClick?: () => void;
  onToolbarZoomClick?: () => void;
  onToolbarTimePickerClick?: () => void;
}

export function DashNavTimeControls({
  dashboard,
  onChangeTimeZone,
  isOnCanvas,
  onToolbarRefreshClick,
  onToolbarZoomClick,
  onToolbarTimePickerClick,
}: Props) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [timeRangeGreaterThanDay, setTimeRangeGreaterThanDay] = useState(false);

  const onRefresh = () => {
    if (timeRangeGreaterThanDay) {
      return Promise.resolve();
    }
    getTimeSrv().refreshTimeModel();
    return Promise.resolve();
  };

  const onChangeRefreshInterval = (interval: string) => {
    getTimeSrv().setAutoRefresh(interval);
    forceUpdate();
  };

  const checkSelectedTimeRange = (range: RawTimeRange) => {
    const fr = dateMath.parse(range.from);
    const now = dateTime();
    let greaterThanThirtyDay = false;
    try {
      if (fr) {
        const timeDiff = now.valueOf() - fr.valueOf();
        greaterThanThirtyDay = Math.abs(timeDiff / 86400000) > 30;
      }
    } catch (error) {
      console.error(error);
    }
    if (greaterThanThirtyDay) {
      setTimeRangeGreaterThanDay(true);
      onChangeRefreshInterval('');
    } else {
      setTimeRangeGreaterThanDay(false);
    }
  };

  useEffect(() => {
    const sub = dashboard.events.subscribe(TimeRangeUpdatedEvent, () => forceUpdate());
    checkSelectedTimeRange(getTimeSrv().timeRange().raw);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.events]);

  const onMoveBack = () => {
    appEvents.publish(new ShiftTimeEvent({ direction: ShiftTimeEventDirection.Left }));
  };

  const onMoveForward = () => {
    appEvents.publish(new ShiftTimeEvent({ direction: ShiftTimeEventDirection.Right }));
  };

  const onChangeTimePicker = (timeRange: TimeRange) => {
    const panel = dashboard.timepicker;
    const hasDelay = panel.nowDelay && timeRange.raw.to === 'now';

    const adjustedFrom = dateMath.isMathString(timeRange.raw.from) ? timeRange.raw.from : timeRange.from;
    const adjustedTo = dateMath.isMathString(timeRange.raw.to) ? timeRange.raw.to : timeRange.to;
    const nextRange = {
      from: adjustedFrom,
      to: hasDelay ? 'now-' + panel.nowDelay : adjustedTo,
    };

    checkSelectedTimeRange(nextRange);
    getTimeSrv().setTime(nextRange);
    reportInteraction('grafana_dashboards_time_picker_changed');
  };

  const handleChangeTimeZone = (timeZone: TimeZone) => {
    dashboard.timezone = timeZone;
    onChangeTimeZone(timeZone);
    onRefresh();
  };

  const onChangeFiscalYearStartMonth = (month: number) => {
    dashboard.fiscalYearStartMonth = month;
    onRefresh();
  };

  const onZoom = () => {
    onToolbarZoomClick?.();
    appEvents.publish(new ZoomOutEvent({ scale: 2 }));
  };

  const onRefreshClick = () => {
    onToolbarRefreshClick?.();
    onRefresh();
  };

  const { quick_ranges, refresh_intervals } = dashboard.timepicker;
  const intervals = getTimeSrv().getValidIntervals(refresh_intervals || defaultIntervals);

  const timePickerValue = getTimeSrv().timeRange();
  const timeZone = dashboard.getTimezone();
  const fiscalYearStartMonth = dashboard.fiscalYearStartMonth;
  const hideIntervalPicker = timeRangeGreaterThanDay || dashboard.panelInEdit?.isEditing;
  const refreshTooltip = timeRangeGreaterThanDay
    ? t('dashboard.toolbar.refresh-enabled-30-days', 'Refresh enabled for last 30 days')
    : t('dashboard.toolbar.refresh', 'Refresh dashboard');
  const weekStart = dashboard.weekStart;

  let text: string | undefined = undefined;
  if (dashboard.refresh === AutoRefreshInterval) {
    text = getTimeSrv().getAutoRefreshInteval().interval;
  }

  return (
    <>
      <TimePickerWithHistory
        value={timePickerValue}
        onChange={onChangeTimePicker}
        timeZone={timeZone}
        fiscalYearStartMonth={fiscalYearStartMonth}
        onMoveBackward={onMoveBack}
        onMoveForward={onMoveForward}
        onZoom={onZoom}
        onChangeTimeZone={handleChangeTimeZone}
        onChangeFiscalYearStartMonth={onChangeFiscalYearStartMonth}
        isOnCanvas={isOnCanvas}
        onToolbarTimePickerClick={onToolbarTimePickerClick}
        weekStart={isWeekStart(weekStart) ? weekStart : undefined}
        quickRanges={quick_ranges}
      />
      <RefreshPicker
        onIntervalChanged={onChangeRefreshInterval}
        onRefresh={onRefreshClick}
        value={dashboard.refresh}
        intervals={intervals}
        isOnCanvas={isOnCanvas}
        tooltip={refreshTooltip}
        noIntervalPicker={hideIntervalPicker}
        showAutoInterval={true}
        text={text}
      />
      <ShareDashboard dashboard={dashboard} />
    </>
  );
}
