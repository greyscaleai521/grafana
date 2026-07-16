import { css } from '@emotion/css';
import { type CSSProperties, type ReactNode } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';

import { VizTooltipRow } from './VizTooltipRow';
import { type VizTooltipItem } from './types';

interface VizTooltipContentProps {
  items: VizTooltipItem[];
  children?: ReactNode;
  scrollable?: boolean;
  isPinned: boolean;
  maxHeight?: number;
  // GSAI override: compact left-aligned tooltip layout without color indicators
  compact?: boolean;
}

export const VizTooltipContent = ({
  items,
  children,
  isPinned,
  scrollable = false,
  maxHeight,
  compact = false,
}: VizTooltipContentProps) => {
  const styles = useStyles2(getStyles, compact);

  const scrollableStyle: CSSProperties = scrollable
    ? {
        maxHeight: maxHeight,
        overflowY: 'auto',
      }
    : {};

  return (
    <div className={styles.outer} style={scrollableStyle}>
      <div className={styles.wrapper}>
        {items.map(
          ({ label, value, color, colorIndicator, colorPlacement, isActive, lineStyle, isHiddenFromViz }, i) => (
            <VizTooltipRow
              key={i}
              label={label}
              value={value}
              color={color}
              colorIndicator={colorIndicator}
              colorPlacement={colorPlacement}
              isActive={isActive}
              isPinned={isPinned}
              lineStyle={lineStyle}
              showValueScroll={!scrollable}
              isHiddenFromViz={isHiddenFromViz}
              compact={compact}
              hideColorIndicator={compact}
            />
          )
        )}
        {children}
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2, compact = false) => ({
  // GSAI override: padding lives on this outer wrapper because display:table + border-collapse ignores padding
  outer: css({
    padding: compact ? theme.spacing(2) : theme.spacing(1),
  }),
  wrapper: css({
    display: compact ? 'table' : 'flex',
    flexDirection: compact ? undefined : 'column',
    flex: 1,
    borderCollapse: compact ? 'collapse' : undefined,
    width: compact ? '100%' : undefined,
    gap: compact ? undefined : 2,
    borderTop: compact ? 'none' : `1px solid ${theme.colors.border.weak}`,
    ...(compact && {
      // remove bottom border on the last tooltip row
      '& > div:last-of-type > div': {
        borderBottom: 'none',
      },
    }),
  }),
});
