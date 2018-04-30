const path = require('path')
const { assert } = require('chai')

const Flexacoin = artifacts.require('./Flexacoin.sol')
const TokenVault = artifacts.require('./TokenVault.sol')

const FlexaContractManager = require('../tools/FlexaContractManager').default

module.exports = async function(deployer, network, [owner]) {
  if (network === 'test' || network === 'coverage') {
    return
  }

  const vaultConfig = require('../tools/vaultConfig.js')[network]
  assert.isNotNull(vaultConfig)

  const flexaDeployment = new FlexaContractManager(
    web3,
    owner,
    Flexacoin,
    TokenVault,
    vaultConfig
  )

  const distributionFile = path.join(
    __dirname,
    `../tools/data/token_distribution.${network}.csv`
  )

  try {
    await flexaDeployment.parseDistribution(distributionFile)
  } catch (e) {
    console.error('Error parsing distribution file', e)
    return false
  }

  try {
    await flexaDeployment.run()
  } catch (e) {
    console.error(`Error(s) deploying to ${network} network:`, e)
  }
}
