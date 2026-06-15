import { render, screen } from '@testing-library/react';

import { type TypedVariableModel, VariableHide } from '@grafana/data';

import { SubMenuItems } from './SubMenuItems';

jest.mock('../../../variables/pickers/PickerRenderer', () => ({
  PickerRenderer: ({ variable }: { variable: TypedVariableModel }) => <div>{variable.name}</div>,
}));

const makeVariable = (name: string, category: string | undefined, hide = VariableHide.dontHide) =>
  ({ id: name, name, category, hide, type: 'textbox' }) as unknown as TypedVariableModel;

describe('SubMenuItems', () => {
  it('shows all non-hidden variables when no category filter is applied', () => {
    const variables = [
      makeVariable('A', 'Infra'),
      makeVariable('B', 'App'),
      makeVariable('C', 'Infra', VariableHide.hideVariable),
    ];

    render(<SubMenuItems variables={variables} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });

  it('shows only variables matching the selected category', () => {
    const variables = [
      makeVariable('A', 'Infra'),
      makeVariable('B', 'App'),
      makeVariable('C', 'Infra', VariableHide.hideVariable),
    ];

    render(<SubMenuItems variables={variables} categories={['Infra', 'App']} selectedCategory={0} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });

  it('renders the Clear button when variables are visible', () => {
    render(<SubMenuItems variables={[makeVariable('A', 'Infra')]} />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});
