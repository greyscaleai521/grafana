import React from 'react';

import { Icon } from '@grafana/ui';
import { CustomCellRendererProps } from '@grafana/ui/src/components/Table/types';

export const InspectionsImageLinkCell = (_props: CustomCellRendererProps) => {
  return <Icon name="camera" className="inspections-image-link-icon" aria-label="View image" />;
};
