# Status History Panel - Latest Changes Summary

This document summarizes all features implemented in the current session for the Status History panel.

---

## Feature 1: X-Axis Range Fix - Show Entire Time Range from Date Picker

**Problem**: X-axis was adjusting based on data points instead of showing the full time range selected from the date picker, unlike Time Series panel behavior.

**Solution**: Simplified x-axis range to always use the time range from `getTimeRange()`, matching Time Series panel behavior.

### Files Changed:

#### `public/app/core/components/TimelineChart/timeline.ts`
- **Changes**:
  - Simplified `xRange` function (lines ~471-474)
  - Removed mode-specific logic that adjusted range based on data points
  - Now directly returns `[r.from.valueOf(), r.to.valueOf()]` from `getTimeRange()`
  - Set `xSplits` to `undefined` (removed custom logic)
  - Function signature changed from `(u: uPlot) => ...` to `(): uPlot.Range.MinMax => ...`
  - Removed unused `ceil` from Math destructuring

#### `public/app/core/components/TimelineChart/utils.ts`
- **Changes**:
  - Updated `addScale` for x-axis to use inline range function (lines ~223-226)
  - Range function directly calls `getTimeRange()` and returns time range values
  - Updated `splits` to handle `undefined` properly (removed `!` assertion)
  - Matches Time Series panel implementation pattern

---

## Feature 2: Axis Width Configuration - Y-Axis Width Setting

**Problem**: No way to configure the width of the y-axis (left axis) in Status History panel, unlike Time Series panel.

**Solution**: Added axis width option in panel settings that controls the y-axis width, matching Time Series panel behavior.

### Files Changed:

#### `public/app/plugins/panel/status-history/panelcfg.cue`
- **Changes**:
  - Added `axisWidth?: number` to Options interface (line ~39)
  - Comment: "Axis width for y-axis"

#### `public/app/plugins/panel/status-history/module.tsx`
- **Changes**:
  - Added `axisWidth` number input in panel options (lines ~82-89)
  - Category: `['Axis']` - appears in Axis section
  - Placeholder: `'Auto'` (matches Time Series)
  - Default value: `undefined`

#### `public/app/core/components/TimelineChart/TimelineChart.tsx`
- **Changes**:
  - Added `axisWidth?: number` to `TimelineProps` interface (line ~20)

#### `public/app/core/components/TimelineChart/utils.ts`
- **Changes**:
  - Added `axisWidth?: number` to `UPlotConfigOptions` interface (line ~60)
  - Added `axisWidth` to function parameters in `preparePlotConfigBuilder` (line ~103)
  - Applied `size: axisWidth` to y-axis configuration (line ~258)
  - Passes `axisWidth` to `getConfig()` via opts (line ~178)

---

## Feature 3: Dynamic Column Width Support - Using to_time Field

**Problem**: Bars had fixed width based on `colWidth` setting. Need to support dynamic widths based on `to_time` field values.

**Solution**: Added support for dynamic column width using a specified field. If the field is a timestamp, bars stretch from `from_time` to the selected field value.

### Files Changed:

#### `public/app/core/components/TimelineChart/timeline.ts`
- **Changes**:
  - Added imports for `DataFrame`, `Field`, `FieldType`
  - Added `dynamicColumnWidthField?: string` and `allFrames?: DataFrame[]` to `TimelineCoreOptions` interface (lines ~58-59)
  - Added logic to find dynamic width field from original frames (lines ~95-130)
  - Searches through `allFrames` to find the field matching `dynamicColumnWidthField` name
  - Stores field info: `{ field, frameIdx, fieldIdx, timeFieldIdx }`
  - In `drawPaths()`, creates a Map from time values to `to_time` values (lines ~253-278)
  - In `TimelineMode.Samples`, uses dynamic width when available (lines ~329-352)
  - Calculates bar width as `right - left - strokeWidth` when using dynamic timestamp width
  - Sets `xShift = 0` when using dynamic width (no centering needed)
  - Falls back to fixed width if `to_time` is not found or dynamic width is not configured

