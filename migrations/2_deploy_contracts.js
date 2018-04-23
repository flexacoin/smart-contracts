const BigNumber = web3.BigNumber

const Flexacoin = artifacts.require('./Flexacoin.sol')
const TokenVault = artifacts.require('./TokenVault.sol')

const DECIMALS_FACTOR = new BigNumber('10').pow('18')
const tokens = num => num * DECIMALS_FACTOR

// allocations.reduce((val, { bonus }) => val + bonus, 0)

const allocations = [
  {
    address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
    allocation: 10000,
    bonus: 1000,
  },
  {
    address: '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef',
    allocation: 20000,
    bonus: 10000,
  },
]

module.exports = async function(deployer, network, accounts) {
  if (network === 'test' || network === 'coverage') {
    return
  }

  const owner = accounts[0]

  // Deploy Flexacoin Contract
  const flexacoin = await Flexacoin.new({ from: owner })

  // Deploy Initial TokenVault Contract
  const tokensToBeAllocated = tokens(30000)
  const tokenVault = await TokenVault.new(
    flexacoin.address,
    tokensToBeAllocated,
    0,
    {
      from: owner,
    }
  )

  // Deploy Bonus TokenVault Contract
  const bonusTokensToBeAllocated = tokens(11000)
  const vestingTime = 6 * 31 * 24 * 60 * 60 // 6 months

  const bonusVault = await TokenVault.new(
    flexacoin.address,
    bonusTokensToBeAllocated,
    vestingTime,
    { from: owner }
  )

  allocations.forEach(async ({ address, allocation, bonus }) => {
    const allocationTx = await tokenVault.setAllocation(address, allocation, {
      from: owner,
    })
    const bonusTx = await bonusVault.setAllocation(address, bonus, {
      from: owner,
    })

    console.log('Allocation Transaction:', allocationTx)
    console.log('Bonus Transaction', bonusTx)
  })
}
