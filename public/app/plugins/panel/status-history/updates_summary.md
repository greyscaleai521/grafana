# Status History Panel - Changes Summary (13.0.2 migration)

This document summarizes the Status History panel features as they were ported to the `13.0.2` branch. The original work was authored against `10.4.2`; because `13.0.2` is ~2 years ahead, several areas were refactored upstream, so some hunks were adapted, some were dropped (already present upstream), and one feature was dropped entirely (superseded upstream).

The five source commits map to the features below:

| # | Commit | Feature | Status in 13.0.2 |
| - | ------ | ------- | ---------------- |
| 1 | `cb399204` | X-Axis Range Fix | Ported (adapted) |
| 2 | `37087b03` | Axis Width Setting | Dropped (already upstream) |
| 3 | `7547e55e` | Dynamic Column Width | Ported |
| 4 | `5641bfd8` | Tooltip Duration + `to_time` | Ported (adapted into shared tooltip) |
| 5 | `608a4917` | Tooltip & Hover fixes (overlaps) | Ported (scoped to Status History) |

---

## Feature 1: X-Axis Range Fix - Show Entire Time Range from Date Picker

**Problem**: X-axis adjusted based on data points instead of showing the full time range selected from the date picker, unlike the Time Series panel.

**Solution**: X-axis range always uses the time range from `getTimeRange()`, matching Time Series panel behavior.

### Files Changed (as ported to 13.0.2):

#### `public/app/core/components/TimelineChart/timeline.ts`
- Removed the Samples-mode `xSplits` function; `xSplits` is now `undefined`.
- Simplified `xRange` to always return `[r.from.valueOf(), r.to.valueOf()]` from `getTimeRange()`; signature changed to `(): uPlot.Range.MinMax`.
- Removed the now-unused `ceil` from the `Math` destructuring.

#### `public/app/core/components/TimelineChart/utils.ts`
- Updated the x-axis `range` callback to call `coreConfig.xRange()` (no `u` argument) and `splits: coreConfig.xSplits` (no `!` assertion, since it can be `undefined`).

### Notes
- Upstream `13.0.2` already supports panning; the port keeps the date-picker range as the source of truth.

---

## Feature 2: Axis Width Configuration - Y-Axis Width Setting (DROPPED)

**Original intent**: Add a setting to control the y-axis width in Status History, like Time Series.

**13.0.2 decision**: **Dropped entirely.** The equivalent "Axis > Width" control is already exposed upstream via standard field options for the Status History panel, so re-adding a custom `axisWidth` option would duplicate existing functionality.

### Files Changed
- None. `TimelineChart.tsx`, `utils.ts`, `module.tsx`, and `panelcfg.cue` were intentionally left untouched for this feature.

---

## Feature 3: Dynamic Column Width Support - Using a `to_time` Field

**Problem**: Bars had a fixed width based on the `colWidth` setting. Need to support dynamic widths so a bar stretches from its `from_time` to a selected field's value.

**Solution**: Added an optional "Dynamic column width using" field picker. When the selected field is a timestamp, bars stretch from `from_time` to that field's value; otherwise they fall back to fixed width.

### Files Changed (as ported to 13.0.2):

#### `public/app/core/components/TimelineChart/timeline.ts`
- Added `type DataFrame`, `type Field`, `FieldType` to the `@grafana/data` import.
- Added `dynamicColumnWidthField?: string` and `allFrames?: DataFrame[]` to `TimelineCoreOptions` (and destructured them in `getConfig`).
- Added field-finding logic (`dynamicWidthFieldInfo`) that locates the configured field in the original frames.
- In `drawPaths` (Samples mode, timestamp field), builds a `timeToToTimeMap` and uses `valToPosX(toTime)` for the bar's right edge when a `to_time` exists; otherwise falls back to fixed width.

#### `public/app/core/components/TimelineChart/utils.ts`
- Added `dynamicColumnWidthField?: string` to `UPlotConfigOptions`; destructured `dynamicColumnWidthField` and `allFrames` in `preparePlotConfigBuilder` and forwarded them to the core options.

