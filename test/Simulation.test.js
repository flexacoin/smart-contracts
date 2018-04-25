import path from 'path'
import { increaseTime } from './helpers/time'

const { BigNumber } = web3
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

// import { deployContracts, processDistribution } from './helpers/deploy'
// import FlexaContractManager from './helpers/deploy'
import fs from 'fs'
import csv from 'fast-csv'

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

// const parseGas = txHash => {
//   const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
//   return gasUsed
// }

// function Log() {
//   function line() {
//     console.log('---')
//     return this
//   }

//   function log(text) {
//     console.log('TESTING', this)
//     console.log(text)
//     return this
//   }

//   function title(text) {
//     line()
//       .log(text)
//       .line()
//     return this
//   }

//   return {
//     line: line.bind(this),
//     log: log.bind(this),
//     title: title.bind(this),
//   }
// }

/**
 * Object with API to manage Flexa smart contracts operation.
 */
export default class FlexaContractManager {
  static SYMBOL = 'FXC'
  static NAME = 'Flexacoin'
  static DECIMALS = 18
  static DECIMALS_FACTOR = new BigNumber('10').pow(
    FlexaContractManager.DECIMALS
  )

  // Helper function to normalize human readable values to token values with
  // decimals applied
  static toTokens = num => num * FlexaContractManager.DECIMALS_FACTOR

  static INITIAL_SUPPLY = FlexaContractManager.toTokens(100000000000)

  static parseDistributionCSV = filename => {
    const distribution = []
    return new Promise((resolve, reject) => {
      fs
        .createReadStream(filename)
        .pipe(csv())
        .on('data', data => {
          const [address, value, bonus] = data
          distribution.push({ address, value, bonus })
        })
        .on('end', () => resolve(distribution))
        .on('error', () => reject())
    })
  }

  /**
   * Create a new FlexaContractManager instance with the following parameters
   *
   * @param {object} web3 - Web3 instance
   * @param {string} owner - Address of the contract owner/deployer
   * @param {object} Flexacoin - Truffle contract object for Flexacoin
   * @param {object} TokenVault - Truffle contract object for TokenVault
   * @param {object} vaultConfig - Configuration options for vaults
   */
  constructor(web3, owner, Flexacoin, TokenVault, vaultConfig) {
    this.web3 = web3
    this.owner = owner
    this.contracts = {
      Flexacoin,
      TokenVault,
    }
    this.vaultConfig = vaultConfig

    // this.log = new Log()
  }

  transactionHashes = []
  receipts = []
  allocations = []

  parseDistribution = async filename => {
    this.printTitle('Parse Distribution')
    this.distribution = await FlexaContractManager.parseDistributionCSV(
      filename
    )
    this.print(`Done parsing ${filename}`)
  }

  deployContracts = async () => {
    const {
      owner,
      contracts: { Flexacoin, TokenVault },
    } = this

    this.flexacoin = this._processContract(
      'Flexacoin',
      await Flexacoin.new({
        from: owner,
      })
    )

    // Create TokenVault contract for tokens that are immediately available
    // once the vault has been prepared and unlocked.
    const { tokensToBeAllocated } = this.vaultConfig
    this.tokenVault = this._processContract(
      'Token Vault',
      await TokenVault.new(
        this.flexacoin.address,
        FlexaContractManager.toTokens(tokensToBeAllocated),
        0, // tokenVault has no vesting period. Can be unlocked immediately after being locked
        {
          from: owner,
        }
      )
    )

    /**
     * Create TokenVault contract for bonus tokens. These will vest and be
     * available bonusVestingPeriod seconds after the contract is locked.
     */
    const { bonusToBeAllocated, bonusVestingPeriod } = this.vaultConfig
    this.bonusVault = this._processContract(
      'Bonus Vault',
      await TokenVault.new(
        this.flexacoin.address,
        FlexaContractManager.toTokens(bonusToBeAllocated),
        bonusVestingPeriod,
        {
          from: owner,
        }
      )
    )
  }

  // Do whatever logging/saving of deployed contract instances needed here
  _processContract = (name, instance) => {
    this.printTitle(`${name} Contract`)
    this.print(`Deploying ${name} contract... deployed!`)
    this.print(`  Address: ${instance.address}`)
    this.print(`  Tx Hash: ${instance.transactionHash}`)

    this._pushTx(instance.transactionHash)
    return instance
  }