#### `public/app/core/components/TimelineChart/utils.ts`
- **Changes**:
  - Added `dynamicColumnWidthField?: string` and `allFrames?: DataFrame[]` to `UPlotConfigOptions` interface (lines ~67-68)
  - Added these to function parameters in `preparePlotConfigBuilder` (lines ~109-110)
  - Passes `dynamicColumnWidthField` and `allFrames` to `getConfig()` via opts (lines ~177-178)

#### `public/app/plugins/panel/status-history/panelcfg.cue`
- **Changes**:
  - Added `dynamicColumnWidthField?: string` to Options interface (line ~41)
  - Comment: "Dynamic column width using field name"

#### `public/app/plugins/panel/status-history/module.tsx`
- **Changes**:
  - Added `dynamicColumnWidthField` field name picker to panel options (lines ~90-97)
  - Name: "Dynamic Column Width Using"
  - Description explains behavior for timestamp fields
  - Placeholder: "Choose"

---

## Feature 4: Tooltip Duration Calculation and to_time Display

**Problem**: Tooltips only showed the current timestamp, not the duration or end time of the status period.

**Solution**: Enhanced tooltip to calculate and display duration, using `to_time` field when available, or calculating from next state change. Implemented without creating a new StatusHistoryTooltip2.tsx file.

### Files Changed:

#### `public/app/plugins/panel/status-history/StatusHistoryTooltip.tsx`
- **Changes**:
  - Added `timeRange?: TimeRange` and `toTimeFieldName?: string` props (lines ~23-24)
  - Added null value check to prevent tooltips for empty data (lines ~33-36)
  - Added duration calculation logic (lines ~70-150)
  - Tries to find `to_time` field from original frames using `field.state?.origin`
  - Matches rows by timestamp and ensures the specific field has a value
  - Falls back to searching all frames if origin doesn't work
  - Calculates duration using `fmtDuration()` helper
  - Updates header text to show "From X to Y" format when `to_time` is available
  - Falls back to next state change if `to_time` not found
  - Falls back to time range end if no next state
  - Displays duration in tooltip (lines ~165-170)

#### `public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`
- **Changes**:
  - Extracted `dynamicColumnWidthField` to separate variable for React Hook dependencies
  - Passes `timeRange` and `toTimeFieldName` to `StatusHistoryTooltip` (line ~143)
  - Added dependencies to `useCallback` hook (line ~148)
  - For new tooltip system (TooltipPlugin2), changed `withDuration` from `false` to `true` and passes `toTimeFieldName` to `StateTimelineTooltip2` (line ~267)

#### `public/app/plugins/panel/state-timeline/StateTimelineTooltip2.tsx`
- **Changes**:
  - Added optional `toTimeFieldName?: string` prop to interface (line ~19)
  - Enhanced duration calculation to support `to_time` field lookup when `toTimeFieldName` is provided (lines ~55-100)
  - Falls back to original behavior (using `findNextStateIndex`) when `toTimeFieldName` is not provided
  - This ensures state-timeline panel is not affected

---

## Feature 5: Null Value Handling Fix - Prevent Tooltips for Empty Data

**Problem**: Tooltips were appearing for null/empty data points, showing blank tooltips or small squares when hovering over gaps in the timeline.

**Solution**: Added null value checks at multiple levels to prevent tooltip rendering for null data.

### Files Changed:

#### `public/app/core/components/TimelineChart/timeline.ts`
- **Changes**:
  - Modified `putBox()` function to accept `mappedNull` parameter (line ~177)
  - Added early return in `putBox()` to skip creating boxes for null values (lines ~180-183)
  - Boxes with null values are not added to `boxRectsBySeries`, preventing hover detection
  - Updated both calls to `putBox()` to pass `mappedNull` parameter (lines ~314, ~374)

#### `public/app/core/components/TimelineChart/utils.ts`
- **Changes**:
  - Added null value check in `onHover` callback (lines ~166-177)
  - Only sets hover state if field value is not null/empty
  - Clears hover state if value is null

#### `public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`
- **Changes**:
  - Added null value check in `renderCustomTooltip` (lines ~117-121)
  - Early return if `fieldValue == null || fieldValue === '' || fieldValue === undefined`
  - Prevents tooltip component from being rendered for null values

