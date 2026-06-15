import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Row } from 'react-table';

import { type Field, FieldType, type TypedVariableModel } from '@grafana/data';

import { HeaderActionRow, type HeaderActionRowProps } from './HeaderActionRow';
import { type TableStyles } from './styles';

const variablesMock: TypedVariableModel[] = [];

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({ getVariables: () => variablesMock }),
  locationService: { getSearch: () => new URLSearchParams('from=now-24h&to=now') },
}));

const tableStyles = {
  selectedRowHeader: 'selectedRowHeader',
  rowCountTextCont: 'rowCountTextCont',
  noRowSelectedText: 'noRowSelectedText',
  viewImageButton: 'viewImageButton',
} as unknown as TableStyles;

const fields = [{ name: 'col', type: FieldType.string, values: ['a'], config: {} }] as unknown as Field[];

function renderHeaderActionRow(props: Partial<HeaderActionRowProps> = {}) {
  const defaultProps: HeaderActionRowProps = {
    itemName: 'image',
    actionText: 'View Images',
    exportDataText: 'Export Data',
    selectedFlatRows: [],
    windowURL: '*',
    tableStyles,
    fields,
    ...props,
  };
  return render(<HeaderActionRow {...defaultProps} />);
}

describe('HeaderActionRow', () => {
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    postMessageSpy = jest.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it('renders the action and export buttons', () => {
    renderHeaderActionRow();
    expect(screen.getByText('View Images')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('does not post a message when the action is clicked with no selected rows', async () => {
    const user = userEvent.setup();
    renderHeaderActionRow({ selectedFlatRows: [] });

    await user.click(screen.getByText('View Images'));

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('posts the selected rows payload when the action is clicked', async () => {
    const user = userEvent.setup();
    const selectedFlatRows = [{ index: 0, values: { 0: 'a' } }] as unknown as Row[];
    renderHeaderActionRow({ selectedFlatRows });

    await user.click(screen.getByText('View Images'));

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'grafana-table-plugin',
        isMultipleImages: true,
        payload: [{ col: 'a' }],
      }),
      '*'
    );
  });

  it('posts the current filters when export data is clicked', async () => {
    const user = userEvent.setup();
    renderHeaderActionRow();

    await user.click(screen.getByText('Export Data'));

    await waitFor(() =>
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'grafana-table-plugin',
          isExport: true,
        }),
        '*'
      )
    );
  });
});
