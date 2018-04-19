const BigNumber = web3.BigNumber

const FlexaToken = artifacts.require('./FlexaToken.sol')
const TokenVault = artifacts.require('./TokenVault.sol')

const DECIMALS_FACTOR = new BigNumber('10').pow('18')
const tokens = num => num * DECIMALS_FACTOR

module.exports = async function(deployer, environment, accounts) {
  if (environment === 'test') {
    return
  }

  const owner = accounts[1]

  deployer
    .deploy(FlexaToken, { from: owner })
    .then(() => {
      console.log('FlexaToken Address: ', FlexaToken.address)

      const flexaTokenAddress = FlexaToken.address
      const tokensToBeAllocated = tokens(1000)
      const vestingTime = 60

      return deployer.deploy(
        TokenVault,
        flexaTokenAddress,
        tokensToBeAllocated,
        0
      )
    })
    .then(async () => {
      console.log('TokenVault Address: ', TokenVault.address)

      const tx = await FlexaToken.transfer(TokenVault.address, tokens(1000), {
        from: owner,
      })

      console.log(tx)
    })
}