#### `public/app/plugins/panel/status-history/StatusHistoryTooltip.tsx`
- **Changes**:
  - Already had early return checks for null values (lines ~33-36)
  - Multiple validation points to ensure tooltip only shows for valid data

---

## Feature 6: Hover fixes for overlaps

**Problem**: When hovering over a bar in Status History panel, ghost overlays (translucent white boxes) were appearing on other series at the same x position, even when their `from_time` timestamps didn't match. Additionally, tooltips were showing null/undefined values or data from the wrong data point when multiple data points existed at the same timestamp with values for different fields.

**Solution**: Implemented comprehensive fixes to ensure hover detection only highlights the bar being physically hovered over, and tooltips always display non-null values for the correct data point associated with the hovered bar.

### Files Changed:

#### `public/app/core/components/TimelineChart/TimelineChart.tsx`
- **Changes**:
  - Modified `hoverMulti` logic to always be `false` for `TimelineMode.Samples` (Status History) (lines ~63-65)
  - For Status History, cursor only detects the bar at the cursor's y position, not all bars at the same x position
  - State Timeline panel (`TimelineMode.Changes`) is unaffected and continues to use tooltip mode setting
  - This prevents ghost overlays from appearing on other series

#### `public/app/core/components/TimelineChart/timeline.ts`
- **Changes**:
  - Enhanced `cursor.points.bbox` to only show cursor point overlay for the series that `hoveredAtCursor` points to (lines ~547-549)
  - Added check: `hoveredAtCursor != null && hoveredAtCursor.sidx === seriesIdx`
  - Prevents translucent white overlays from appearing on series other than the one being hovered
  - Only the bar physically under the cursor shows the overlay

#### `public/app/core/components/TimelineChart/utils.ts`
- **Changes**:
  - Enhanced `onHover` callback to search for non-null values at the same timestamp when initial value is null (lines ~170-200)
  - When a null value is detected at the hovered index, searches all data points at the same timestamp
  - Uses the first non-null value found for that field at that timestamp
  - Ensures hover state is set to a valid data point, not a null one
  - This fix applies to all timeline modes (both Status History and State Timeline)

#### `public/app/plugins/panel/status-history/StatusHistoryTooltip.tsx`
- **Changes**:
  - Enhanced to search for non-null values at the same timestamp when initial `datapointIdx` has a null value (lines ~45-69)
  - Renamed parameter from `datapointIdx` to `initialDatapointIdx` for clarity
  - Searches through all data points at the same timestamp to find a valid value for the hovered field
  - Only shows tooltip if a valid non-null value is found
  - Prevents tooltips from showing null/undefined values

#### `public/app/plugins/panel/state-timeline/StateTimelineTooltip2.tsx`
- **Changes**:
  - Enhanced to search for non-null values at the same timestamp when initial `dataIdx` has a null value (lines ~42-66)
  - Similar logic to StatusHistoryTooltip for consistency
  - Returns `null` if no valid data is found, preventing empty tooltips
  - This fix benefits State Timeline panel as well, ensuring tooltips always show valid data

### Impact on Other Panels:

- **State Timeline Panel**: 
  - ✅ **Not affected** - Uses `TimelineMode.Changes`, so `hoverMulti` logic doesn't change its behavior
  - ✅ **Benefited** - The non-null value search in `onHover` and `StateTimelineTooltip2` ensures tooltips show valid data
  - ✅ **Benefited** - Cursor point fix prevents ghost overlays in State Timeline as well

- **Other Panels**:
  - ✅ **Not affected** - Only Status History uses `TimelineMode.Samples`
  - ✅ **No breaking changes** - All changes are backward compatible

### How It Works:

1. **Single Hover Mode for Status History**: When `mode === TimelineMode.Samples`, `hoverMulti` is forced to `false`, ensuring only the bar at the cursor's y position is detected.

2. **Cursor Point Overlay**: The translucent white overlay only appears on the series where `hoveredAtCursor.sidx` matches, preventing ghost overlays on other series.