  allocateDistribution = async () => {
    this.printTitle('Vault Distribution')

    await Array.forEach(
      this.distribution,
      ({ address, value, bonus }) => {
        this.printAllocation(address, value, bonus)

        this.allocate(this.tokenVault, address, value)
        this.allocate(this.bonusVault, address, bonus)
      },
      this
    )
  }

  allocate = async (vault, address, value) => {
    const { owner } = this

    const result = await vault.setAllocation(
      address,
      FlexaContractManager.toTokens(value),
      {
        from: owner,
      }
    )

    this.allocations.push(result)
    this._pushReceipt(result.receipt)

    return result
  }

  prepareVaults = async () => {
    this.printTitle('Preparing Token and Bonus Vaults')

    const {
      owner,
      tokenVault,
      bonusVault,
      vaultConfig: { tokensToBeAllocated, bonusToBeAllocated },
    } = this

    this.print(`Preparing Token Vault`)
    await this._transfer(tokenVault.address, owner, tokensToBeAllocated)

    this.print(`Preparing Bonus Vault`)
    await this._transfer(bonusVault.address, owner, bonusToBeAllocated)
  }

  _transfer = async (to, from, value) => {
    this.print(`Transferring ${value} tokens to ${to}`)

    const result = await this.flexacoin.transfer(
      to,
      FlexaContractManager.toTokens(value),
      { from }
    )

    this._pushReceipt(result.receipt)

    return result
  }

  lockVaults = async () => {
    const { owner, tokenVault, bonusVault } = this

    await tokenVault.lock({ from: owner })
    await bonusVault.lock({ from: owner })
  }

  sendTokens = async () => {
    this.printTitle('Sending Tokens')

    await Array.forEach(
      this.distribution,
      ({ address, value }) => {
        this.print(`Sending ${value} tokens to ${address}`)
        this._transferFor(this.tokenVault, address)
      },
      this
    )
  }

  sendBonuses = async () => {
    this.printTitle('Sending Bonus Tokens')

    await Array.forEach(
      this.distribution,
      ({ address, _, bonus }) => {
        this.print(`Sending ${bonus} bonus tokens to ${address}`)
        this._transferFor(this.bonusVault, address)
      },
      this
    )
  }

  _transferFor = async (vault, address) => {
    const { owner } = this

    const result = await vault.transferFor(address, { from: owner })

    this._pushReceipt(result.receipt)

    return result
  }

  _pushTx = txHash => {
    this.transactionHashes.push(txHash)
    this.receipts[txHash] = this.web3.eth.getTransactionReceipt(txHash)
  }

  _pushReceipt = receipt => {
    this.transactionHashes.push(receipt.transactionHash)
    this.receipts[receipt.transactionHash] = receipt
  }

  printAllocation = (address, tokens, bonus) => {
    console.log()
    this.printLine()
    this.print(`Address: ${address}`)
    this.print(`Tokens:  ${tokens}`)
    this.print(`Bonus:   ${bonus}`)
  }

  printTitle(title) {
    console.log(`
--------------------------------------------------------------------------------
- ${title}
--------------------------------------------------------------------------------`)
  }

  print(text) {
    console.log(`- ${text}`)
  }

  printLine() {
    console.log(
      `--------------------------------------------------------------------------------`
    )
  }

  printResults = () => {
    // const gasUsed = {
    //   contracts: 0,
    //   transfers: 0,
    //   allocation: 0,
    // }
    // console.log('Gas Used: Contracts', gasUsed.contracts)
    // console.log('Gas Used: Transfers', gasUsed.transfers)
    // console.log('Gas Used: Allocation', gasUsed.allocation)

    const { transactionHashes } = this

    this.printTitle('Tx Hashes')

    transactionHashes.forEach(v => console.log(v))
  }
}

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

  flexaDeployment.parseDistribution(
    path.join(__dirname, 'data/test_distribution.csv')
  )

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
        await flexaDeployment.sendTokens()
      })
    })

    describe(`when ${bonusVestingPeriod} has passed`, function() {
      before(async function() {
        await increaseTime(bonusVestingPeriod)
      })

      it('Bonus Vault can be unlocked', async function() {
        await flexaDeployment.bonusVault.unlock({ from: owner })
      })

      it('bonuses can be transferred to investors', async function() {
        await flexaDeployment.sendBonuses()
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
