import { render, waitFor } from '@testing-library/react';

import { type DashboardModel } from 'app/features/dashboard/state/DashboardModel';

import { ShareLinkCustom } from './ShareLinkCustom';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  reportInteraction: jest.fn(),
}));

const makeDashboard = (variables: unknown[] = []) =>
  ({
    time: { to: 'now' },
    getVariables: () => variables,
  }) as unknown as DashboardModel;

describe('ShareLinkCustom', () => {
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it('posts a share-link message including locationAccessParams on mount', async () => {
    const variables = [
      { name: 'FactoryLocation', current: { value: ['$__all'] } },
      { name: 'LocationsAccess', options: [{ value: '$__all' }, { value: 'plant-1' }, { value: 'plant-2' }] },
    ];
    render(<ShareLinkCustom dashboard={makeDashboard(variables)} />);

    await waitFor(() =>
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'share-link',
          locationAccessParams: ['plant-1', 'plant-2'],
        }),
        '*'
      )
    );
  });
});
