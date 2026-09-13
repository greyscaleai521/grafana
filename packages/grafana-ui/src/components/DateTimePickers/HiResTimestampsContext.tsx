import { createContext, useContext, type ReactNode } from 'react';

export interface HiResTimestampsContextValue {
  enabled: boolean;
  interactive: boolean;
  onToggle: () => void;
}

const HiResTimestampsContext = createContext<HiResTimestampsContextValue | undefined>(undefined);

export function HiResTimestampsProvider({
  value,
  children,
}: {
  value: HiResTimestampsContextValue;
  children: ReactNode;
}) {
  return <HiResTimestampsContext.Provider value={value}>{children}</HiResTimestampsContext.Provider>;
}

export function useHiResTimestamps(): HiResTimestampsContextValue | undefined {
  return useContext(HiResTimestampsContext);
}
