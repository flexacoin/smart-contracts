import path from 'path'
import { increaseTime } from './helpers/time'
import FlexaContractManager from '../tools/FlexaContractManager'

const { BigNumber } = web3
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

/*
 * Integration tests of the Flexacoin and TokenVault deployment scripts, as
 * well as post deployment operation of the contracts, including:
 *
 * - Allocation of investor tokens and bonuses
 * - Transfer of initial tokens for some investors
 * - Claim of initial tokens for other investors
 * - Bonus vault vesting lock up and unlocking
*/
contract('Deployment Simulation', function([_, owner]) {
  const tokensToBeAllocated = 36703064000
  const bonusToBeAllocated = 31082532000
  const bonusVestingPeriod = 180 * 24 * 60 * 60 // 180 days * 24 hours * 60 minutes * 60 seconds
  const vaultConfig = {
    tokensToBeAllocated,
    bonusToBeAllocated,
    bonusVestingPeriod,
  }

  const flexaDeployment = new FlexaContractManager(
    web3,
    owner,
    Flexacoin,
    TokenVault,
    vaultConfig
  )

  const testDistributionFile = path.join(
    __dirname,
    'data/test_distribution.csv'
  )
  flexaDeployment.parseDistribution(testDistributionFile)

  before(async function() {
    await flexaDeployment.deployContracts()
  })

  describe('when contracts are deployed', function() {
    describe('when preparing the vaults', function() {
      before(async function() {
        await flexaDeployment.allocateDistribution()
        await flexaDeployment.prepareVaults()
      })

      it('is prepared correctly', async function() {
        const tokenVaultBalance = await flexaDeployment.flexacoin.balanceOf(
          flexaDeployment.tokenVault.address
        )
        const tokensAllocated = await flexaDeployment.tokenVault.tokensAllocated()
        tokensAllocated.should.bignumber.equal(tokenVaultBalance)

        const bonusVaultBalance = await flexaDeployment.flexacoin.balanceOf(
          flexaDeployment.bonusVault.address
        )
        const bonusAllocated = await flexaDeployment.bonusVault.tokensAllocated()
        bonusAllocated.should.bignumber.equal(bonusVaultBalance)
      })
    })

    describe('when vaults are prepared', function() {
      it('vaults can be locked', async function() {
        await flexaDeployment.lockVaults()
      })
    })

    describe('when vaults have been locked', function() {
      it('Token Vault can be unlocked', async function() {
        await flexaDeployment.tokenVault.unlock({ from: owner })
      })
    })

    describe('when token vault has been unlocked', function() {
      it('tokens can be transferred to investors', async function() {
        await flexaDeployment.transferTokens()
      })
    })

    describe(`when ${bonusVestingPeriod} seconds have passed`, function() {
      before(async function() {
        await increaseTime(bonusVestingPeriod)
      })
      it('Bonus Vault can be unlocked', async function() {
        await flexaDeployment.bonusVault.unlock({ from: owner })
      })
      it('bonuses can be transferred to investors', async function() {
        await flexaDeployment.transferBonuses()
      })
    })
  })

  after(async function() {
    flexaDeployment.printResults()

    // Fast forward to clear the deck for the next tests
    const oneHour = 1 * 60 * 60
    await increaseTime(oneHour)
  })
})

// const parseGas = txHash => {
//   const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
//   return gasUsed
// }
