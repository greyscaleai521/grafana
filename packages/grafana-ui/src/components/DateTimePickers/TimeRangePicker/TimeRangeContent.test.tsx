import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { dateTimeParse, type FeatureToggles, systemDateFormats, type TimeRange } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { HiResTimestampsProvider } from '../HiResTimestampsContext';
import * as commonFormatModule from '../commonFormat';

import { TimeRangeContent } from './TimeRangeContent';

// If this flag is deleted, this mock also should be, and the additional tests for when
// the flag was disabled.
type LocaleFormatPreferenceType = FeatureToggles['localeFormatPreference'];
jest.mock('../commonFormat', () => {
  const format = 'YYYY-MM-DD HH:mm:ss' as const;
  const moduleObject = {
    __esModule: true,
    commonFormat: format as undefined | 'YYYY-MM-DD HH:mm:ss',
    mockSetCommonFormat,
  };
  function mockSetCommonFormat(enabled: LocaleFormatPreferenceType = true) {
    moduleObject.commonFormat = enabled ? format : undefined;
  }
  return moduleObject;
});
// @ts-expect-error mockSetCommonFormat doesn't exist on the export type of commonFormat,
// but it's added above in the mock.
const mockSetCommonFormat: (enabled: LocaleFormatPreferenceType) => void = commonFormatModule.mockSetCommonFormat;

const mockClipboard = {
  writeText: jest.fn(),
  readText: jest.fn(),
};

const defaultTimeRange: TimeRange = {
  from: dateTimeParse('2021-06-17 00:00:00', { timeZone: 'utc' }),
  to: dateTimeParse('2021-06-19 23:59:00', { timeZone: 'utc' }),
  raw: {
    from: '2021-06-17 00:00:00',
    to: '2021-06-19 23:59:00',
  },
};

const customRawTimeRange = {
  from: '2023-06-17 00:00:00',
  to: '2023-06-19 23:59:00',
};

const mockOnApply = jest.fn();

beforeEach(() => {
  mockSetCommonFormat(true);
  mockOnApply.mockClear();
});

function boundTab(name: 'From' | 'To', container?: HTMLElement) {
  const root = container ? within(container) : screen;
  return root.getByRole('tab', { name: new RegExp(`^${name}`) });
}

function expectBound(name: 'From' | 'To', date: string, time: string, container?: HTMLElement) {
  const tab = boundTab(name, container);
  expect(tab).toHaveTextContent(date);
  expect(tab).toHaveTextContent(time);
}

function setup(initial: TimeRange = defaultTimeRange, timeZone = 'utc', hiResTimestamps?: { enabled: boolean }) {
  const content = <TimeRangeContent isFullscreen={true} value={initial} onApply={mockOnApply} timeZone={timeZone} />;

  return {
    ...render(
      hiResTimestamps ? (
        <HiResTimestampsProvider value={{ enabled: hiResTimestamps.enabled, interactive: false, onToggle: () => {} }}>
          {content}
        </HiResTimestampsProvider>
      ) : (
        content
      )
    ),
    getCalendarDayByLabelText: (label: string) => {
      const item = screen.getByLabelText(label);
      return item?.parentElement as HTMLButtonElement;
    },
  };
}

