import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { selectors } from '@grafana/e2e-selectors';

import { DataLinksContextMenu } from './DataLinksContextMenu';

const fakeAriaLabel = 'fake aria label';
describe('DataLinksContextMenu', () => {
  it('renders context menu when there are more than one data links', () => {
    render(
      <DataLinksContextMenu
        links={() => [
          {
            href: '/link1',
            title: 'Link1',
            target: '_blank',
            origin: {},
          },
          {
            href: '/link2',
            title: 'Link2',
            target: '_blank',
            origin: {},
          },
        ]}
      >
        {() => {
          return <div aria-label="fake aria label" />;
        }}
      </DataLinksContextMenu>
    );

    expect(screen.getByLabelText(fakeAriaLabel)).toBeInTheDocument();
    expect(screen.queryAllByLabelText(selectors.components.DataLinksContextMenu.singleLink)).toHaveLength(0);
  });

  it('renders link when there is a single data link', () => {
    render(
      <DataLinksContextMenu
        links={() => [
          {
            href: '/link1',
            title: 'Link1',
            target: '_blank',
            origin: {},
          },
        ]}
      >
        {() => {
          return <div aria-label="fake aria label" />;
        }}
      </DataLinksContextMenu>
    );

    expect(screen.getByLabelText(fakeAriaLabel)).toBeInTheDocument();
    expect(screen.getByTestId(selectors.components.DataLinksContextMenu.singleLink)).toBeInTheDocument();
  });

  it('posts a navigateUrl message to the parent window when a single _top link is clicked', async () => {
    const user = userEvent.setup();
    const postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

    render(
      <DataLinksContextMenu
        links={() => [
          {
            href: '/link1',
            title: 'Link1',
            target: '_top',
            origin: {},
          },
        ]}
      >
        {() => {
          return <div aria-label="fake aria label" />;
        }}
      </DataLinksContextMenu>
    );

    const link = screen.getByTestId(selectors.components.DataLinksContextMenu.singleLink);
    // The _top variant intentionally has no href; navigation is delegated to the parent frame.
    expect(link).not.toHaveAttribute('href');

    await user.click(link);

    expect(postMessageSpy).toHaveBeenCalledWith({ key: 'navigateUrl', value: '/link1' }, '*');

    postMessageSpy.mockRestore();
  });

  it('renders a normal href link for a single non-_top link', () => {
    render(
      <DataLinksContextMenu
        links={() => [
          {
            href: '/link1',
            title: 'Link1',
            target: '_blank',
            origin: {},
          },
        ]}
      >
        {() => {
          return <div aria-label="fake aria label" />;
        }}
      </DataLinksContextMenu>
    );

    const link = screen.getByTestId(selectors.components.DataLinksContextMenu.singleLink);
    expect(link).toHaveAttribute('href', '/link1');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
