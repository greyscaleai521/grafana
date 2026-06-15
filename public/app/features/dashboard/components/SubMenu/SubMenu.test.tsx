import { type TypedVariableModel } from '@grafana/data';

import { isDefault } from './SubMenu';

const makeVariable = (value: unknown, id = 'var0') => ({ id, current: { value } }) as unknown as TypedVariableModel;

describe('isDefault', () => {
  it('returns true when the current value is empty or undefined', () => {
    expect(isDefault(makeVariable(undefined))).toBe(true);
    expect(isDefault(makeVariable(''))).toBe(true);
  });

  it('returns true for each literal default value', () => {
    for (const value of ['lb', 'All', '$__all', 'Production', 'Max Resolution']) {
      expect(isDefault(makeVariable(value))).toBe(true);
    }
  });

  it('returns true for the id-specific special-case defaults', () => {
    expect(isDefault(makeVariable('1200', 'InspTarget'))).toBe(true);
    expect(isDefault(makeVariable('90', 'InspTargetPerc'))).toBe(true);
  });

  it('returns false for a special-case id with a non-default value', () => {
    expect(isDefault(makeVariable('1300', 'InspTarget'))).toBe(false);
    expect(isDefault(makeVariable('80', 'InspTargetPerc'))).toBe(false);
  });

  it('returns false for a normal variable with a non-default value', () => {
    expect(isDefault(makeVariable('some-value'))).toBe(false);
  });
});
