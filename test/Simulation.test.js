import path from 'path'
import { assertRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { tokens } from './helpers/flexacoin'

// import { deployContracts, processDistribution } from './helpers/deploy'
// import FlexaSmartContracts from './helpers/deploy'
import fs from 'fs'
import csv from 'fast-csv'

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const parseGas = txHash => {
  const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
  return gasUsed
}

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
export default class FlexaSmartContracts {
  static SYMBOL = 'FXC'
  static NAME = 'Flexacoin'
  static DECIMALS = 18
  static DECIMALS_FACTOR = new BigNumber('10').pow(FlexaSmartContracts.DECIMALS)

  // Helper function to normalize human readable values to token values with
  // decimals applied
  static toTokens = num => num * FlexaSmartContracts.DECIMALS_FACTOR

  static INITIAL_SUPPLY = FlexaSmartContracts.toTokens(100000000000)

  static parseDistributionCSV = filename => {
    const distribution = []
    return new Promise((resolve, reject) => {
      fs
        .createReadStream(filename)
        .pipe(csv())
        .on('data', function(data) {
          const [address, value, bonus] = data
          distribution.push({ address, value, bonus })
        })
        .on('end', function() {
          resolve(distribution)
        })
    })
  }

  /**
   * Create a new FlexaSmartContracts instance with the following parameters
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
    this.distribution = await FlexaSmartContracts.parseDistributionCSV(filename)
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
        FlexaSmartContracts.toTokens(tokensToBeAllocated),
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
        FlexaSmartContracts.toTokens(bonusToBeAllocated),
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

    Array.forEach(
      this.distribution,
      function({ address, value, bonus }) {
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
      FlexaSmartContracts.toTokens(value),
      {
        from: this.owner,
      }
    )

    this.allocations.push(result)
    this._pushReceipt(result.receipt)

    return result
  }

  prepareVaults = () => {
    this.printTitle('Preparing Token and Bonus Vaults')

    const { tokensToBeAllocated, bonusToBeAllocated } = this.vaultConfig
    this.print(`Transferring ${tokensToBeAllocated} to Token Vault`)
    this.ownerTransferTokens(
      this.tokenVault.address,
      FlexaSmartContracts.toTokens(tokensToBeAllocated)
    )

    this.print(`Transferring ${bonusToBeAllocated} to Bonus Vault`)
    this.ownerTransferTokens(
      this.bonusVault.address,
      FlexaSmartContracts.toTokens(bonusToBeAllocated)
    )
  }

  // Transfer the initial supply to the token vault
  ownerTransferTokens = async (to, value) => {
    const { owner } = this
    const result = await this.flexacoin.transfer(to, value, {
      from: owner,
    })

    // deploymentLog.transactions.push(tx)

    return result
  }

  lockVaults = async () => {
    const { owner } = this
    await this.tokenVault.lock({ from: owner })
    await this.bonusVault.lock({ from: owner })
  }

  sendTokens = async () => {
    const { owner } = this
    this.printTitle('Moving Tokens')

    Array.forEach(
      this.distribution,
      async function({ address, value }) {
        this.print(`Sending ${value} tokens to ${address}`)
        const tx = await this.tokenVault.transferFor(address, { from: owner })
        this._pushReceipt(tx.receipt)
      },
      this
    )
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
    const gasUsed = {
      contracts: 0,
      transfers: 0,
      allocation: 0,
    }

    // console.log('Gas Used: Contracts', gasUsed.contracts)
    // console.log('Gas Used: Transfers', gasUsed.transfers)
    // console.log('Gas Used: Allocation', gasUsed.allocation)

    const { transactionHashes } = this

    this.printTitle('Tx Hashes')
    Array.forEach(transactionHashes, v => console.log(v))
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

// * coinbase = '0x627306090abab3a6e1400e9345bc60c78a8bef57'
// * owner = '0xf17f52151ebef6c7334fad080c5704d77216b732'
// * multisig = '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef'

contract('Deployment Simulation', function([_, owner]) {
  // Flexacoin token properties
  // const SYMBOL = 'FXC'
  // const NAME = 'Flexacoin'
  // const DECIMALS = 18
  // const INITIAL_SUPPLY = 100000000000

  const tokensToBeAllocated = 36703064000
  const bonusToBeAllocated = 31082532000
  const bonusVestingPeriod = 180 * 24 * 60 * 60 // 180 days * 24 hours * 60 minutes * 60 seconds
  const vaultConfig = {
    tokensToBeAllocated,
    bonusToBeAllocated,
    bonusVestingPeriod,
  }

  const flexaDeployment = new FlexaSmartContracts(
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
    this.flexacoin = flexaDeployment.flexacoin
    this.tokenVault = flexaDeployment.tokenVault
    this.bonusVault = flexaDeployment.bonusVault

    await flexaDeployment.allocateDistribution()

    await flexaDeployment.prepareVaults()
  })

  it('is prepared correctly', async function() {
    const tokenVaultBalance = await flexaDeployment.flexacoin.balanceOf(
      flexaDeployment.tokenVault.address
    )
    console.log('TokenVault Balance', tokenVaultBalance.toFixed())

    console.log(
      'TokenVault: totalAllocated',
      (await flexaDeployment.tokenVault.tokensAllocated()).toFixed()
    )

    const bonusVaultBalance = await flexaDeployment.flexacoin.balanceOf(
      flexaDeployment.bonusVault.address
    )
    console.log('BonusVault Balance', bonusVaultBalance.toFixed())
  })

  it('vaults can be locked', async function() {
    await flexaDeployment.lockVaults()
  })

  it('tokenVault can be unlocked', async function() {
    await flexaDeployment.tokenVault.unlock({ from: owner })
  })

  it('tokens can be transferred', async function() {
    await flexaDeployment.sendTokens()
  })

  it('results can be printed', function() {
    flexaDeployment.printResults()
  })
})