#### `public/app/core/components/TimelineChart/TimelineChart.tsx`
- Added `dynamicColumnWidthField?: string` to `TimelineProps` and `'dynamicColumnWidthField'` to `propsToDiff` (so changing the field re-renders live).

#### `public/app/plugins/panel/status-history/module.tsx`
- Added an `addFieldNamePicker` for `dynamicColumnWidthField` (i18n `t()` label/description, placeholder).

#### `public/app/plugins/panel/status-history/panelcfg.cue` and `panelcfg.gen.ts`
- Added `dynamicColumnWidthField?: string` to `Options` in both the CUE source and the generated TypeScript (edited directly so the type is durable without an immediate `make gen-cue`).

### Notes
- Only timestamp (`time`-typed) fields drive dynamic width; non-time fields fall back to fixed width.

---

## Feature 4: Tooltip Duration Calculation and `to_time` Display

**Problem**: Tooltips only showed the current timestamp, not the duration or end time of the status period.

**Solution**: The tooltip now computes and displays a `Duration`, using the `to_time` field when available (and showing a "from - to" end time in the header), or falling back to the next state change / time range end.

### 13.0.2 architecture note
`13.0.2` removed `StateTimelineTooltip2.tsx` and `StatusHistoryTooltip.tsx` and consolidated both panels onto a single shared tooltip, `public/app/plugins/panel/state-timeline/StateTimelineTooltip.tsx` (rendered via `TooltipPlugin2`). The feature was therefore **adapted into that shared component**, guarded by optional props so State Timeline is unaffected.

### Files Changed (as ported to 13.0.2):

#### `public/app/plugins/panel/state-timeline/StateTimelineTooltip.tsx`
- Added `type Field`, `type DataFrame` imports.
- Added optional `toTimeFieldName?: string` and `frames?: DataFrame[]` props.
- In the `withDuration && Single` block: resolves the original `to_time` field via `field.state?.origin`, matches the hovered row by timestamp + value, and sets `duration = fmtDuration(toTime - stateTs)` and `endTime = toTime`. Falls back to the existing `findNextStateIndex` / `timeRange.to` logic when no `to_time` is found.

#### `public/app/core/components/TimelineChart/timeline.ts`
- Added a `mappedNull: boolean` parameter to `putBox` with an early `return` when `value == null && !mappedNull`, passed at both call sites. (Defensive: `shouldDrawYValue` already prevents null boxes upstream.)

#### `public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`
- Set `withDuration={true}` and passed `toTimeFieldName={options.dynamicColumnWidthField}` and `frames={paginatedFrames}` to the shared tooltip.

### Dropped (obsolete in 13.0.2)
- `utils.ts` `onHover` null-skip - no `onHover`/`hovered` callback system exists upstream.
- `StatusHistoryTooltip.tsx` / `StateTimelineTooltip2.tsx` edits - files removed; intent folded into the shared tooltip.
- `StatusHistoryPanel.tsx` `renderCustomTooltip` null-check - no such function upstream.

### Notes
- `to_time` reuses the same field selected for Feature 3 (`dynamicColumnWidthField`).
- Behavior change (approved): the Status History tooltip now always shows `Duration`.

---

## Feature 5: Tooltip & Hover Fixes for Overlaps

**Problem**: Hovering a bar produced ghost overlays (translucent white boxes) on other series at the same x position, and tooltips could show null/undefined values when multiple rows shared a timestamp with values on different fields.

**Solution**: Force single-hover for Status History, restrict the cursor overlay to the bar physically under the cursor, and resolve the tooltip to a non-null row at the same timestamp.

### 13.0.2 decision: scoped to Status History
The original commit applied these changes unconditionally (which touches State Timeline). In `13.0.2` they are **scoped to Status History only**, so State Timeline behavior is unchanged.

### Files Changed (as ported to 13.0.2):

#### `public/app/core/components/TimelineChart/TimelineChart.tsx`
- Changed `TimelineMode` to a value import.
- `hoverMulti: props.mode === TimelineMode.Samples ? false : tooltip?.mode === TooltipDisplayMode.Multi` - single hover for Status History (Samples) only.

