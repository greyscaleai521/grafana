import { render, screen } from '@testing-library/react';

import { createDataFrame, type Field, FieldType, makeTimeRange } from '@grafana/data';
import { TooltipDisplayMode } from '@grafana/ui';

import { StateTimelineTooltip } from './StateTimelineTooltip';

describe('StateTimelineTooltip', () => {
  const timeRange = makeTimeRange('1970-01-01T00:00:00+00:00', '1970-01-01T00:02:00+00:00');
  const timeField: Field = {
    name: 'Time',
    type: FieldType.time,
    values: [0, 60000, 100000],
    display: (v) => ({ text: String(v), numeric: NaN }),
    config: {},
  };
  const valueField: Field = {
    name: 'State',
    type: FieldType.number,
    values: [0, 100, 50],
    display: (v) => ({ text: String(v), numeric: Number(v) }),
    config: {},
  };
  const series = createDataFrame({ fields: [timeField, valueField] });

  describe('Duration display', () => {
    it('should include the duration in single mode when withDuration is true', () => {
      render(
        <StateTimelineTooltip
          series={series}
          seriesIdx={1}
          dataIdxs={[null, 1]}
          mode={TooltipDisplayMode.Single}
          timeRange={timeRange}
          withDuration
          dataLinks={[]}
          isPinned={false}
        />
      );

      expect(screen.queryByText('State')).toBeInTheDocument();
      expect(screen.queryByText('100')).toBeInTheDocument();
      expect(screen.queryByText('Duration')).toBeInTheDocument();
      expect(screen.queryByText('40s')).toBeInTheDocument(); // 100000 - 60000 = 40000 ms = 40s
    });

    it('correctly renders the final duration in a state timeline based on the range', () => {
      render(
        <StateTimelineTooltip
          series={series}
          seriesIdx={1}
          dataIdxs={[null, 2]}
          mode={TooltipDisplayMode.Single}
          timeRange={timeRange}
          withDuration
          dataLinks={[]}
          isPinned={false}
        />
      );

      expect(screen.queryByText('Duration')).toBeInTheDocument();
      expect(screen.queryByText('20s')).toBeInTheDocument(); // 120000 - 100000 = 20000 ms = 20s
    });

    it('uses the to_time field for duration and end time when toTimeFieldName is provided', () => {
      const originSeries = createDataFrame({ fields: [timeField, valueField] });
      originSeries.fields[1].state = { origin: { frameIndex: 0, fieldIndex: 1 } };
      const frames = [
        createDataFrame({
          fields: [
            timeField,
            valueField,
            {
              name: 'to_time',
              type: FieldType.time,
              values: [30000, 90000, 130000],
              display: (v) => ({ text: String(v), numeric: Number(v) }),
              config: {},
            },
          ],
        }),
      ];

      render(
        <StateTimelineTooltip
          series={originSeries}
          seriesIdx={1}
          dataIdxs={[null, 1]}
          mode={TooltipDisplayMode.Single}
          timeRange={timeRange}
          withDuration
          toTimeFieldName="to_time"
          frames={frames}
          dataLinks={[]}
          isPinned={false}
        />
      );

      expect(screen.queryByText('Duration')).toBeInTheDocument();
      // to_time (90000) - stateTs (60000) = 30000 ms = 30s, overriding the next-state (40s) fallback
      expect(screen.queryByText('30s')).toBeInTheDocument();
      // header shows the to_time end value
      expect(screen.getByText(/90000/)).toBeInTheDocument();
    });

    it('resolves to a non-null row at the same timestamp when skipNullHover is set', () => {
      const overlapTimeField: Field = {
        name: 'Time',
        type: FieldType.time,
        values: [0, 50000, 50000, 80000],
        display: (v) => ({ text: String(v), numeric: NaN }),
        config: {},
      };
      const overlapValueField: Field = {
        name: 'State',
        type: FieldType.number,
        values: [0, null, 100, 50],
        display: (v) => ({ text: String(v), numeric: Number(v) }),
        config: {},
      };
      const overlapSeries = createDataFrame({ fields: [overlapTimeField, overlapValueField] });

      render(
        <StateTimelineTooltip
          series={overlapSeries}
          seriesIdx={1}
          dataIdxs={[null, 1]}
          mode={TooltipDisplayMode.Single}
          timeRange={timeRange}
          withDuration
          skipNullHover
          dataLinks={[]}
          isPinned={false}
        />
      );

      // dataIdx 1 is null at t=50000; the search finds index 2 (value 100) at the same timestamp,
      // so duration becomes 80000 - 50000 = 30s and the header end time is 80000
      expect(screen.queryByText('Duration')).toBeInTheDocument();
      expect(screen.queryByText('30s')).toBeInTheDocument();
      expect(screen.getByText(/80000/)).toBeInTheDocument();
    });

    it('should not include the duration in multi mode even when withDuration is true', () => {
      render(
        <StateTimelineTooltip
          series={createDataFrame({
            fields: [
              timeField,
              { ...valueField, name: 'StateA' },
              { ...valueField, name: 'StateB', values: [200, 400, 100] },
            ],
          })}
          seriesIdx={1}
          dataIdxs={[null, 1, 1]}
          mode={TooltipDisplayMode.Multi}
          timeRange={timeRange}
          withDuration
          dataLinks={[]}
          isPinned={false}
        />
      );

      expect(screen.queryByText('StateA')).toBeInTheDocument();
      expect(screen.queryByText('StateB')).toBeInTheDocument();
      expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    });

    it('works without a seriesIdx is withDuration is false', () => {
      render(
        <StateTimelineTooltip
          series={series}
          dataIdxs={[null, 1]}
          mode={TooltipDisplayMode.Single}
          timeRange={timeRange}
          withDuration={false}
          dataLinks={[]}
          isPinned={false}
        />
      );

      expect(screen.queryByText('60000')).toBeInTheDocument();
      expect(screen.queryByText('State')).not.toBeInTheDocument();
      expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    });
  });

  describe('footer', () => {
    const StateTimelineTooltipWithDataLinks = ({ isPinned }: { isPinned: boolean }) => (
      <StateTimelineTooltip
        series={series}
        seriesIdx={1}
        dataIdxs={[null, 1]}
        mode={TooltipDisplayMode.Single}
        timeRange={timeRange}
        withDuration
        dataLinks={[{ title: 'Regular Link', href: 'https://example.com', target: '_blank', origin: '*' }]}
        isPinned={isPinned}
      />
    );

    it('shows the footer if isPinned is true and there are data links', () => {
      render(<StateTimelineTooltipWithDataLinks isPinned />);
      const link = screen.queryByText('Regular Link');
      expect(link).toBeInTheDocument();
    });

    it('hides the footer if isPinned is false even if there are data links', () => {
      render(<StateTimelineTooltipWithDataLinks isPinned={false} />);
      const link = screen.queryByText('Regular Link');
      expect(link).not.toBeInTheDocument();
    });
  });
});
