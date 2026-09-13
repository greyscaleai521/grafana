import {
  REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE,
  resolveHiResTimestampsEnabled,
  resolveRealTimeThresholdDays,
} from '@grafana/data';
import { type FormatVariable, sceneGraph, type SceneObject } from '@grafana/scenes';

export class HiResTimestampsMacro implements FormatVariable {
  public state: { name: string; type: string };
  private _sceneObject: SceneObject;

  public constructor(name: string, sceneObject: SceneObject) {
    this.state = { name, type: 'time_macro' };
    this._sceneObject = sceneObject.getRoot();
  }

  public getValue() {
    const timeRange = sceneGraph.getTimeRange(this._sceneObject);
    const thresholdDays = resolveRealTimeThresholdDays(
      sceneGraph.lookupVariable(REAL_TIME_THRESHOLD_IN_DAYS_VARIABLE, this._sceneObject)?.getValue()
    );
    return resolveHiResTimestampsEnabled(timeRange.state.value, Date.now(), thresholdDays) ? 'true' : 'false';
  }

  public getValueText?(): string {
    return this.getValue();
  }
}
