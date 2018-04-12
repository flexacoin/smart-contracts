import React, { Component } from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import getDisplayName from './getDisplayName'

const drizzleConnect = WrappedComponent => {
  class DrizzledComponent extends Component {
    constructor(props, context) {
      super(props, context)

      this.drizzle = this.context.drizzle
    }

    render() {
      return (
        <WrappedComponent
          {...this.props}
          {...this.state}
          drizzle={this.drizzle}
        />
      )
    }
  }

  DrizzledComponent.displayName = `Drizzled(${getDisplayName(WrappedComponent)}`
  DrizzledComponent.wrappedComponent = WrappedComponent

  DrizzledComponent.contextTypes = {
    drizzle: PropTypes.object,
  }

  return hoistStatics(DrizzledComponent, WrappedComponent)
}

export default drizzleConnect
