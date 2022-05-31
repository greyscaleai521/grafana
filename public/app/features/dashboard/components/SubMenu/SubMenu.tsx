import { css } from '@emotion/css';
import React, { PureComponent } from 'react';
import { connect, MapStateToProps } from 'react-redux';

import { AnnotationQuery } from '@grafana/data';

import { StoreState } from '../../../../types';
import { getSubMenuVariables, getVariablesState } from '../../../variables/state/selectors';
import { VariableModel } from '../../../variables/types';
import { DashboardModel } from '../../state';
import { DashboardLink } from '../../state/DashboardModel';

import { Annotations } from './Annotations';
import { DashboardLinks } from './DashboardLinks';
import { SubMenuItems } from './SubMenuItems';
import { Button } from '@grafana/ui';

interface OwnProps {
  dashboard: DashboardModel;
  links: DashboardLink[];
  annotations: AnnotationQuery[];
}

interface ConnectedProps {
  variables: VariableModel[];
}

interface DispatchProps {}

type Props = OwnProps & ConnectedProps & DispatchProps;

class SubMenuUnConnected extends PureComponent<Props, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      filtersExpanded: false,
    };
  }
  onAnnotationStateChanged = (updatedAnnotation: any) => {
    // we're mutating dashboard state directly here until annotations are in Redux.
    for (let index = 0; index < this.props.dashboard.annotations.list.length; index++) {
      const annotation = this.props.dashboard.annotations.list[index];
      if (annotation.name === updatedAnnotation.name) {
        annotation.enable = !annotation.enable;
        break;
      }
    }
    this.props.dashboard.startRefresh();
    this.forceUpdate();
  };
  ExpandFilters = () => {
    event?.preventDefault();
    if (this.state.filtersExpanded) {
      this.setState({
        filtersExpanded: false,
      });
    } else {
      this.setState({
        filtersExpanded: true,
      });
    }
  };

  render() {
    const { dashboard, variables, links, annotations } = this.props;

    if (!dashboard.isSubMenuVisible()) {
      return null;
    }

    const readOnlyVariables = dashboard.meta.isSnapshot ?? false;

    return (
      <>
        <div className="submenu-controls">
          <form aria-label="Template variables" className={styles}>
            <SubMenuItems variables={variables} filtersExpanded={this.state.filtersExpanded} readOnly={readOnlyVariables} />
          </form>
          <Annotations
            annotations={annotations}
            onAnnotationChanged={this.onAnnotationStateChanged}
            events={dashboard.events}
          />
          <div className="gf-form gf-form--grow" />
          {dashboard && <DashboardLinks dashboard={dashboard} links={links} />}
          <div className="clearfix" />
        </div>
        <div className="FiltersButton">
          <Button className="clearall-btn MoreFilters" onClick={this.ExpandFilters} fill={'text'}>
            {this.state.filtersExpanded ? 'Show Less Filters' : 'Show More Filters'}
          </Button>
        </div>
      </>
    );
  }
}

const mapStateToProps: MapStateToProps<ConnectedProps, OwnProps, StoreState> = (state, ownProps) => {
  const { uid } = ownProps.dashboard;
  const templatingState = getVariablesState(uid, state);
  return {
    variables: getSubMenuVariables(uid, templatingState.variables),
  };
};

const styles = css`
  display: flex;
  flex-wrap: wrap;
  display: contents;
`;

export const SubMenu = connect(mapStateToProps)(SubMenuUnConnected);

SubMenu.displayName = 'SubMenu';
