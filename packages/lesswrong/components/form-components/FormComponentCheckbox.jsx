import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { registerComponent, Components } from 'meteor/vulcan:core';
import Checkbox from '@material-ui/core/Checkbox';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    marginLeft:theme.spacing.unit*2
  },
  size: {
    width:36,
    height:0
  }
})

class MuiCheckbox extends Component {
  constructor(props, context) {
    super(props,context);
    this.state = {
      checked: props.document && props.document[props.name] || false
    }
  }

  componentDidMount() {
    this.context.addToSuccessForm(() => this.setState({checked: false}))
    this.context.updateCurrentValues({
      [this.props.name]: this.props.document && this.props.document[this.props.name] || false
    })
  }

  onChange = (event) => {
    this.setState({checked: !this.state.checked})
    this.context.updateCurrentValues({
      [this.props.name]: !this.state.checked
    })
  }

  render() {
    const { classes, label } = this.props
    return <div className={classes.root}>
        <Checkbox
          className={classes.size}
          checked={this.state.checked}
          onClick={this.onChange}
          disableRipple
        />
        <label>{label}</label>
    </div>
  }
}

MuiCheckbox.contextTypes = {
  updateCurrentValues: PropTypes.func,
  addToSuccessForm: PropTypes.func,
};

registerComponent("FormComponentCheckbox", MuiCheckbox, withStyles(styles));