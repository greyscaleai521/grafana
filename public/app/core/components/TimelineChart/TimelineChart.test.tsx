import { type DataFrame } from '@grafana/data';

import { reconfigOnFramesChangeInSamples } from './TimelineChart';
import { TimelineMode } from './utils';

describe('reconfigOnFramesChangeInSamples', () => {
  const framesA: DataFrame[] = [{ fields: [], length: 0 }];
  const framesB: DataFrame[] = [{ fields: [], length: 0 }];

  it('forces a reconfig in Samples mode when the frames reference changes', () => {
    const prev = { mode: TimelineMode.Samples, frames: framesA };
    const next = { mode: TimelineMode.Samples, frames: framesB };
    // false => "not same" => GraphNG reconfigures
    expect(reconfigOnFramesChangeInSamples(prev, next)).toBe(false);
  });

  it('does not force a reconfig in Samples mode when the frames reference is unchanged', () => {
    const prev = { mode: TimelineMode.Samples, frames: framesA };
    const next = { mode: TimelineMode.Samples, frames: framesA };
    expect(reconfigOnFramesChangeInSamples(prev, next)).toBe(true);
  });

  it('does not force a reconfig in Changes mode (State Timeline) when frames change', () => {
    const prev = { mode: TimelineMode.Changes, frames: framesA };
    const next = { mode: TimelineMode.Changes, frames: framesB };
    expect(reconfigOnFramesChangeInSamples(prev, next)).toBe(true);
  });
});
