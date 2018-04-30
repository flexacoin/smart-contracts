import fs from 'fs'
import csv from 'fast-csv'
import chai from 'chai'
import BigNumber from 'bignumber.js'

const { assert } = chai

class Log {
  static log(text) {
    console.log(`- ${text}`)
  }

  static line() {
    console.log(
      `--------------------------------------------------------------------------------`
    )
  }

  static title(title) {
    console.log()
    this.line()
    this.log(title)
    this.line()
  }
}

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
  }

  transactionHashes = []
  receipts = []
  allocations = []

  parseDistribution = async filename => {
    Log.title('Parsing Distribution')
    this.distribution = await FlexaContractManager.parseDistributionCSV(
      filename
    )

    Log.log(`Done parsing ${filename}`)

    assert.equal(
      this._calculateDistributionTokens('value'),
      this.vaultConfig.tokensToBeAllocated,
      'Token mismatch between vault config and csv'
    )
    assert.equal(
      this._calculateDistributionTokens('bonus'),
      this.vaultConfig.bonusToBeAllocated,
      'Bonus mismatch between vault config and csv'
    )
  }

  _calculateDistributionTokens = type => {
    return this.distribution.reduce((val, el) => val + Number(el[type]), 0)
  }

  run = async () => {
    await this.deployContracts()
    await this.allocateDistribution()

    assert.equal(
      await this.tokenVault.tokensAllocated(),
      FlexaContractManager.toTokens(this.vaultConfig.tokensToBeAllocated),
      'Token Vault tokens allocated should equal expected allocation'
    )
    assert.equal(
      await this.bonusVault.tokensAllocated(),
      FlexaContractManager.toTokens(this.vaultConfig.bonusToBeAllocated),
      'Bonus Vault tokens allocated should equal expected allocation'
    )
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
    Log.title(`${name} Contract`)
    Log.log(`Deploying ${name} contract... deployed!`)
    Log.log(`  Address: ${instance.address}`)
    Log.log(`  Tx Hash: ${instance.transactionHash}`)

    this._pushTx(instance.transactionHash)
    return instance
  }

  allocateDistribution = async () => {
    Log.title('Allocate Vault Distributions')

    await Array.forEach(
      this.distribution,
      ({ address, value, bonus }) => {
        this._printAllocation(address, value, bonus)

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
    Log.title('Preparing Token and Bonus Vaults')

    const {
      owner,
      tokenVault,
      bonusVault,
      vaultConfig: { tokensToBeAllocated, bonusToBeAllocated },
    } = this

    Log.log(`Preparing Token Vault`)
    await this._transfer(tokenVault.address, owner, tokensToBeAllocated)

    Log.log(`Preparing Bonus Vault`)
    await this._transfer(bonusVault.address, owner, bonusToBeAllocated)
  }

  _transfer = async (to, from, value) => {
    Log.log(`Transferring ${value} tokens to ${to}`)

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

  transferTokens = async () => {
    Log.title('Sending Tokens')
    this._transferDistribution(this.tokenVault, this.distribution, 'value')
  }

  transferBonuses = () => {
    Log.title('Sending Bonus Tokens')
    this._transferDistribution(this.bonusVault, this.distribution, 'bonus')
  }

  _transferDistribution = async (vault, distribution, valueKey) => {
    await Array.forEach(
      distribution,
      data => {
        const { address } = data
        const value = data[valueKey]
        Log.log(`Transferring ${value} tokens to ${address}`)
        this._transferFor(vault, address)
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

  _printAllocation = (address, tokens, bonus) => {
    console.log()
    Log.line()
    Log.log(`Address: ${address}`)
    Log.log(`Tokens:  ${tokens}`)
    Log.log(`Bonus:   ${bonus}`)
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

    Log.title('Tx Hashes')

    transactionHashes.forEach(v => console.log(v))
  }
}
