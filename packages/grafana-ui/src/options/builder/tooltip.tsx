import { PanelOptionsEditorBuilder } from '@grafana/data';
import { OptionsWithTooltip, TooltipDisplayMode, SortOrder } from '@grafana/schema';

export function addTooltipOptions<T extends OptionsWithTooltip>(
  builder: PanelOptionsEditorBuilder<T>,
  singleOnly = false,
  showCustom = false
) {
  const category = ['Tooltip'];
  const modeOptions = singleOnly
    ? [
        { value: TooltipDisplayMode.Single, label: 'Single' },
        { value: TooltipDisplayMode.None, label: 'Hidden' },
      ]
    : showCustom
    ? [
        { value: TooltipDisplayMode.Single, label: 'Single' },
        { value: TooltipDisplayMode.Multi, label: 'All' },
        { value: TooltipDisplayMode.None, label: 'Hidden' },
        { value: TooltipDisplayMode.Custom, label: 'Custom' },
      ]
    : [
        { value: TooltipDisplayMode.Single, label: 'Single' },
        { value: TooltipDisplayMode.Multi, label: 'All' },
        { value: TooltipDisplayMode.None, label: 'Hidden' },
      ];

  const sortOptions = [
    { value: SortOrder.None, label: 'None' },
    { value: SortOrder.Ascending, label: 'Ascending' },
    { value: SortOrder.Descending, label: 'Descending' },
  ];

  builder
    .addRadio({
      path: 'tooltip.mode',
      name: 'Tooltip mode',
      category,
      defaultValue: 'single',
      settings: {
        options: modeOptions,
      },
    })
    .addRadio({
      path: 'tooltip.sort',
      name: 'Values sort order',
      category,
      defaultValue: SortOrder.None,
      showIf: (options: T) => options.tooltip?.mode === TooltipDisplayMode.Multi,
      settings: {
        options: sortOptions,
      },
    })
    .addTextInput({
      path: 'tooltip.fixedFields',
      name: 'Fixed Fields to Show',
      description: 'Fixed Fileds which will be shown in the tooltip',
      settings: {
        placeholder: 'Enter comma separated field names',
      },
      showIf: (options: T) => options.tooltip.mode === TooltipDisplayMode.Custom,
    });
}
