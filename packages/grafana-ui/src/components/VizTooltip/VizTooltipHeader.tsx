import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';

import { VizTooltipRow } from './VizTooltipRow';
import { type VizTooltipItem } from './types';

interface Props {
  item: VizTooltipItem;
  isPinned: boolean;
  // GSAI override: compact left-aligned tooltip layout without color indicators
  compact?: boolean;
}

export const VizTooltipHeader = ({ item: { label, value, color, colorIndicator }, isPinned, compact = false }: Props) => {
  const styles = useStyles2(getStyles, compact);
  return (
    <div className={styles}>
      <VizTooltipRow
        label={label}
        value={value}
        color={color}
        colorIndicator={colorIndicator}
        marginRight={compact ? undefined : '22px'}
        isPinned={isPinned}
        compact={compact}
        hideColorIndicator={compact}
      />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2, compact = false) =>
  css({
    display: compact ? 'table' : 'flex',
    flexDirection: compact ? undefined : 'column',
    borderCollapse: compact ? 'collapse' : undefined,
    width: compact ? '100%' : undefined,
    flex: 1,
    padding: theme.spacing(1),
    lineHeight: 1,
  });
