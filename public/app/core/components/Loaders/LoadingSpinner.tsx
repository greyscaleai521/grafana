import { css, keyframes } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

const spinner = keyframes({
  '0%': {
    transform: 'rotate(0deg)',
  },
  '100%': {
    transform: 'rotate(360deg)',
  },
});

export const LoadingSpinner = () => {
  const styles = useStyles2(getStyles);

  return <div className={styles.loading}></div>;
};

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    // Fills its parent and centers the spinner, so the rotating circle always
    // sits in the middle of whatever box it is given (use a full-height parent
    // to center it on screen).
    loading: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      '&:before': {
        content: '""',
        display: 'block',
        border: 'solid 5px #cfd0d1',
        // GSAI override: brand accent (see $gsai-brand-orange in _gsai-overrides.scss)
        borderBottomColor: '#ff5300',
        borderRadius: theme.shape.radius.circle,
        height: '50px',
        width: '50px',
        willChange: 'transform',
        [theme.transitions.handleMotion('no-preference')]: {
          animation: `1.5s linear infinite ${spinner}`,
          animationPlayState: 'inherit',
        },
      },
    }),
  };
};
