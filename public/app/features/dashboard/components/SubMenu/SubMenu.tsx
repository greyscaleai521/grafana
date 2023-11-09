import { css } from '@emotion/css';
import React, { PureComponent } from 'react';
import { connect, MapStateToProps } from 'react-redux';

import { AnnotationQuery, DataQuery, VariableWithOptions } from '@grafana/data';

import { StoreState } from '../../../../types';
import { getSubMenuVariables, getVariablesState } from '../../../variables/state/selectors';
import { VariableHide, VariableModel } from '../../../variables/types';
import { DashboardModel } from '../../state';
import { DashboardLink } from '../../state/DashboardModel';

import { Annotations } from './Annotations';
import { CategoryBar } from './CategoryBar';
import { DashboardLinks } from './DashboardLinks';
import { SubMenuItems } from './SubMenuItems';

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

function isDefault(filter: VariableWithOptions) {
  return filter.current.value.toString() === '' || filter.current.value.toString() === '$__all' ? true : false;
}

class SubMenuUnConnected extends PureComponent<Props, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      selectedCategory: 0,
      uniqueCategories: [],
      categoryFilterCounter: {},
    };
  }
  onAnnotationStateChanged = (updatedAnnotation: AnnotationQuery<DataQuery>) => {
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

  onCategoryChange = (index: number) => {
    this.setState({
      selectedCategory: index,
    });
  };

  onFilterCounterChange = (counter: Record<string, number>) => {
    this.setState({
      categoryFilterCounter: counter,
    });
  };

  componentDidUpdate(prevProps: Props, prevState: any) {
    const { variables } = this.props;
    let counter: Record<string, number> = {};

    variables.forEach((variable) => {
      if (variable.category !== undefined && variable.category !== '' && variable.category !== null) {
        if (variable.hide !== VariableHide.hideVariable && !isDefault(variable as VariableWithOptions)) {
          if (Object.keys(counter).includes(variable.category)) {
            counter[variable.category] += 1;
          } else {
            counter[variable.category] = 1;
          }
        }
      }
    });
    if (JSON.stringify(counter) !== JSON.stringify(prevState.categoryFilterCounter)) {
      this.setState({
        categoryFilterCounter: counter,
      });
    }
  }

  componentDidMount() {
    const { variables } = this.props;
    const uniqueCategories = new Set();
    variables.forEach((variable) => {
      if (variable.category !== undefined && variable.category !== '' && variable.category !== null) {
        uniqueCategories.add(variable.category);
      }
    });

    this.setState({
      uniqueCategories: Array.from(uniqueCategories),
    });
  }

  render() {
    const { dashboard, variables, links, annotations } = this.props;

    if (!dashboard.isSubMenuVisible()) {
      return null;
    }

    const readOnlyVariables = dashboard.meta.isSnapshot ?? false;

    return (
      <>
        <CategoryBar
          categories={this.state.uniqueCategories}
          onCategoryChange={this.onCategoryChange}
          selecedCategory={this.state.selectedCategory}
          categoryFilterCounter={this.state.categoryFilterCounter}
        />
        <div className="submenu-controls">
          <form aria-label="Template variables" className={styles}>
            <SubMenuItems
              variables={variables}
              readOnly={readOnlyVariables}
              selectedCategory={this.state.selectedCategory}
              categories={Array.from(this.state.uniqueCategories)}
            />
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
