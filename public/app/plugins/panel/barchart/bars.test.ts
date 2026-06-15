import { type DataFrame, FieldType, type TypedVariableModel } from '@grafana/data';

import { createQueryVariable } from '../../../features/variables/state/__tests__/fixtures';

import { getBarClickVariableQuery } from './bars';
import { type Rect } from './quadtree';

function makeRect(didx: number, sidx: number): Rect {
  return { x: 0, y: 0, w: 10, h: 10, didx, sidx };
}

const variables: TypedVariableModel[] = [createQueryVariable({ name: 'xVar' }), createQueryVariable({ name: 'yVar' })];

// data[0] is the x field values; clicking didx=1 selects the 2nd x value.
const data: [number[], ...number[][]] = [
  [10, 20, 30],
  [1, 2, 3],
  [4, 5, 6],
];

const frame: DataFrame = {
  length: 3,
  fields: [
    { name: 'x', type: FieldType.string, values: [], config: {} },
    { name: 'Series A', type: FieldType.number, values: [], config: {} },
    { name: 'Series B', type: FieldType.number, values: [], config: { displayName: 'B display' } },
  ],
};

describe('getBarClickVariableQuery', () => {
  it('maps only the x variable when not stacked', () => {
    const query = getBarClickVariableQuery({
      rect: makeRect(1, 1),
      data,
      frame,
      isStacked: false,
      variables,
      xValueMappedVariable: 'xVar',
      yValueMappedVariable: 'yVar',
    });

    expect(query).toEqual({ 'var-xVar': '20' });
  });

  it('maps both x and y (series name) when stacked', () => {
    const query = getBarClickVariableQuery({
      rect: makeRect(0, 1),
      data,
      frame,
      isStacked: true,
      variables,
      xValueMappedVariable: 'xVar',
      yValueMappedVariable: 'yVar',
    });

    expect(query).toEqual({ 'var-xVar': '10', 'var-yVar': 'Series A' });
  });

  it('uses field displayName for the y value when configured', () => {
    const query = getBarClickVariableQuery({
      rect: makeRect(2, 2),
      data,
      frame,
      isStacked: true,
      variables,
      xValueMappedVariable: 'xVar',
      yValueMappedVariable: 'yVar',
    });

    expect(query).toEqual({ 'var-xVar': '30', 'var-yVar': 'B display' });
  });

  it('returns an empty query when the mapped variable does not exist', () => {
    const query = getBarClickVariableQuery({
      rect: makeRect(1, 1),
      data,
      frame,
      isStacked: true,
      variables,
      xValueMappedVariable: 'missing',
      yValueMappedVariable: 'alsoMissing',
    });

    expect(query).toEqual({});
  });
});
