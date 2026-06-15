import { render, screen } from '@testing-library/react';
import { uniqueId } from 'lodash';

import {
  dateMath,
  dateTime,
  type EventBus,
  LoadingState,
  type PanelProps,
  type TimeRange,
  toDataFrame,
} from '@grafana/data';

import { TablePanel } from './TablePanel';
import { type Options } from './panelcfg.gen';

type Props = PanelProps<Options>;

describe('TablePanel', () => {
  it('shows a "No data" message when there are no series', () => {
    render(<TablePanel {...buildProps()} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('shows a "No data" message when series have no fields', () => {
    const props = buildProps({
      data: {
        series: [toDataFrame({ fields: [] })],
        state: LoadingState.Done,
        timeRange: createTimeRange(),
      },
    });

    render(<TablePanel {...props} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

function buildProps(overrideValues?: Partial<Props>): Props {
  const timeRange = createTimeRange();
  const defaultValues: Props = {
    id: Number(uniqueId()),
    data: {
      series: [],
      state: LoadingState.Done,
      timeRange,
    },
    options: {
      frameIndex: 0,
      showHeader: true,
    },
    transparent: false,
    timeRange,
    timeZone: 'utc',
    title: 'table',
    fieldConfig: {
      defaults: {},
      overrides: [],
    },
    onFieldConfigChange: jest.fn(),
    onOptionsChange: jest.fn(),
    onChangeTimeRange: jest.fn(),
    replaceVariables: jest.fn(),
    renderCounter: 0,
    width: 552,
    height: 250,
    eventBus: {} as EventBus,
  };

  return {
    ...defaultValues,
    ...overrideValues,
  };
}

function createTimeRange(): TimeRange {
  return {
    from: dateMath.parse('now-6h') || dateTime(),
    to: dateMath.parse('now') || dateTime(),
    raw: { from: 'now-6h', to: 'now' },
  };
}
