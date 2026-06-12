import { render, screen } from '@testing-library/react';

import { createDashboardModelFixture } from '../../state/__fixtures__/dashboardFixtures';

import { ShareDashboard } from './ShareDashboard';

describe('ShareDashboard', () => {
  it('renders the bookmark and share toolbar buttons', () => {
    const dashboard = createDashboardModelFixture({});

    render(<ShareDashboard dashboard={dashboard} />);

    expect(screen.getByRole('button', { name: 'Bookmark dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share dashboard' })).toBeInTheDocument();
  });
});
