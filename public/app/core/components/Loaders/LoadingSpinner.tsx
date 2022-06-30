import React from 'react';
import { css, keyframes } from '@emotion/css';
import { useStyles } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';

const spinner = keyframes`
  0% {
    transform: translate3d(-50%, -50%, 0) rotate(0deg);
  }
  100% {
    transform: translate3d(-50%, -50%, 0) rotate(360deg);
  }
`;

export const LoadingSpinner = () => {
  const styles = useStyles(getStyles);

  return <div className={styles.Loading}></div>;
};

export const getStyles = (theme: GrafanaTheme) => {
  return {
    Loading: css`
      &:before {
        animation: 1.5s linear infinite ${spinner};
        animation-play-state: inherit;
        border: solid 5px #cfd0d1;
        border-bottom-color: #ff5300;
        border-radius: 50%;
        content: '';
        height: 50px;
        width: 50px;
        display: flex;
        transform: translate3d(-50%, -50%, 0);
        will-change: transform;
      }
    `,
  };
};
