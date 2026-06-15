import { type TimeRange, type TypedVariableModel } from '@grafana/data';

import { buildParams, buildParamsforShare, getLocationAccessParams } from './utils';

describe('buildParams', () => {
  it.each`
    search                                         | useCurrentTimeRange | selectedTheme | panelId      | expected
    ${''}                                          | ${true}             | ${'current'}  | ${undefined} | ${'from=1000&to=2000&orgId=2'}
    ${''}                                          | ${true}             | ${'current'}  | ${'3'}       | ${'from=1000&to=2000&orgId=2&viewPanel=3'}
    ${''}                                          | ${true}             | ${'light'}    | ${undefined} | ${'from=1000&to=2000&orgId=2&theme=light'}
    ${''}                                          | ${true}             | ${'light'}    | ${'3'}       | ${'from=1000&to=2000&orgId=2&theme=light&viewPanel=3'}
    ${''}                                          | ${false}            | ${'current'}  | ${undefined} | ${'orgId=2'}
    ${''}                                          | ${false}            | ${'current'}  | ${'3'}       | ${'orgId=2&viewPanel=3'}
    ${''}                                          | ${false}            | ${'light'}    | ${undefined} | ${'orgId=2&theme=light'}
    ${''}                                          | ${false}            | ${'light'}    | ${'3'}       | ${'orgId=2&theme=light&viewPanel=3'}
    ${'editPanel=4'}                               | ${true}             | ${'current'}  | ${undefined} | ${'editPanel=4&from=1000&to=2000&orgId=2'}
    ${'editPanel=4'}                               | ${true}             | ${'current'}  | ${'3'}       | ${'editPanel=4&from=1000&to=2000&orgId=2'}
    ${'editPanel=4'}                               | ${true}             | ${'light'}    | ${undefined} | ${'editPanel=4&from=1000&to=2000&orgId=2&theme=light'}
    ${'editPanel=4'}                               | ${true}             | ${'light'}    | ${'3'}       | ${'editPanel=4&from=1000&to=2000&orgId=2&theme=light'}
    ${'editPanel=4'}                               | ${false}            | ${'current'}  | ${undefined} | ${'editPanel=4&orgId=2'}
    ${'editPanel=4'}                               | ${false}            | ${'current'}  | ${'3'}       | ${'editPanel=4&orgId=2'}
    ${'editPanel=4'}                               | ${false}            | ${'light'}    | ${undefined} | ${'editPanel=4&orgId=2&theme=light'}
    ${'editPanel=4'}                               | ${false}            | ${'light'}    | ${'3'}       | ${'editPanel=4&orgId=2&theme=light'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${true}             | ${'current'}  | ${undefined} | ${'var=%2B1&var=a+value+with+spaces&var=true&from=1000&to=2000&orgId=2'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${true}             | ${'current'}  | ${'3'}       | ${'var=%2B1&var=a+value+with+spaces&var=true&from=1000&to=2000&orgId=2&viewPanel=3'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${true}             | ${'light'}    | ${undefined} | ${'var=%2B1&var=a+value+with+spaces&var=true&from=1000&to=2000&orgId=2&theme=light'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${true}             | ${'light'}    | ${'3'}       | ${'var=%2B1&var=a+value+with+spaces&var=true&from=1000&to=2000&orgId=2&theme=light&viewPanel=3'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${false}            | ${'current'}  | ${undefined} | ${'var=%2B1&var=a+value+with+spaces&var=true&orgId=2'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${false}            | ${'current'}  | ${'3'}       | ${'var=%2B1&var=a+value+with+spaces&var=true&orgId=2&viewPanel=3'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${false}            | ${'light'}    | ${undefined} | ${'var=%2B1&var=a+value+with+spaces&var=true&orgId=2&theme=light'}
    ${'var=%2B1&var=a+value+with+spaces&var=true'} | ${false}            | ${'light'}    | ${'3'}       | ${'var=%2B1&var=a+value+with+spaces&var=true&orgId=2&theme=light&viewPanel=3'}
    ${'auth_token=1234'}                           | ${true}             | ${'current'}  | ${undefined} | ${'from=1000&to=2000&orgId=2'}
  `(
    "when called with search: '$search' and useCurrentTimeRange: '$useCurrentTimeRange' and selectedTheme: '$selectedTheme' and panel: '$panel'then result should be '$expected'",
    ({ search, useCurrentTimeRange, selectedTheme, panelId, expected }) => {
      const range: TimeRange = {
        from: 1000,
        to: 2000,
        raw: { from: 'now-6h', to: 'now' },
      } as unknown as TimeRange;
      const orgId = 2;
      const result = buildParams({ useCurrentTimeRange, selectedTheme, panelId, search, range, orgId });

      expect(result.toString()).toEqual(expected);
    }
  );
});

describe('buildParamsforShare', () => {
  const range: TimeRange = {
    from: 1000,
    to: 2000,
    raw: { from: 'now-6h', to: 'now' },
  } as unknown as TimeRange;

  it('uses the raw time range when isRelativeTime and useCurrentTimeRange are both true', () => {
    const result = buildParamsforShare({ useCurrentTimeRange: true, isRelativeTime: true, range });
    expect(result.toString()).toEqual('from=now-6h&to=now');
  });

  it('uses the absolute epoch time range when isRelativeTime is false', () => {
    const result = buildParamsforShare({ useCurrentTimeRange: true, isRelativeTime: false, range });
    expect(result.toString()).toEqual('from=1000&to=2000');
  });

  it('uses the absolute epoch time range when useCurrentTimeRange is false even if relative', () => {
    const result = buildParamsforShare({ useCurrentTimeRange: false, isRelativeTime: true, range });
    expect(result.toString()).toEqual('from=1000&to=2000');
  });
});

describe('getLocationAccessParams', () => {
  const makeVariables = (factoryValue: string | string[], locationOptions: Array<{ value: string }>) =>
    [
      { name: 'FactoryLocation', current: { value: factoryValue } },
      { name: 'LocationsAccess', options: locationOptions },
    ] as unknown as TypedVariableModel[];

  it('returns undefined when FactoryLocation does not include $__all', () => {
    const variables = makeVariables('plant-1', [{ value: 'plant-1' }, { value: 'plant-2' }]);
    expect(getLocationAccessParams(variables)).toBeUndefined();
  });

  it('returns the non-$__all location values when FactoryLocation is $__all and no NULL option exists', () => {
    const variables = makeVariables(['$__all'], [{ value: '$__all' }, { value: 'plant-1' }, { value: 'plant-2' }]);
    expect(getLocationAccessParams(variables)).toEqual(['plant-1', 'plant-2']);
  });

  it('returns undefined when a NULL (company-user) option exists', () => {
    const variables = makeVariables(['$__all'], [{ value: 'NULL' }, { value: 'plant-1' }]);
    expect(getLocationAccessParams(variables)).toBeUndefined();
  });
});
