import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createCustomRangeVariable } from '../state/__tests__/fixtures';

import { CustomRangeVariablePicker } from './CustomRangeVariablePicker';

jest.mock('app/types/store', () => ({
  useDispatch: () => jest.fn(),
}));

function setup(currentValue = '') {
  const onVariableChange = jest.fn();
  const variable = createCustomRangeVariable({ current: { text: currentValue, value: currentValue, selected: false } });
  render(<CustomRangeVariablePicker variable={variable} onVariableChange={onVariableChange} readOnly={false} />);
  return { onVariableChange };
}

describe('CustomRangeVariablePicker', () => {
  it('accepts a single number and propagates the change on blur', async () => {
    const user = userEvent.setup();
    const { onVariableChange } = setup();

    const input = screen.getByRole('textbox');
    await user.type(input, '1.2');
    await user.tab();

    expect(onVariableChange).toHaveBeenCalledTimes(1);
  });

  it('accepts a number range and propagates the change on blur', async () => {
    const user = userEvent.setup();
    const { onVariableChange } = setup();

    const input = screen.getByRole('textbox');
    await user.type(input, '1.2-100.4');
    await user.tab();

    expect(onVariableChange).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid value and does not propagate the change', async () => {
    const user = userEvent.setup();
    const { onVariableChange } = setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'not-a-range');
    await user.tab();

    expect(onVariableChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('not-a-range');
  });

  it('rejects characters outside [a-zA-Z0-9-] in the input handler', async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByRole('textbox');
    await user.type(input, '1.2');

    // The restriction regex blocks '.', so the dot is dropped as it is typed.
    expect(input).toHaveValue('12');
  });
});
