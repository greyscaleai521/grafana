import { css } from '@emotion/css';
import { PureComponent } from 'react';
import * as React from 'react';
import { connect, type MapStateToProps } from 'react-redux';

import {
  type AnnotationQuery,
  type DataQuery,
  type TypedVariableModel,
  type GrafanaTheme2,
  VariableHide,
} from '@grafana/data';
import { t } from '@grafana/i18n';
import { type DashboardLink } from '@grafana/schema';
import { stylesFactory, type Themeable2, withTheme2 } from '@grafana/ui';
import { type StoreState } from 'app/types/store';

import { getSubMenuVariables, getVariablesState } from '../../../variables/state/selectors';
import { type DashboardModel } from '../../state/DashboardModel';

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

interface State {
  selectedCategory: number;
  uniqueCategories: string[];
  categoryFilterCounter: Record<string, number>;
}

export function isDefault(variable: TypedVariableModel): boolean {
  const current = 'current' in variable ? variable.current : undefined;
  const value = current?.value;
  if (!value) {
    return true;
  }

  const valueStr = String(value);
  const defaultValues = new Set(['', 'lb', 'All', '$__all', 'Production', 'Max Resolution']);
  const specialCases: Record<string, string> = {
    InspTarget: '1200',
    InspTargetPerc: '90',
  };

  return Boolean(defaultValues.has(valueStr) || (variable.id && specialCases[variable.id] === valueStr));
}

class SubMenuUnConnected extends PureComponent<Props, State> {
  constructor(props: Props) {
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

  disableSubmitOnEnter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  onCategoryChange = (index: number) => {
    this.setState({ selectedCategory: index });
  };

  componentDidMount() {
    const { variables } = this.props;
    const uniqueCategories = new Set<string>();
    variables.forEach((variable) => {
      if (variable.category) {
        uniqueCategories.add(variable.category);
      }
    });

    this.setState({ uniqueCategories: Array.from(uniqueCategories) });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { variables } = this.props;
    const counter: Record<string, number> = {};

    variables.forEach((variable) => {
      if (variable.category) {
        if (variable.hide !== VariableHide.hideVariable && !isDefault(variable)) {
          counter[variable.category] = (counter[variable.category] ?? 0) + 1;
        }
      }
    });

    if (JSON.stringify(counter) !== JSON.stringify(prevState.categoryFilterCounter)) {
      this.setState({ categoryFilterCounter: counter });
    }
  }

  render() {
    const { dashboard, variables, links, annotations, theme } = this.props;

    const styles = getStyles(theme);

    const readOnlyVariables = dashboard.meta.isSnapshot ?? false;

    return (
      <>
        <div className={styles.controlsTop}>
          <CategoryBar
            categories={this.state.uniqueCategories}
            onCategoryChange={this.onCategoryChange}
            selecedCategory={this.state.selectedCategory}
            categoryFilterCounter={this.state.categoryFilterCounter}
            variables={variables}
          />
        </div>
        <div className={styles.submenu}>
          <form
            aria-label={t('dashboard.sub-menu-un-connected.aria-label-template-variables', 'Template variables')}
            className={styles.formStyles}
            onSubmit={this.disableSubmitOnEnter}
          >
            <SubMenuItems
              variables={variables}
              readOnly={readOnlyVariables}
              selectedCategory={this.state.selectedCategory}
              categories={this.state.uniqueCategories}
            />
          </form>
          <Annotations
            annotations={annotations}
            onAnnotationChanged={this.onAnnotationStateChanged}
            events={dashboard.events}
          />
          <div className={styles.spacer} />
          {dashboard && <DashboardLinks dashboard={dashboard} links={links} />}
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
    controlsTop: css({
      display: 'flex',
      flexWrap: 'wrap',
    }),
    formStyles: css({
      display: 'contents',
      flexWrap: 'wrap',
    }),
    submenu: css({
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'flex-start',
      alignItems: 'flex-start',
      gap: `${theme.spacing(1)} ${theme.spacing(2)}`,
      padding: `${theme.spacing(1)} 0 ${theme.spacing(1)} ${theme.spacing(1)}`,
    }),
    spacer: css({
      flexGrow: 1,
    }),
  };
});

export const SubMenu = withTheme2(connect(mapStateToProps)(SubMenuUnConnected));

SubMenu.displayName = 'SubMenu';