3. **Non-Null Value Search**: When hovering detects a null value, the system searches all data points at the same timestamp to find a valid value for that field, ensuring tooltips always display meaningful data.

4. **Data Point Matching**: For cases where multiple data points exist at the same timestamp (e.g., one row has value for field A and null for field B, another row has null for field A and value for field B), the tooltip correctly identifies and displays the data point that has a non-null value for the hovered field.

---

## Summary of All Files Changed

### Core TimelineChart Components:
1. **`public/app/core/components/TimelineChart/timeline.ts`**
   - X-axis range fix
   - Dynamic column width support
   - Null value handling (box creation)
   - Cursor point overlay fix (only show for hovered series)

2. **`public/app/core/components/TimelineChart/utils.ts`**
   - X-axis range configuration
   - Axis width support
   - Dynamic column width field passing
   - Null value handling in hover callback
   - Non-null value search in `onHover` callback

3. **`public/app/core/components/TimelineChart/TimelineChart.tsx`**
   - Added `axisWidth` prop
   - Force `hoverMulti: false` for Samples mode (Status History)

### Status History Panel:
4. **`public/app/plugins/panel/status-history/StatusHistoryPanel.tsx`**
   - Passes `timeRange` and `toTimeFieldName` to tooltip
   - Null value check in tooltip renderer
   - Extracted `dynamicColumnWidthField` for React Hook dependencies

5. **`public/app/plugins/panel/status-history/StatusHistoryTooltip.tsx`**
   - Duration calculation
   - `to_time` field lookup
   - Null value checks
   - Enhanced header text with "From X to Y" format

6. **`public/app/plugins/panel/status-history/module.tsx`**
   - Added `axisWidth` option
   - Added `dynamicColumnWidthField` option

7. **`public/app/plugins/panel/status-history/panelcfg.cue`**
   - Added `axisWidth?: number` to Options
   - Added `dynamicColumnWidthField?: string` to Options

### State Timeline Panel (Shared Component):
8. **`public/app/plugins/panel/state-timeline/StateTimelineTooltip2.tsx`**
   - Added optional `toTimeFieldName` support for duration calculation
   - Non-null value search at same timestamp
   - Backward compatible - state-timeline panel not affected

---

## Feature Dependencies

- **Feature 3 (X-Axis Range Fix)** - Independent, can be applied alone
- **Feature 4 (Axis Width)** - Independent, can be applied alone
- **Feature 5 (Dynamic Column Width)** - Works independently, enhanced by Feature 6 (tooltip shows duration)
- **Feature 6 (Tooltip Duration)** - Can work independently, but enhanced by Feature 5 (uses same `to_time` field)
- **Feature 7 (Hover fixes for overlaps)** - Independent, can be applied alone. Enhances null value handling by ensuring correct data point selection
- **Null Value Handling** - Independent, can be applied alone. Enhanced by Feature 7

---

## Testing Recommendations

For each feature, test:
1. **X-Axis Range**: Change time range in date picker - x-axis should show full range
2. **Axis Width**: Adjust axis width setting - y-axis should resize accordingly
3. **Dynamic Column Width**: Set dynamic column width field - bars should use `to_time` for width
4. **Tooltip Duration**: Hover over bars - tooltip should show duration and "From X to Y" format when `to_time` is available
5. **Null Value Handling**: Hover over areas with null data - should not show tooltips or small squares
6. **Hover fixes for overlaps**: 
   - Hover over a bar in one series - only that bar should show the translucent overlay, no ghost overlays on other series
   - When multiple data points exist at the same timestamp with values for different fields, hovering should show the correct data for the hovered field
   - Tooltips should always show non-null values, never null/undefined
   - Test with overlapping bars from different series at the same x position but different `from_time` timestamps - ghost overlays should not appear

---

## Notes

- The `panelcfg.gen.ts` file is auto-generated and will be updated when you run `make gen-cue` to regenerate the TypeScript types from the CUE schema
- Type assertions `(options as any).dynamicColumnWidthField` are used temporarily until the schema is regenerated
- All changes are backward compatible - other panels using TimelineChart components are not affected
- The implementation follows existing patterns from Time Series panel where applicable
