import { createTheme } from '@grafana/data';

import { quantizeScheme } from './palettes';
import { type HeatmapColorOptions, HeatmapColorMode } from './panelcfg.gen';

const theme = createTheme();

function opacityOpts(overrides: Partial<HeatmapColorOptions> = {}): HeatmapColorOptions {
  return {
    mode: HeatmapColorMode.Opacity,
    fill: 'red',
    scheme: 'Spectral',
    exponent: 0.5,
    steps: 10,
    reverse: false,
    ...overrides,
  };
}

describe('quantizeScheme startStep', () => {
  it('produces the full palette when startStep is undefined or 0', () => {
    const full = quantizeScheme(opacityOpts(), theme);
    expect(full).toHaveLength(10);
    expect(quantizeScheme(opacityOpts({ startStep: 0 }), theme)).toEqual(full);
  });

  it('drops the leading steps so the result is the full palette sliced by startStep', () => {
    const full = quantizeScheme(opacityOpts(), theme);
    const shifted = quantizeScheme(opacityOpts({ startStep: 3 }), theme);

    expect(shifted).toHaveLength(full.length - 3);
    expect(shifted).toEqual(full.slice(3));
  });

  it('falls back to starting at 0 when startStep is out of range', () => {
    const full = quantizeScheme(opacityOpts(), theme);

    // steps internal = (10 - 1) = 9, guard requires startStep < steps - 1 (= 8)
    expect(quantizeScheme(opacityOpts({ startStep: 8 }), theme)).toEqual(full);
    expect(quantizeScheme(opacityOpts({ startStep: 50 }), theme)).toEqual(full);
  });
});
