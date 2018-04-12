import React, { Component, Children } from 'react'
import PropTypes from 'prop-types'
import { Drizzle, generateStore } from 'drizzle'

class DrizzleProvider extends Component {
  constructor(props, context) {
    super(props, context)

    const drizzleStore = props.store || generateStore(props.options)
    this.drizzle = new Drizzle(props.options, drizzleStore)
  }

  getChildContext() {
    const { drizzle } = this
    return { drizzle }
  }

  render() {
    if (this.props.options.web3.block === false) {
      return Children.only(this.props.children)
    }
  }
}

DrizzleProvider.propTypes = {
  options: PropTypes.object.isRequired,
  store: PropTypes.object,
}

// you must specify what you’re adding to the context
DrizzleProvider.childContextTypes = {
  drizzle: PropTypes.object.isRequired,
  //   drizzleStore: PropTypes.object.isRequired,
}

export default DrizzleProvider
