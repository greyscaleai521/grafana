import React, { Component } from 'react';
import { Unsubscribable } from 'rxjs';

import { dateMath, TimeRange, TimeZone, RawTimeRange, dateTime } from '@grafana/data';
import { TimeRangeUpdatedEvent } from '@grafana/runtime';
import { defaultIntervals, RefreshPicker } from '@grafana/ui';
import { TimePickerWithHistory } from 'app/core/components/TimePicker/TimePickerWithHistory';
import { appEvents } from 'app/core/core';
import { AutoRefreshInterval } from 'app/core/services/context_srv';
import { getTimeSrv } from 'app/features/dashboard/services/TimeSrv';

import { ShiftTimeEvent, ShiftTimeEventDirection, ZoomOutEvent } from '../../../../types/events';
import { DashboardModel } from '../../state';

export interface Props {
  dashboard: DashboardModel;
  onChangeTimeZone: (timeZone: TimeZone) => void;
  isOnCanvas?: boolean;
  onToolbarRefreshClick?: () => void;
  onToolbarZoomClick?: () => void;
  onToolbarTimePickerClick?: () => void;
}

export class DashNavTimeControls extends Component<Props, any> {
  constructor(props: Props) {
    super(props);

    this.state = {
      timeRangeGreaterThanDay: false,
    };
  }

  private sub?: Unsubscribable;

  componentDidMount() {
    this.sub = this.props.dashboard.events.subscribe(TimeRangeUpdatedEvent, () => this.forceUpdate());
    const timePickerValue = getTimeSrv().timeRange();
    this.checkSelectedTimeRange(timePickerValue);
  }

  componentWillUnmount() {
    this.sub?.unsubscribe();
  }

  onChangeRefreshInterval = (interval: string) => {
    getTimeSrv().setAutoRefresh(interval);
    this.forceUpdate();
  };

  onRefresh = () => {
    if (this.state.timeRangeGreaterThanDay) {
      return;
    }
    getTimeSrv().refreshTimeModel();
    return Promise.resolve();
  };

  onMoveBack = () => {
    appEvents.publish(new ShiftTimeEvent({ direction: ShiftTimeEventDirection.Left }));
  };

  onMoveForward = () => {
    appEvents.publish(new ShiftTimeEvent({ direction: ShiftTimeEventDirection.Right }));
  };

  onChangeTimePicker = (timeRange: TimeRange) => {
    const { dashboard } = this.props;
    const panel = dashboard.timepicker;
    const hasDelay = panel.nowDelay && timeRange.raw.to === 'now';

    const adjustedFrom = dateMath.isMathString(timeRange.raw.from) ? timeRange.raw.from : timeRange.from;
    const adjustedTo = dateMath.isMathString(timeRange.raw.to) ? timeRange.raw.to : timeRange.to;
    const nextRange = {
      from: adjustedFrom,
      to: hasDelay ? 'now-' + panel.nowDelay : adjustedTo,
    };
    this.checkSelectedTimeRange(nextRange);
    getTimeSrv().setTime(nextRange);
  };

  checkSelectedTimeRange(nextRange: RawTimeRange) {
    let fr: any = dateMath.parse(nextRange.from);
    let greaterThanThirtyDay = false;
    let now: any = dateTime();
    try {
      if (fr) {
        const timeDiff = (now - fr) as number;
        greaterThanThirtyDay = Math.abs(timeDiff / 86400000) > 30 ? true : false;
      }
    } catch (error) {
      console.log(error);
    }
    if (greaterThanThirtyDay) {
      this.setState((prevState: any) => {
        return { timeRangeGreaterThanDay: true };
      });
      this.onChangeRefreshInterval('');
    } else {
      this.setState((prevState: any) => {
        return { timeRangeGreaterThanDay: false };
      });
    }
  }

  onChangeTimeZone = (timeZone: TimeZone) => {
    this.props.dashboard.timezone = timeZone;
    this.props.onChangeTimeZone(timeZone);
    this.onRefresh();
  };

  onChangeFiscalYearStartMonth = (month: number) => {
    this.props.dashboard.fiscalYearStartMonth = month;
    this.onRefresh();
  };

  onZoom = () => {
    if (this.props.onToolbarZoomClick) {
      this.props.onToolbarZoomClick();
    }
    appEvents.publish(new ZoomOutEvent({ scale: 2 }));
  };

  onRefreshClick = () => {
    if (this.props.onToolbarRefreshClick) {
      this.props.onToolbarRefreshClick();
    }
    this.onRefresh();
  };

  render() {
    const { dashboard, isOnCanvas } = this.props;
    const { refresh_intervals } = dashboard.timepicker;
    const intervals = getTimeSrv().getValidIntervals(refresh_intervals || defaultIntervals);

    const timePickerValue = getTimeSrv().timeRange();
    const timeZone = dashboard.getTimezone();
    const fiscalYearStartMonth = dashboard.fiscalYearStartMonth;
    const hideIntervalPicker = this.state.timeRangeGreaterThanDay || dashboard.panelInEdit?.isEditing;
    const refreshTooltip = this.state.timeRangeGreaterThanDay
      ? 'Refresh enabled for last 30 days'
      : 'Refresh dashboard';

    let text: string | undefined = undefined;
    if (dashboard.refresh === AutoRefreshInterval) {
      text = getTimeSrv().getAutoRefreshInteval().interval;
    }

    return (
      <>
        <TimePickerWithHistory
          value={timePickerValue}
          onChange={this.onChangeTimePicker}
          timeZone={timeZone}
          fiscalYearStartMonth={fiscalYearStartMonth}
          onMoveBackward={this.onMoveBack}
          onMoveForward={this.onMoveForward}
          onZoom={this.onZoom}
          onChangeTimeZone={this.onChangeTimeZone}
          onChangeFiscalYearStartMonth={this.onChangeFiscalYearStartMonth}
          isOnCanvas={isOnCanvas}
          onToolbarTimePickerClick={this.props.onToolbarTimePickerClick}
        />
        <RefreshPicker
          onIntervalChanged={this.onChangeRefreshInterval}
          onRefresh={this.onRefreshClick}
          value={dashboard.refresh}
          intervals={intervals}
          isOnCanvas={isOnCanvas}
          tooltip={refreshTooltip}
          noIntervalPicker={hideIntervalPicker}
          showAutoInterval={true}
          text={text}
        />
      </>
    );
  }
}
