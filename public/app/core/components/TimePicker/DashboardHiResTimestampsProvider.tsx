import { useMemo, type ReactNode } from 'react';

import { resolveHiResTimestampsEnabled, type TimeRange } from '@grafana/data';
import { HiResTimestampsProvider } from '@grafana/ui';

interface Props {
  timeRange: TimeRange;
  onRefresh?: () => void;
  children: ReactNode;
}

export function DashboardHiResTimestampsProvider({ timeRange, children }: Props) {
  const enabled = resolveHiResTimestampsEnabled(timeRange);
  const value = useMemo(
    () => ({
      enabled,
      interactive: false,
      onToggle: () => {},
    }),
    [enabled]
  );

  return <HiResTimestampsProvider value={value}>{children}</HiResTimestampsProvider>;
}
