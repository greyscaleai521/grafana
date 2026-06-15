import { css, keyframes } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { Stack, useStyles2 } from '@grafana/ui';
import { LoadingSpinner } from 'app/core/components/Loaders/LoadingSpinner';
import { type DashboardInitPhase } from 'app/types/dashboard';

export interface Props {
  initPhase?: DashboardInitPhase;
}

export const DashboardLoading = ({ initPhase }: Props) => {
  const styles = useStyles2(getStyles);
  // const cancelVariables = () => {
  //   locationService.push('/');
  // };

  return (
    <div className={styles.dashboardLoading}>
      <div className={styles.dashboardLoadingText}>
        <Stack direction="column" gap={2}>
          <Stack alignItems="center" justifyContent="center" gap={0.5}>
            <LoadingSpinner />
          </Stack>{' '}
        </Stack>
      </div>
    </div>
  );
};

export const getStyles = (theme: GrafanaTheme2) => {
  // Amount of time we want to pass before we start showing loading spinner
  const slowStartThreshold = '0.5s';

  const invisibleToVisible = keyframes`
    0% { opacity: 0%; }
    100% { opacity: 100%; }
  `;

  return {
    dashboardLoading: css({
      height: '100%',
      display: 'flex',
      opacity: '0%',
      alignItems: 'center',
      justifyContent: 'center',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animation: `${invisibleToVisible} 0s step-end ${slowStartThreshold} 1 normal forwards`,
      },
    }),
    dashboardLoadingText: css({
      fontSize: theme.typography.h4.fontSize,
    }),
  };
};
