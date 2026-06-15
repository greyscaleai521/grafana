// Copyright 2021 Grafana Labs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package grafanaplugin

import (
	ui "github.com/grafana/grafana/packages/grafana-schema/src/common"
)

composableKinds: PanelCfg: {
	maturity: "experimental"
	lineage: {
		schemas: [{
			version: [0, 0]
			schema: {
				// @deprecated - use common in /packages/grafana-schema/src/common/table.cue instead i.e. `import { TableOptions } from '@grafana/schema';`
				Options: {
					// Represents the index of the selected frame
					frameIndex: number | *0
					// Controls whether the panel should show the header
					showHeader: bool | *true
					// Controls whether the header should show icons for the column types
					showTypeIcons?: bool | *false
					// Used to control row sorting
					sortBy?: [...ui.TableSortByFieldState]
					// Enable pagination on the table
					enablePagination?: bool
					// Controls the height of the rows
					cellHeight?: ui.TableCellHeight & (*"sm" | _)
					// limits the maximum height of a row, if text wrapping or dynamic height is enabled
					maxRowHeight?: number
					// Defines the number of columns to freeze on the left side of the table
					frozenColumns?: {
						left?: number | *0
					}
					// If true, disables all keyboard events in the table. this is used when previewing a table (i.e. suggestions)
					disableKeyboardEvents?: bool
					// Controls whether the panel should show row selection checkboxes
					showRowSelection?: bool | *true
					// Represents the name of the table
					tableName?: string | *""
					// Represents the text for the action link
					actionLinkText?: string | *"View Images"
					// Represents the text for the export data button
					exportDataText?: string | *"Export Data"
					// Represents the URL of the parent window
					windowURL?: string
				} @cuetsy(kind="interface")
				FieldConfig: {ui.TableFieldOptions} @cuetsy(kind="interface")
			}
		}]
		lenses: []
	}
}