#### `public/app/core/components/TimelineChart/timeline.ts`
- In `cursor.points.bbox`, added a Samples-only guard so the overlay only shows for the directly-hovered series: `if (mode === TimelineMode.Samples) { isHovered = isHovered && hoveredAtCursor != null && hoveredAtCursor.sidx === seriesIdx; }`. (`hoveredAtCursor` already exists upstream.)

#### `public/app/plugins/panel/state-timeline/StateTimelineTooltip.tsx`
- Added opt-in `skipNullHover?: boolean`. When set and the hovered field value is null/empty, searches for a non-null value at the same timestamp and reassigns `dataIdx`; returns `null` if none is found. Faithful to the commit: only the corrected `dataIdx` (header + duration) is updated; `getContentItems` still uses `dataIdxs`.

#### `public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`
- Passed `skipNullHover={true}` to the shared tooltip. `StateTimelinePanel.tsx` is left unchanged (prop defaults off).

### Dropped (obsolete in 13.0.2)
- `utils.ts` `onHover` non-null search - no `onHover`/`hovered` callback upstream; null boxes are already excluded by the Feature 4 `putBox` guard.
- Separate `StatusHistoryTooltip.tsx` / `StateTimelineTooltip2.tsx` edits - files removed; folded into the shared tooltip.

### Notes
- Largely defensive in `13.0.2`: Feature 4's `putBox` null guard plus `hoverMulti=false` already prevent most null/ghost cases; these add explicit correctness and match the original intent.

---

## Summary of Files Changed (13.0.2)

### Core TimelineChart components
1. **`public/app/core/components/TimelineChart/timeline.ts`** - x-axis range fix; dynamic column width; `putBox` null guard; Samples-only cursor-overlay guard.
2. **`public/app/core/components/TimelineChart/utils.ts`** - x-axis range/splits wiring; dynamic column width field passing.
3. **`public/app/core/components/TimelineChart/TimelineChart.tsx`** - `dynamicColumnWidthField` prop + `propsToDiff`; Samples-only `hoverMulti=false`.

### Status History panel
4. **`public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`** - tooltip wiring (`withDuration`, `toTimeFieldName`, `frames`, `skipNullHover`).
5. **`public/app/plugins/panel/status-history/module.tsx`** - `dynamicColumnWidthField` field picker.
6. **`public/app/plugins/panel/status-history/panelcfg.cue`** / **`panelcfg.gen.ts`** - `dynamicColumnWidthField?: string` option.

### State Timeline panel (shared component)
7. **`public/app/plugins/panel/state-timeline/StateTimelineTooltip.tsx`** - duration + `to_time` (Feature 4) and null-skip (Feature 5), both guarded by optional props so State Timeline is not affected.

---

## Testing

1. **X-Axis Range**: Change the date-picker range - the x-axis should show the full selected range.
2. **Dynamic Column Width**: Set "Dynamic column width using" to a timestamp field - bars stretch from `from_time` to that field's value and update live; clearing it reverts to fixed `Column width`.
3. **Tooltip Duration**: With a `to_time` field selected, hover a bar - the tooltip shows a `Duration` and an end time derived from `to_time`; without a field selected, duration falls back to next-state change / time-range end.
4. **Hover fixes for overlaps**: With overlapping series at the same x, hovering a bar highlights only that bar (no ghost overlays), and the tooltip shows the hovered row's non-null value. State Timeline (single and multi tooltip) behaves exactly as before.

### Unit tests added during migration
- `public/app/core/components/TimelineChart/timeline.test.ts` - x-axis range/splits; dynamic column width.
- `public/app/plugins/panel/state-timeline/StateTimelineTooltip.test.tsx` - `to_time` duration/end-time; `skipNullHover` non-null resolution.

---

## Notes

- **State Timeline is unaffected** - shared-tooltip changes are guarded by optional props, and the hover/overlay fixes are scoped to `TimelineMode.Samples`.
- `panelcfg.gen.ts` was edited directly alongside `panelcfg.cue` so the option type is durable; running `make gen-cue` will regenerate it consistently.
