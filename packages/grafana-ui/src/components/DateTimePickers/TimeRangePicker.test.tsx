import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { dateTime, dateTimeParse, makeTimeRange, type TimeRange, type BootData } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';

import { HiResTimestampsProvider } from './HiResTimestampsContext';
import { TimeRangeProvider } from './TimeRangeContext';
import { TimePickerTooltip, TimeRangePicker } from './TimeRangePicker';

const selectors = e2eSelectors.components.TimePicker;

const from = dateTime('2019-12-17T07:48:27.433Z');
const to = dateTime('2019-12-18T07:48:27.433Z');

const value: TimeRange = {
  from,
  to,
  raw: { from, to },
};

const relativeValue: TimeRange = {
  from: from.subtract(1, 'hour'),
  to: to,
  raw: { from: 'now-1h', to: 'now' },
};

describe('TimePicker', () => {
  it('renders buttons correctly', () => {
    render(
      <TimeRangePicker
        onChangeTimeZone={() => {}}
        onChange={(value) => {}}
        value={value}
        onMoveBackward={() => {}}
        onMoveForward={() => {}}
        onZoom={() => {}}
      />
    );

    expect(screen.getByLabelText(/Time range selected/i)).toBeInTheDocument();
    expect(screen.queryByTestId(selectors.hiResTimestamps)).not.toBeInTheDocument();
    expect(screen.queryByTestId(selectors.formatTimeRange)).not.toBeInTheDocument();
  });

  it('renders HiRes in two lines to the left of the clock icon', () => {
    render(
      <HiResTimestampsProvider value={{ enabled: true, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={value}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    const hiRes = screen.getByTestId(selectors.hiResTimestamps);
    const openButton = screen.getByTestId(selectors.openButton);
    expect(hiRes).toHaveTextContent('HiRes');
    expect(hiRes).toHaveTextContent('Hi');
    expect(hiRes).toHaveTextContent('Res');
    expect(hiRes.tagName).toBe('SPAN');
    expect(openButton).toContainElement(hiRes);
  });

  it('shows the resolved real-time threshold in the HiRes hover', async () => {
    render(
      <HiResTimestampsProvider value={{ enabled: true, interactive: false, onToggle: jest.fn(), thresholdDays: 7 }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={value}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    await userEvent.hover(screen.getByTestId(selectors.hiResTimestamps));
    expect(await screen.findByText(/within 7 days of now/)).toBeInTheDocument();
  });

  it('renders HiRes as text only, not a button', () => {
    const onToggle = jest.fn();
    render(
      <HiResTimestampsProvider value={{ enabled: true, interactive: false, onToggle }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={value}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    const hiRes = screen.getByTestId(selectors.hiResTimestamps);
    expect(hiRes.tagName).toBe('SPAN');
    expect(screen.queryByRole('button', { name: /HiRes/ })).not.toBeInTheDocument();
  });

  it('renders HiRes on and off styles', () => {
    const { rerender } = render(
      <HiResTimestampsProvider value={{ enabled: false, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={value}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    expect(screen.getByTestId(selectors.hiResTimestamps)).toHaveTextContent('HiRes');

    rerender(
      <HiResTimestampsProvider value={{ enabled: true, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={value}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    expect(screen.getByTestId(selectors.hiResTimestamps)).toHaveTextContent('HiRes');
  });

  it('renders Format left of move forward, disabled when there is no From/To alert', () => {
    render(
      <HiResTimestampsProvider value={{ enabled: true, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={(value) => {}}
          value={relativeValue}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    const format = screen.getByTestId(selectors.formatTimeRange);
    const openButton = screen.getByTestId(selectors.openButton);
    const moveForward = screen.getByTestId(selectors.moveForwardButton);

    expect(format).toHaveTextContent('Format');
    expect(format.querySelector('svg')).toBeInTheDocument();
    expect(format).toHaveAttribute('aria-disabled', 'true');
    expect(format).toBeEnabled();
    expect(
      screen.queryByText('This range includes partial hours. Format it for a consistent hourly view.')
    ).not.toBeInTheDocument();
    expect(openButton.compareDocumentPosition(format) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(format.compareDocumentPosition(moveForward) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('enables Format and applies hour bounds when From/To need formatting', async () => {
    const onChange = jest.fn();
    const hourRange: TimeRange = {
      from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
      to: dateTimeParse('2020-01-03 23:56:59', { timeZone: 'utc' }),
      raw: {
        from: '2020-01-01 14:32:08',
        to: '2020-01-03 23:56:59',
      },
    };

    render(
      <HiResTimestampsProvider value={{ enabled: false, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={onChange}
          value={hourRange}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    const format = screen.getByTestId(selectors.formatTimeRange);
    expect(format).toHaveAttribute('aria-disabled', 'false');
    expect(
      screen.getByText('This range includes partial hours. Format it for a consistent hourly view.')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(
      screen.queryByText('This range includes partial hours. Format it for a consistent hourly view.')
    ).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(format);

    expect(onChange).toHaveBeenCalled();
    const applied = onChange.mock.lastCall?.[0] as TimeRange;
    expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-01 14:00:00.000');
    expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-03 23:59:59.999');
  });

  it('shows the Format alert again after a time range change even if it was dismissed', async () => {
    const hourRange: TimeRange = {
      from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
      to: dateTimeParse('2020-01-03 23:56:59', { timeZone: 'utc' }),
      raw: {
        from: '2020-01-01 14:32:08',
        to: '2020-01-03 23:56:59',
      },
    };
    const nextRange: TimeRange = {
      from: dateTimeParse('2020-02-01 10:15:00', { timeZone: 'utc' }),
      to: dateTimeParse('2020-02-03 18:45:00', { timeZone: 'utc' }),
      raw: {
        from: '2020-02-01 10:15:00',
        to: '2020-02-03 18:45:00',
      },
    };

    const { rerender } = render(
      <HiResTimestampsProvider value={{ enabled: false, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={() => {}}
          value={hourRange}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(
      screen.queryByText('This range includes partial hours. Format it for a consistent hourly view.')
    ).not.toBeInTheDocument();

    rerender(
      <HiResTimestampsProvider value={{ enabled: false, interactive: false, onToggle: jest.fn() }}>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={() => {}}
          value={nextRange}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </HiResTimestampsProvider>
    );

    expect(
      screen.getByText('This range includes partial hours. Format it for a consistent hourly view.')
    ).toBeInTheDocument();
  });

  it('renders move buttons with relative range', () => {
    render(
      <TimeRangePicker
        onChangeTimeZone={() => {}}
        onChange={(value) => {}}
        value={relativeValue}
        onMoveBackward={() => {}}
        onMoveForward={() => {}}
        onZoom={() => {}}
      />
    );

    expect(screen.getByLabelText(/Move time range backwards/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Move time range forwards/i)).toBeInTheDocument();
  });

  it('renders move buttons with absolute range', () => {
    render(
      <TimeRangePicker
        onChangeTimeZone={() => {}}
        onChange={(value) => {}}
        value={value}
        onMoveBackward={() => {}}
        onMoveForward={() => {}}
        onZoom={() => {}}
      />
    );

    expect(screen.getByLabelText(/Move time range backwards/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Move time range forwards/i)).toBeInTheDocument();
  });

  it('switches overlay content visibility when toolbar button is clicked twice', async () => {
    render(
      <TimeRangePicker
        onChangeTimeZone={() => {}}
        onChange={(value) => {}}
        value={value}
        onMoveBackward={() => {}}
        onMoveForward={() => {}}
        onZoom={() => {}}
      />
    );

    const openButton = screen.getByTestId(selectors.openButton);
    const overlayContent = screen.queryByTestId(selectors.overlayContent);

    expect(overlayContent).not.toBeInTheDocument();
    await userEvent.click(openButton);
    expect(screen.getByTestId(selectors.overlayContent)).toBeInTheDocument();
    await userEvent.click(openButton);
    expect(overlayContent).not.toBeInTheDocument();
  });

  it('shows a sync button if two are rendered inside a TimeRangeProvider', async () => {
    const onChange1 = jest.fn();
    const onChange2 = jest.fn();
    const value1 = makeTimeRange('2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z');
    const value2 = makeTimeRange('2024-01-01T00:00:00Z', '2024-01-01T02:00:00Z');

    render(
      <TimeRangeProvider>
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={onChange1}
          value={value1}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
        <TimeRangePicker
          onChangeTimeZone={() => {}}
          onChange={onChange2}
          value={value2}
          onMoveBackward={() => {}}
          onMoveForward={() => {}}
          onZoom={() => {}}
        />
      </TimeRangeProvider>
    );

    const syncButtons = screen.getAllByLabelText('Sync times');
    expect(syncButtons.length).toBe(2);
    await userEvent.click(syncButtons[0]);
    expect(onChange2).toBeCalledWith(value1);
    const unsyncButtons = screen.getAllByLabelText('Unsync times');
    expect(unsyncButtons.length).toBe(2);
  });
});

it('does not submit wrapping forms', async () => {
  const onSubmit = jest.fn();
  render(
    <form onSubmit={onSubmit}>
      <TimeRangePicker
        onChangeTimeZone={() => {}}
        onChange={(value) => {}}
        value={value}
        onMoveBackward={() => {}}
        onMoveForward={() => {}}
        onZoom={() => {}}
      />
    </form>
  );

  const buttons = screen.getAllByRole('button');

  for (const button of buttons) {
    await userEvent.click(button);
  }

  expect(onSubmit).not.toHaveBeenCalled();
});

it('shows CTRL+Z in zoom out tooltip when feature flag is disabled', async () => {
  window.grafanaBootData = {
    settings: {
      featureToggles: {
        newTimeRangeZoomShortcuts: false,
      },
    },
  } as BootData;

  render(
    <TimeRangePicker
      onChangeTimeZone={() => {}}
      onChange={(value) => {}}
      value={value}
      onMoveBackward={() => {}}
      onMoveForward={() => {}}
      onZoom={() => {}}
    />
  );

  const zoomButton = screen.getByLabelText('Zoom out time range');
  await userEvent.hover(zoomButton);

  expect(await screen.findByText(/CTRL\+Z/)).toBeInTheDocument();
});

it('shows t - in zoom out tooltip when feature flag is enabled', async () => {
  window.grafanaBootData = {
    settings: {
      featureToggles: {
        newTimeRangeZoomShortcuts: true,
      },
    },
  } as BootData;

  render(
    <TimeRangePicker
      onChangeTimeZone={() => {}}
      onChange={(value) => {}}
      value={value}
      onMoveBackward={() => {}}
      onMoveForward={() => {}}
      onZoom={() => {}}
    />
  );

  const zoomButton = screen.getByLabelText('Zoom out time range');
  await userEvent.hover(zoomButton);

  expect(await screen.findByText(/t -/)).toBeInTheDocument();
});

describe('TimePickerTooltip', () => {
  beforeAll(() => {
    const mockIntl = {
      resolvedOptions: () => ({
        timeZone: 'America/New_York',
      }),
    };

    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => mockIntl as Intl.DateTimeFormat);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const timeRange: TimeRange = {
    from: dateTime('2024-01-01T00:00:00Z'),
    to: dateTime('2024-01-02T00:00:00Z'),
    raw: {
      from: dateTime('2024-01-01T00:00:00Z'),
      to: dateTime('2024-01-02T00:00:00Z'),
    },
  };

  it('renders time range with UTC timezone', () => {
    render(<TimePickerTooltip timeRange={timeRange} timeZone="utc" />);

    expect(screen.getByText(/2024-01-01 00:00:00/)).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
    expect(screen.getByText(/2024-01-02 00:00:00/)).toBeInTheDocument();
    expect(screen.getByText('UTC, GMT')).toBeInTheDocument();
  });

  it('renders time range without timezone if timezone is not passed in', () => {
    render(<TimePickerTooltip timeRange={timeRange} />);
    expect(screen.queryByText(/United States, E[DS]T/)).not.toBeInTheDocument();
  });

  it('renders time range with browser timezone', () => {
    render(<TimePickerTooltip timeRange={timeRange} timeZone="browser" />);

    expect(screen.getByText('Local browser time')).toBeInTheDocument();
    expect(screen.getByText(/United States, E[DS]T/)).toBeInTheDocument(); // this was mocked at the beginning, in beforeAll block. matches either daylight savings time or standard time
  });

  it('renders time range with specific timezone', () => {
    render(<TimePickerTooltip timeRange={timeRange} timeZone="Africa/Accra" />);

    expect(screen.getByText('Ghana, GMT')).toBeInTheDocument();
  });
});
