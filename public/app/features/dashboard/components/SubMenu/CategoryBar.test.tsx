import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type TypedVariableModel } from '@grafana/data';

import { CategoryBar, type Props } from './CategoryBar';

const setup = (overrides: Partial<Props> = {}) => {
  const onCategoryChange = jest.fn();
  const props: Props = {
    categories: ['Infra', 'App'],
    onCategoryChange,
    selecedCategory: 0,
    categoryFilterCounter: {},
    variables: [] as TypedVariableModel[],
    ...overrides,
  };
  render(<CategoryBar {...props} />);
  return { onCategoryChange };
};

describe('CategoryBar', () => {
  it('renders one button per category plus Clear All', () => {
    setup();
    expect(screen.getByRole('button', { name: /Infra/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /App/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument();
  });

  it('calls onCategoryChange with the index when a category is clicked', async () => {
    const { onCategoryChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: /App/ }));
    expect(onCategoryChange).toHaveBeenCalledWith(1);
  });

  it('renders the +N counter when categoryFilterCounter has a value', () => {
    setup({ categoryFilterCounter: { Infra: 2 } });
    expect(screen.getByRole('button', { name: /Infra \+ 2/ })).toBeInTheDocument();
  });

  it('renders nothing when there are no categories', () => {
    const { container } = render(
      <CategoryBar
        categories={[]}
        onCategoryChange={jest.fn()}
        selecedCategory={0}
        variables={[] as TypedVariableModel[]}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