describe('TimeRangeForm', () => {
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    mockClipboard.writeText.mockClear();
    mockClipboard.readText.mockClear();
    user = userEvent.setup();
    Object.defineProperty(global.navigator, 'clipboard', {
      value: mockClipboard,
    });
  });

  it('should render form correctly', () => {
    const { getByText } = setup();
    const { TimePicker } = selectors.components;

    expect(getByText('Apply time range')).toBeInTheDocument();
    expect(boundTab('From')).toBeInTheDocument();
    expect(boundTab('To')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'From' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'To' })).not.toBeInTheDocument();
    expect(screen.getByTestId(TimePicker.calendar.label)).toBeInTheDocument();
  });

  it('shows the calendar and time picker in the absolute range form', () => {
    setup();
    const { TimePicker } = selectors.components;

    expect(screen.getByTestId(TimePicker.calendar.label)).toBeInTheDocument();
    expect(screen.getByTestId('calendar-time-picker')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /From/ })).toHaveTextContent('2021-06-17');
    expect(screen.getByRole('tab', { name: /To/ })).toHaveTextContent('2021-06-19');
    expect(screen.getByRole('tab', { name: /To/ })).toHaveTextContent('23:59:00');
  });

  it('should have passed time range entered in form', () => {
    setup();

    expectBound('From', '2021-06-17', '00:00:00');
    expectBound('To', '2021-06-19', '23:59:00');
  });

  it('should parse UTC iso strings and render in current timezone', () => {
    setup(
      {
        from: defaultTimeRange.from,
        to: defaultTimeRange.to,
        raw: {
          from: defaultTimeRange.from.toISOString(),
          to: defaultTimeRange.to.toISOString(),
        },
      },
      'America/New_York'
    );

    expectBound('From', '2021-06-16', '20:00:00');
    expectBound('To', '2021-06-19', '19:59:00');
  });

  it('copy in UTC then paste into different timezone should convert times', async () => {
    const sourceRange: TimeRange = {
      from: defaultTimeRange.from,
      to: defaultTimeRange.to,
      raw: {
        from: defaultTimeRange.from,
        to: defaultTimeRange.to,
      },
    };

    const source = setup(sourceRange);

    let written = '';
    mockClipboard.writeText.mockImplementation((text: string) => {
      written = text;
      return Promise.resolve();
    });

    await user.click(within(source.container).getByTestId('data-testid TimePicker copy button'));

    const target = setup(undefined, 'America/New_York');

    mockClipboard.readText.mockResolvedValue(written);

    const targetPasteButton = within(target.container).getByTestId('data-testid TimePicker paste button');
    await user.click(targetPasteButton);

    expectBound('From', '2021-06-16', '20:00:00', target.container);
    expectBound('To', '2021-06-19', '19:59:00', target.container);
  });

  describe('when common format are entered', () => {
    it('applies those dates in the current timezone', async () => {
      const range: TimeRange = {
        from: dateTimeParse('2021-05-10 20:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('2021-05-12 19:59:00', { timeZone: 'utc' }),
        raw: {
          from: '2021-05-10 20:00:00',
          to: '2021-05-12 19:59:00',
        },
      };
      setup(range);

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      const appliedOrUndefined = mockOnApply.mock.lastCall?.at(0) as undefined | TimeRange;
      expect(appliedOrUndefined).not.toBe(undefined);
      const applied = appliedOrUndefined!;
      expect(applied.from.toISOString()).toBe('2021-05-10T20:00:00.000Z');
      expect(applied.to.toISOString()).toBe('2021-05-12T19:59:00.000Z');
    });
  });

  // once localeFormatPreference is permanently on, the only tests that should remain
  // in this block will be ones that ensures the system format is *not* used
  describe('Given custom system date format', () => {
    const originalFullDate = systemDateFormats.fullDate;
    beforeEach(() => {
      systemDateFormats.fullDate = 'DD.MM.YYYY HH:mm:ss';
    });

    afterAll(() => {
      systemDateFormats.fullDate = originalFullDate;
    });

    it('should parse UTC iso strings and render them in the current timezone', () => {
      setup(
        {
          from: defaultTimeRange.from,
          to: defaultTimeRange.to,
          raw: {
            from: defaultTimeRange.from.toISOString(),
            to: defaultTimeRange.to.toISOString(),
          },
        },
        'America/New_York'
      );

      expectBound('From', '2021-06-16', '20:00:00');
      expectBound('To', '2021-06-19', '19:59:00');
    });

    describe('when common format dates are entered', () => {
      it('applies those dates in the current timezone', async () => {
        const range: TimeRange = {
          from: dateTimeParse('2021-05-10 20:00:00', { timeZone: 'utc' }),
          to: dateTimeParse('2021-05-12 19:59:00', { timeZone: 'utc' }),
          raw: {
            from: '2021-05-10 20:00:00',
            to: '2021-05-12 19:59:00',
          },
        };
        setup(range);

        await user.click(screen.getByRole('button', { name: 'Apply time range' }));

        const appliedOrUndefined = mockOnApply.mock.lastCall?.at(0) as undefined | TimeRange;
        expect(appliedOrUndefined).not.toBe(undefined);
        const applied = appliedOrUndefined!;
        expect(applied.from.toISOString()).toBe('2021-05-10T20:00:00.000Z');
        expect(applied.to.toISOString()).toBe('2021-05-12T19:59:00.000Z');
      });
    });

    describe('when the localeFormatPreference feature toggle is off', () => {
      beforeEach(() => {
        // when localeFormatPreference is permanently on, the parent describe block ("Given custom systemdate format")
        // needs to be cleared out as most of these tests will be redundant.
        mockSetCommonFormat(false);
      });

      it('should parse UTC ISO strings and render them in the current timezone', () => {
        setup(
          {
            from: defaultTimeRange.from,
            to: defaultTimeRange.to,
            raw: {
              from: defaultTimeRange.from.toISOString(),
              to: defaultTimeRange.to.toISOString(),
            },
          },
          'America/New_York'
        );

        expectBound('From', '2021-06-16', '20:00:00');
        expectBound('To', '2021-06-19', '19:59:00');
      });

      describe('when common format dates are used', () => {
        it('should show an error because of parsing failure', () => {
          const invalidTimeRange: TimeRange = {
            from: dateTimeParse('2021-05-10 20:00:00', { timeZone: 'utc' }),
            to: dateTimeParse('2021-05-12 19:59:00', { timeZone: 'utc' }),
            raw: {
              from: '2021-05-10 20:00:00',
              to: '2021-05-12 19:59:00',
            },
          };
          setup(invalidTimeRange);

          const error = screen.getAllByRole('alert');
          expect(error).toHaveLength(2);
          expect(error[0]).toBeVisible();
          expect(error[0]).toHaveTextContent('Please enter a past date or "now"');
        });
      });

      describe('when system format dates are used', () => {
        it('should apply the parsed range', async () => {
          const range: TimeRange = {
            from: dateTimeParse('10.05.2021 20:00:00', { timeZone: 'utc' }),
            to: dateTimeParse('12.05.2021 19:59:00', { timeZone: 'utc' }),
            raw: {
              from: '10.05.2021 20:00:00',
              to: '12.05.2021 19:59:00',
            },
          };
          setup(range);

          await user.click(screen.getByRole('button', { name: 'Apply time range' }));

          const appliedOrUndefined = mockOnApply.mock.lastCall?.at(0) as undefined | TimeRange;
          expect(appliedOrUndefined).not.toBe(undefined);
          const applied = appliedOrUndefined!;
          expect(applied.from.toISOString()).toBe('2021-05-10T20:00:00.000Z');
          expect(applied.to.toISOString()).toBe('2021-05-12T19:59:00.000Z');
        });
      });
    });
  });

  it('should have passed time range selected in calendar', () => {
    const { getCalendarDayByLabelText } = setup();
    const from = getCalendarDayByLabelText('June 17, 2021');
    const to = getCalendarDayByLabelText('June 19, 2021');

    expect(from).toHaveClass('react-calendar__tile--rangeStart');
    expect(to).toHaveClass('react-calendar__tile--rangeEnd');
  });

  it('should select correct time range in calendar when having a custom time zone', () => {
    const { getCalendarDayByLabelText } = setup(defaultTimeRange, 'Asia/Tokyo');
    const from = getCalendarDayByLabelText('June 17, 2021');
    const to = getCalendarDayByLabelText('June 19, 2021');

    expect(from).toHaveClass('react-calendar__tile--rangeStart');
    expect(to).toHaveClass('react-calendar__tile--rangeEnd');
  });

  it('shows from and to time wheels in the calendar', () => {
    setup();

    expect(screen.getByTestId('calendar-time-picker')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /From/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Hour 00', pressed: true })).toBeInTheDocument();
  });

  it('switches the time wheels to To after the from date is selected', async () => {
    const { getCalendarDayByLabelText } = setup();

    await user.click(getCalendarDayByLabelText('June 18, 2021'));

    expect(screen.getByRole('tab', { name: /To/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults from to 00:00:00 and to to 23:59:59 when dates are selected', async () => {
    const { getCalendarDayByLabelText } = setup();

    await user.click(getCalendarDayByLabelText('June 18, 2021'));
    await user.click(getCalendarDayByLabelText('June 20, 2021'));

    expectBound('From', '2021-06-18', '00:00:00');
    expectBound('To', '2021-06-20', '23:59:59');
    expect(screen.getByRole('tab', { name: /From/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument();
  });

  it('collapses the calendar after a range is selected and keeps the to month', async () => {
    const { getCalendarDayByLabelText } = setup();

    await user.click(getCalendarDayByLabelText('June 18, 2021'));
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(getCalendarDayByLabelText('July 5, 2021'));

    expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument();
    expectBound('From', '2021-06-18', '00:00:00');
    expectBound('To', '2021-07-05', '23:59:59');

    await user.click(screen.getByRole('button', { name: 'Calendar' }));

    expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('July 2021')).toBeInTheDocument();
  });

  it('updates From time from the hour wheel', async () => {
    setup();

    await user.click(screen.getByRole('button', { name: 'Hour 15' }));

    expectBound('From', '2021-06-17', '15:00:00');
  });

  it('should copy time range to clipboard', async () => {
    setup();

    await user.click(screen.getByTestId('data-testid TimePicker copy button'));
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify({ from: defaultTimeRange.raw.from, to: defaultTimeRange.raw.to })
    );
  });

  it('should paste time range from clipboard', async () => {
    const { getByTestId } = setup();

    mockClipboard.readText.mockResolvedValue(JSON.stringify(customRawTimeRange));

    await userEvent.click(getByTestId('data-testid TimePicker paste button'));

    expectBound('From', '2023-06-17', '00:00:00');
    expectBound('To', '2023-06-19', '23:59:00');
  });

  describe('dates error handling', () => {
    it('should show error on invalid dates', () => {
      const invalidTimeRange: TimeRange = {
        from: dateTimeParse('foo', { timeZone: 'utc' }),
        to: dateTimeParse('2021-06-19 23:59:00', { timeZone: 'utc' }),
        raw: {
          from: 'foo',
          to: '2021-06-19 23:59:00',
        },
      };
      const { getAllByRole } = setup(invalidTimeRange, 'Asia/Tokyo');
      const error = getAllByRole('alert');

      expect(error).toHaveLength(1);
      expect(error[0]).toBeVisible();
      expect(error[0]).toHaveTextContent('Please enter a past date or "now"');
    });

    it('should show error on invalid range', () => {
      const invalidTimeRange: TimeRange = {
        from: dateTimeParse('2021-06-19 00:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('2021-06-17 23:59:00', { timeZone: 'utc' }),
        raw: {
          from: '2021-06-19 00:00:00',
          to: '2021-06-17 23:59:00',
        },
      };
      const { getAllByRole } = setup(invalidTimeRange, 'Asia/Tokyo');
      const error = getAllByRole('alert');

      expect(error[0]).toBeVisible();
      expect(error[0]).toHaveTextContent('"From" can\'t be after "To"');
    });

    it('should not show range error when "to" is invalid', () => {
      const invalidTimeRange: TimeRange = {
        from: dateTimeParse('2021-06-19 00:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('foo', { timeZone: 'utc' }),
        raw: {
          from: '2021-06-19 00:00:00',
          to: 'foo',
        },
      };
      const { getAllByRole } = setup(invalidTimeRange, 'Asia/Tokyo');
      const error = getAllByRole('alert');

      expect(error).toHaveLength(1);
      expect(error[0]).toBeVisible();
      expect(error[0]).toHaveTextContent('Please enter a past date or "now"');
    });
  });

  describe('when HiRes timestamps are off', () => {
    it('blocks apply for absolute times with minutes or seconds', () => {
      const hourRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 15:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-03 15:59:59',
        },
      };
      setup(hourRange, 'utc', { enabled: false });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'HiRes is off. Format sets time to the hour start.'
      );
      expect(screen.getByRole('alert')).toHaveStyle({ background: '#fff' });
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Format & Apply time range' })).not.toBeInTheDocument();
    });

    it('disables calendar minute and second wheels', async () => {
      const hourRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 15:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-03 15:59:59',
        },
      };
      setup(hourRange, 'utc', { enabled: false });

      expect(screen.getByRole('button', { name: 'Hour 15' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Min 32' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Sec 08' })).toBeDisabled();
      expect(screen.getAllByLabelText('Disabled')).toHaveLength(2);
    });

    it('allows apply for hour-only absolute times', async () => {
      const hourRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-01 15:00:00', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:00:00',
          to: '2020-01-01 15:00:00',
        },
      };
      setup(hourRange, 'utc', { enabled: false });

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
    });

    it('allows apply when minutes and seconds are 59:59', async () => {
      const endOfHourRange: TimeRange = {
        from: dateTimeParse('2026-07-22 00:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('2026-07-24 23:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2026-07-22 00:00:00',
          to: '2026-07-24 23:59:59',
        },
      };
      setup(endOfHourRange, 'utc', { enabled: false });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-07-22 00:00:00.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-07-24 23:59:59.999');
    });

    it('revalidates when the draft range requires hour-only', () => {
      const hourRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 15:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-03 15:59:59',
        },
      };
      setup(hourRange, 'utc', { enabled: false });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'HiRes is off. Format sets time to the hour start.'
      );
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();
    });

    it('always revalidates when applying from and to', () => {
      const hourRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:15:00', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 16:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:15:00',
          to: '2020-01-03 16:59:59',
        },
      };
      setup(hourRange, 'utc', { enabled: false });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'HiRes is off. Format sets time to the hour start.'
      );
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();
    });

    it('Apply formats From at 59:59 to 00:00.000', async () => {
      const range: TimeRange = {
        from: dateTimeParse('2026-08-03 13:59:59', { timeZone: 'utc' }),
        to: dateTimeParse('2026-08-04 14:59:59', { timeZone: 'utc' }),
        raw: {
          from: '2026-08-03 13:59:59',
          to: '2026-08-04 14:59:59',
        },
      };
      setup(range, 'utc', { enabled: false });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'HiRes is off. Format sets time to the hour start.'
      );
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-08-03 13:00:00.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-08-04 14:59:59.999');
    });

    it('Apply formats To at 00:00 to the previous second', async () => {
      const range: TimeRange = {
        from: dateTimeParse('2020-01-01 14:00:00', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 15:00:00', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:00:00',
          to: '2020-01-03 15:00:00',
        },
      };
      setup(range, 'utc', { enabled: false });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'HiRes is off. Format sets time to the hour end.'
      );
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-01 14:00:00.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-03 14:59:59.999');
    });

    it('Apply formats from to 00:00.000 and to to 59:59.999 when HiRes is off', async () => {
      const range: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 23:56:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-03 23:56:59',
        },
      };
      setup(range, 'utc', { enabled: false });

      const alerts = screen.getAllByRole('alert');
      expect(alerts[0]).toHaveTextContent('HiRes is off. Format sets time to the hour start.');
      expect(alerts[1]).toHaveTextContent('HiRes is off. Format sets time to the hour end.');
      expect(alerts[0]).toHaveStyle({ background: '#fff' });
      expect(alerts[1]).toHaveStyle({ background: '#fff' });

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-01 14:00:00.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-03 23:59:59.999');
    });

    it('snaps hour bounds in UTC for fractional-hour timezones', async () => {
      const range: TimeRange = {
        from: dateTimeParse('2026-08-03 18:00:00', { timeZone: 'Asia/Kolkata' }),
        to: dateTimeParse('2026-08-05 18:59:59', { timeZone: 'Asia/Kolkata' }),
        raw: {
          from: '2026-08-03 18:00:00',
          to: '2026-08-05 18:59:59',
        },
      };
      setup(range, 'Asia/Kolkata', { enabled: false });

      expect(
        screen.getByText('HiRes off snaps hours in UTC. In this timezone that shows as :30 or :29.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply time range' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.toISOString()).toBe('2026-08-03T12:00:00.000Z');
      expect(applied.to.toISOString()).toBe('2026-08-05T13:59:59.999Z');
    });

    it('does not show the UTC hour note for whole-hour timezones', () => {
      const range: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-03 23:56:59', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-03 23:56:59',
        },
      };
      setup(range, 'utc', { enabled: false });

      expect(
        screen.queryByText('HiRes off snaps hours in UTC. In this timezone that shows as :30 or :29.')
      ).not.toBeInTheDocument();
    });

    it('formats relative ranges when HiRes is off', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-16T14:32:08.000Z'));
      const relativeRange: TimeRange = {
        from: dateTimeParse('now-90d', { timeZone: 'utc' }),
        to: dateTimeParse('now', { timeZone: 'utc' }),
        raw: {
          from: 'now-90d',
          to: 'now',
        },
      };
      setup(relativeRange, 'utc', { enabled: false });

      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-06-18 14:00:00.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-09-16 14:59:59.999');
      jest.useRealTimers();
    });

    it('Apply leaves HiRes-on absolute minutes unchanged', async () => {
      const shortRange: TimeRange = {
        from: dateTimeParse('2020-01-01 14:32:08', { timeZone: 'utc' }),
        to: dateTimeParse('2020-01-01 16:45:12', { timeZone: 'utc' }),
        raw: {
          from: '2020-01-01 14:32:08',
          to: '2020-01-01 16:45:12',
        },
      };
      setup(shortRange, 'utc', { enabled: true });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.from.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-01 14:32:08.000');
      expect(applied.to.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2020-01-01 16:45:12.000');
    });

    it('Apply leaves relative ranges unchanged', async () => {
      const relativeRange: TimeRange = {
        from: dateTimeParse('now-6h', { timeZone: 'utc' }),
        to: dateTimeParse('now', { timeZone: 'utc' }),
        raw: {
          from: 'now-6h',
          to: 'now',
        },
      };
      setup(relativeRange, 'utc', { enabled: true });

      await user.click(screen.getByRole('button', { name: 'Apply time range' }));

      expect(mockOnApply).toHaveBeenCalled();
      const applied = mockOnApply.mock.lastCall?.[0] as TimeRange;
      expect(applied.raw.from).toBe('now-6h');
      expect(applied.raw.to).toBe('now');
    });
  });
});
