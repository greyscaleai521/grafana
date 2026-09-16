import { createContext, useContext, type ReactNode } from 'react';

export interface HiResTimestampsContextValue {
  enabled: boolean;
  interactive: boolean;
  onToggle: () => void;
  thresholdDays?: number;
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

export interface HiResFormatToolbarApi {
  setDraftNeedsFormat: (needsFormat: boolean, rangeKey?: string) => void;
  registerFormat: (format: (() => void) | undefined) => void;
}

const HiResFormatToolbarContext = createContext<HiResFormatToolbarApi | undefined>(undefined);

export function HiResFormatToolbarProvider({
  value,
  children,
}: {
  value: HiResFormatToolbarApi;
  children: ReactNode;
}) {
  return <HiResFormatToolbarContext.Provider value={value}>{children}</HiResFormatToolbarContext.Provider>;
}

export function useHiResFormatToolbar(): HiResFormatToolbarApi | undefined {
  return useContext(HiResFormatToolbarContext);
}
