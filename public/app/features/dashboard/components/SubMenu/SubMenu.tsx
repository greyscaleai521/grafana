import { css } from '@emotion/css';
import React, { PureComponent } from 'react';
import { connect, MapStateToProps } from 'react-redux';

import { AnnotationQuery, DataQuery, TypedVariableModel, GrafanaTheme2, VariableWithOptions } from '@grafana/data';
import { DashboardLink } from '@grafana/schema';
import { stylesFactory, Themeable2, withTheme2 } from '@grafana/ui';

import { StoreState } from '../../../../types';
import { getSubMenuVariables, getVariablesState } from '../../../variables/state/selectors';
import { VariableHide, VariableModel } from '../../../variables/types';
import { DashboardModel } from '../../state';

import { Annotations } from './Annotations';
import { CategoryBar } from './CategoryBar';
import { DashboardLinks } from './DashboardLinks';
import { SubMenuItems } from './SubMenuItems';

interface OwnProps extends Themeable2 {
  dashboard: DashboardModel;
  links: DashboardLink[];
  annotations: AnnotationQuery[];
}

interface ConnectedProps {
  variables: TypedVariableModel[];
}

interface DispatchProps {}

type Props = OwnProps & ConnectedProps & DispatchProps;

function isDefault(filter: VariableWithOptions) {
  return filter.current.value.toString() === '' ||
    filter.current.value.toString() === 'All' ||
    filter.current.value.toString() === '$__all' ||
    filter.current.value.toString() === 'Production' ||
    filter.current.value.toString() === 'Max Resolution'
    ? true
    : false;
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

  disableSubmitOnEnter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  render() {
    const { dashboard, variables, links, annotations, theme } = this.props;

    const styles = getStyles(theme);

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
          variables={variables}
        />
        <div className={styles.submenu}>
          <form aria-label="Template variables" className={styles.formStyles} onSubmit={this.disableSubmitOnEnter}>
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
          <div className={styles.spacer} />
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

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    formStyles: css`
      display: flex;
      flex-wrap: wrap;
      display: contents;
    `,
    submenu: css`
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-content: flex-start;
      align-items: flex-start;
      gap: ${theme.spacing(1)} ${theme.spacing(2)};
      padding: 0 0 ${theme.spacing(1)} 0;
    `,
    spacer: css({
      flexGrow: 1,
    }),
  };
});

export const SubMenu = withTheme2(connect(mapStateToProps)(SubMenuUnConnected));

SubMenu.displayName = 'SubMenu';
