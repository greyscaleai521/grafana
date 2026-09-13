import { useMemo, type ReactNode } from 'react';

import { resolveHiResTimestampsEnabled, type TimeRange } from '@grafana/data';
import { HiResTimestampsProvider } from '@grafana/ui';

import { getDashboardRealTimeThresholdDays } from './realTimeThreshold';

interface Props {
  timeRange: TimeRange;
  onRefresh?: () => void;
  children: ReactNode;
}

export function DashboardHiResTimestampsProvider({ timeRange, children }: Props) {
  const thresholdDays = getDashboardRealTimeThresholdDays();
  const enabled = resolveHiResTimestampsEnabled(timeRange, Date.now(), thresholdDays);
  const value = useMemo(
    () => ({
      enabled,
      interactive: false,
      onToggle: () => {},
      thresholdDays,
    }),
    [enabled, thresholdDays]
  );

  return <HiResTimestampsProvider value={value}>{children}</HiResTimestampsProvider>;
}
