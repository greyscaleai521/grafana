import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { dateTimeParse } from '@grafana/data';

import { CalendarTimePicker } from './CalendarTimePicker';

const from = dateTimeParse('2021-06-17 14:32:08', { timeZone: 'utc' });
const to = dateTimeParse('2021-06-19 23:59:00', { timeZone: 'utc' });

describe('CalendarTimePicker', () => {
  it('shows from and to times and the 24-hour wheels', () => {
    render(
      <CalendarTimePicker
        from={from}
        to={to}
        activeBound="from"
        onActiveBoundChange={jest.fn()}
        onTimeChange={jest.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /From/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /From/ })).toHaveTextContent('2021-06-17');
    expect(screen.getByRole('tab', { name: /From/ })).toHaveTextContent('14:32:08');
    expect(screen.getByRole('tab', { name: /To/ })).toHaveTextContent('2021-06-19');
    expect(screen.getByRole('tab', { name: /To/ })).toHaveTextContent('23:59:00');
    expect(screen.getByRole('button', { name: 'Hour 14', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Min 32', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sec 08', pressed: true })).toBeInTheDocument();
    expect(screen.queryByText('AM')).not.toBeInTheDocument();
    expect(screen.queryByText('PM')).not.toBeInTheDocument();
  });

  it('notifies when the active bound changes', async () => {
    const onActiveBoundChange = jest.fn();
    const user = userEvent.setup();
    render(
      <CalendarTimePicker
        from={from}
        to={to}
        activeBound="from"
        onActiveBoundChange={onActiveBoundChange}
        onTimeChange={jest.fn()}
      />
    );

    await user.click(screen.getByRole('tab', { name: /To/ }));
    expect(onActiveBoundChange).toHaveBeenCalledWith('to');
  });

  it('notifies when an hour is selected', async () => {
    const onTimeChange = jest.fn();
    const user = userEvent.setup();
    render(
      <CalendarTimePicker
        from={from}
        to={to}
        activeBound="from"
        onActiveBoundChange={jest.fn()}
        onTimeChange={onTimeChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Hour 15' }));
    expect(onTimeChange).toHaveBeenCalledWith({ hour: 15, minute: 32, second: 8 });
  });

  it('steps the hour when the wheel is scrolled', () => {
    const onTimeChange = jest.fn();
    render(
      <CalendarTimePicker
        from={from}
        to={to}
        activeBound="from"
        onActiveBoundChange={jest.fn()}
        onTimeChange={onTimeChange}
      />
    );

    fireEvent.wheel(screen.getByTestId('calendar-time-wheel-hour'), { deltaY: 40 });

    expect(onTimeChange).toHaveBeenCalledWith({ hour: 15, minute: 32, second: 8 });
  });

  it('disables minute and second wheels when hourOnly', () => {
    render(
      <CalendarTimePicker
        from={from}
        to={to}
        activeBound="from"
        hourOnly
        onActiveBoundChange={jest.fn()}
        onTimeChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Hour 15' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Min 32' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sec 08' })).toBeDisabled();
    expect(screen.getByTestId('calendar-time-wheel-min')).toHaveStyle({ overflow: 'hidden', pointerEvents: 'none' });
    expect(screen.getByTestId('calendar-time-wheel-sec')).toHaveStyle({ overflow: 'hidden', pointerEvents: 'none' });
    expect(screen.getAllByLabelText('Disabled')).toHaveLength(2);
  });
});
