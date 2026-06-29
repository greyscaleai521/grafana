import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type DataLink } from '@grafana/data';

import { DataLinkEditor } from './DataLinkEditor';

// DataLinkInput is a Slate-based editor whose async updates trigger act() warnings
// that are unrelated to this component's toggle logic, so stub it out.
jest.mock('./DataLinkInput', () => ({
  DataLinkInput: () => <input data-testid="data-link-input" />,
}));

const baseValue: DataLink = { title: 'Title', url: 'http://example.com' };

const setup = (value: DataLink = baseValue) => {
  const onChange = jest.fn();
  const { container } = render(
    <DataLinkEditor index={0} isLast={false} value={value} suggestions={[]} onChange={onChange} />
  );
  return { onChange, container };
};

describe('DataLinkEditor', () => {
  it('renders the Navigate Parent toggle', () => {
    const { container } = setup();
    expect(container.querySelector('#navigate-parent-toggle')).toBeInTheDocument();
  });

  it('toggles targetTop when the Navigate Parent switch is changed', async () => {
    const user = userEvent.setup();
    const { onChange, container } = setup();

    const toggle = container.querySelector('#navigate-parent-toggle')!;
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith(0, { ...baseValue, targetTop: true });
  });

  it('reflects the current targetTop value', () => {
    const { container } = setup({ ...baseValue, targetTop: true });
    expect(container.querySelector('#navigate-parent-toggle')).toBeChecked();
  });
});
