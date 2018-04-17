const BigNumber = web3.BigNumber

const FlexaToken = artifacts.require('./FlexaToken.sol')
const TokenVault = artifacts.require('./TokenVault.sol')

const DECIMALS_FACTOR = new BigNumber('10').pow('18')

module.exports = async function(deployer) {
  deployer.deploy(FlexaToken).then(() => {
    console.log('FlexaToken Address: ', FlexaToken.address)

    const flexaTokenAddress = FlexaToken.address
    const tokensToBeAllocated = 1000 * DECIMALS_FACTOR
    const bonusesToBeAllocated = 1000 * DECIMALS_FACTOR

    return deployer.deploy(
      TokenVault,
      flexaTokenAddress,
      tokensToBeAllocated,
      bonusesToBeAllocated
    )
    console.log('TokenVault Address: ', TokenVault.address)
  })
}
