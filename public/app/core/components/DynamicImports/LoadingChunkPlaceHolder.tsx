import React, { FunctionComponent } from 'react';
// import { LoadingPlaceholder } from '@grafana/ui';

import { LoadingSpinner } from '../Loaders/LoadingSpinner';

export const LoadingChunkPlaceHolder: FunctionComponent = React.memo(() => (
  <div className="preloader">
    {/* <LoadingPlaceholder text={'Loading...'} /> */}
    <LoadingSpinner />
  </div>
));

LoadingChunkPlaceHolder.displayName = 'LoadingChunkPlaceHolder';
