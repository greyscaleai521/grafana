import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type DashboardModel } from 'app/features/dashboard/state/DashboardModel';

import { BookmarkLinkCustom } from './BookmarkLinkCustom';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  reportInteraction: jest.fn(),
}));

const makeDashboard = (variables: unknown[] = []) =>
  ({
    time: { to: 'now' },
    getVariables: () => variables,
  }) as unknown as DashboardModel;

describe('BookmarkLinkCustom', () => {
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it('posts a bookmark-link message including locationAccessParams', async () => {
    const user = userEvent.setup();
    const variables = [
      { name: 'FactoryLocation', current: { value: ['$__all'] } },
      { name: 'LocationsAccess', options: [{ value: '$__all' }, { value: 'plant-1' }] },
    ];
    render(<BookmarkLinkCustom dashboard={makeDashboard(variables)} />);

    await user.type(screen.getByRole('textbox'), 'my-filter');
    await user.click(screen.getByText('Bookmark'));

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'bookmark-link',
        filterName: 'my-filter',
        locationAccessParams: ['plant-1'],
      }),
      '*'
    );
  });
});
