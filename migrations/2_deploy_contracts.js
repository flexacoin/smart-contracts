const { assert } = require('chai')
// const { BigNumber } = web3

const Flexacoin = artifacts.require('./Flexacoin.sol')
const TokenVault = artifacts.require('./TokenVault.sol')

const FlexaContractManager = require('../tools/FlexaContractManager')

module.exports = async function(deployer, network, accounts) {
  if (network === 'test' || network === 'coverage') {
    return
  }

  const vaultConfig = vaultConfigs[network]
  assert.isNotNull(vaultConfig)

  const flexaDeployment = new FlexaContractManager(
    web3,
    owner,
    Flexacoin,
    TokenVault,
    vaultConfig
  )

  await flexaDeployment.run()

  console.log(accounts)
}

***REMOVED***
//
