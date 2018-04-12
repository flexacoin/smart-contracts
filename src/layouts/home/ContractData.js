import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

class ContractData extends Component {
  componentWillReceiveProps(nextProps) {
    // console.log('PROPS', this.props, 'NEXT', nextProps)

    const { contract: contractName, methodArgs = [], method } = nextProps
    const { contracts } = this.context.drizzle

    const contract = contracts[contractName]

    if (!contract) {
      return
    }

    // Get the contract ABI
    const { abi } = contract

    // Fetch initial value from chain and return cache key for reactive updates.
    this.dataKey = contract.methods[method].cacheCall(...methodArgs)

    // Iterate over abi for correct function.
    for (var i = 0; i < abi.length; i++) {
      if (abi[i].name === this.props.method) {
        this.fnABI = abi[i]

        break
      }
    }
  }

  render() {
    const contract = this.props.contracts[this.props.contract]
    const { method } = this.props

    // Contract is not yet intialized.
    if (!contract.initialized) {
      return <span>Initializing...</span>
    }

    // If the cache key we received earlier isn't in the store yet; the initial value is still being fetched.
    if (!(this.dataKey in contract[method])) {
      return <span>Fetching...</span>
    }

    // Show a loading spinner for future updates.
    var pendingSpinner = contract.synced ? '' : ' 🔄'

    // Optionally hide loading spinner (EX: ERC20 token symbol).
    if (this.props.hideIndicator) {
      pendingSpinner = ''
    }

    var displayData = contract[method][this.dataKey].value

    // Optionally convert to UTF8
    if (this.props.toUtf8) {
      displayData = this.context.drizzle.web3.utils.hexToUtf8(displayData)
    }

    // Optionally convert to Ascii
    if (this.props.toAscii) {
      displayData = this.context.drizzle.web3.utils.hexToAscii(displayData)
    }

    // If return value is an array
    if (typeof displayData === 'array') {
      const displayListItems = displayData.map((datum, index) => {
        ;<li key={index}>
          {datum}
          {pendingSpinner}
        </li>
      })

      return <ul>{displayListItems}</ul>
    }

    // If retun value is an object
    if (typeof displayData === 'object') {
      var i = 0
      const displayObjectProps = []

      Object.keys(displayData).forEach(key => {
        if (i != key) {
          displayObjectProps.push(
            <li key={i}>
              <strong>{key}</strong>
              {pendingSpinner}
              <br />
              {displayData[key]}
            </li>
          )
        }

        i++
      })

      return <ul>{displayObjectProps}</ul>
    }

    return (
      <span>
        {displayData}
        {pendingSpinner}
      </span>
    )
  }
}

ContractData.contextTypes = {
  drizzle: PropTypes.object,
}

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
  }
}

function drizzleConnect() {}

export default connect(mapStateToProps)(ContractData)
