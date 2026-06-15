import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTextBoxVariable } from '../state/__tests__/fixtures';

import { TextBoxVariablePicker } from './TextBoxVariablePicker';

jest.mock('app/types/store', () => ({
  useDispatch: () => jest.fn(),
}));

function setup(currentValue = '') {
  const onVariableChange = jest.fn();
  const variable = createTextBoxVariable({ current: { text: currentValue, value: currentValue, selected: false } });
  render(<TextBoxVariablePicker variable={variable} onVariableChange={onVariableChange} readOnly={false} />);
  return { onVariableChange };
}

describe('TextBoxVariablePicker', () => {
  it('accepts an alphanumeric value and propagates the change on blur', async () => {
    const user = userEvent.setup();
    const { onVariableChange } = setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'prod1');
    await user.tab();

    expect(input).toHaveValue('prod1');
    expect(onVariableChange).toHaveBeenCalledTimes(1);
  });

  it('rejects characters outside [a-zA-Z0-9-] in the input handler', async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'ab@');

    // The restriction regex blocks '@', so it is dropped as it is typed.
    expect(input).toHaveValue('ab');
  });
});
