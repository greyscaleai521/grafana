import { css, keyframes } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

const spinner = keyframes({
  '0%': {
    transform: 'translate3d(-50%, -50%, 0) rotate(0deg)',
  },
  '100%': {
    transform: 'translate3d(-50%, -50%, 0) rotate(360deg)',
  },
});

export const LoadingSpinner = () => {
  const styles = useStyles2(getStyles);

  return <div className={styles.loading}></div>;
};

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    loading: css({
      '&:before': {
        border: 'solid 5px #cfd0d1',
        borderBottomColor: '#ff5300',
        borderRadius: theme.shape.radius.circle,
        content: '""',
        height: '50px',
        width: '50px',
        display: 'flex',
        transform: 'translate3d(-50%, -50%, 0)',
        willChange: 'transform',
        [theme.transitions.handleMotion('no-preference')]: {
          animation: `1.5s linear infinite ${spinner}`,
          animationPlayState: 'inherit',
        },
      },
    }),
  };
};
