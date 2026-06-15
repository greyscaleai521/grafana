import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type DataFrame, type Field, FieldType, type LinkTarget, arrayToDataFrame } from '@grafana/data';

import { DataHoverView } from './DataHoverView';

function frameWithLinkTarget(target: LinkTarget): DataFrame {
  const field: Field = {
    name: 'value',
    type: FieldType.number,
    values: [1],
    config: { links: [{ title: 'Go', url: 'http://example.com' }] },
    display: (v) => ({ text: String(v), numeric: Number(v) }),
    getLinks: () => [{ title: 'Go', href: 'http://example.com', target, origin: field }],
  };

  return { name: 'frame', length: 1, fields: [field] };
}

describe('DataHoverView component', () => {
  it('should default to multi mode if mode is null or undefined', () => {
    const data = arrayToDataFrame([{ foo: 'bar' }]);
    render(<DataHoverView data={data} rowIndex={0} />);

    expect(screen.queryByText('bar')).toBeInTheDocument();
  });

  it('posts a navigateUrl message to the parent window when a _top link is clicked', async () => {
    const postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<DataHoverView data={frameWithLinkTarget('_top')} rowIndex={0} />);

    await user.click(screen.getByText('Go'));

    expect(postMessageSpy).toHaveBeenCalledWith({ key: 'navigateUrl', value: 'http://example.com' }, '*');

    postMessageSpy.mockRestore();
  });

  it('renders a regular link (with href) for non-_top targets', () => {
    const postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

    render(<DataHoverView data={frameWithLinkTarget('_blank')} rowIndex={0} />);

    expect(screen.getByText('Go')).toHaveAttribute('href', 'http://example.com');
    expect(postMessageSpy).not.toHaveBeenCalled();

    postMessageSpy.mockRestore();
  });

  it('highlights the display row matching columnIndex', () => {
    const data = arrayToDataFrame([{ a: 1, b: 2 }]);
    const { container } = render(<DataHoverView data={data} rowIndex={0} columnIndex={1} />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveAttribute('class', '');
    expect(rows[1].className).not.toBe('');
  });
});
