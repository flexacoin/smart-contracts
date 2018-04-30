import fs from 'fs'
import csv from 'fast-csv'
import chai from 'chai'
import BigNumber from 'bignumber.js'

const { assert } = chai

class Log {
  static messages = []

  static log(text = '') {
    // console.log(`- ${text}`)
    this.messages.push(`- ${text}`)
  }

  static line(char = '-') {
    this.messages.push(char.repeat(80))
  }

  static section(title = '') {
    this.messages.push('')
    this.messages.push('')
    this.line('^')
    this.messages.push('')
    this.log(title)
    this.messages.push('')
    this.line('v')
    this.messages.push('')
  }

  static title(title = '') {
    this.messages.push('')
    this.line()
    this.log(title)
    this.line()
  }

  static flush() {
    this.messages.forEach(args => console.log.call(console, args))
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

  run = async () => {
    const { owner } = this

    Log.section('Deploying Contracts')

    await this.deployContracts()

    Log.section('Preparing Vaults')

    await this.allocateDistribution()
    await this.prepareVaults()

    // Ensure vault allocations have been set
    await this._assertAllocationsSet()

    // Lock both vaults...
    await this.lockVaults()

    // ...Then immediately unlock the token vault, which requires no vesting
    // period to pass
    await this.tokenVault.unlock({ from: owner })

    // Finally, transfer the token vault tokens for holders...
    await this.transferTokens()

    // ...and assert the balances of the tokens are correct
    await this._assertTransferBalances()

    this._processGas()

    Log.flush()
  }

  _assertAllocationsSet = async () => {
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

  _assertTransferBalances = async () => {
    Log.title('Asserting token balances are correct')

    return Promise.all(
      this.distribution.map(async ({ address, value }) => {
        const balance = await this.balanceOf(address)
        Log.log(`Checking Flexacoin balance for ${address}...`)
        Log.log(`Want: ${value}`)
        Log.log(`Got:  ${balance.div(FlexaContractManager.DECIMALS_FACTOR)}`)
        Log.line()

        assert.equal(
          balance,
          FlexaContractManager.toTokens(value),
          `Balance of Flexacoin for ${address} incorrect`
        )
      }, this)
    )
  }

  parseDistribution = async filename => {
    Log.section('Parsing Distribution')
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

    Log.line()

    this.distribution.map(({ address, value, bonus }) => {
      Log.log(`To Address: ${address}`)
      Log.log(`Tokens:     ${value}`)
      Log.log(`Bonus:      ${bonus} `)
      Log.line()
    })
  }

  _calculateDistributionTokens = type => {
    return this.distribution.reduce((val, el) => val + Number(el[type]), 0)
  }

  balanceOf = async address => {
    const balance = await this.flexacoin.balanceOf(address)
    return balance
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

  allocateDistribution = async () => {
    Log.title('Processing Vault Distributions')

    return await Promise.all(
      this.distribution.map(async ({ address, value, bonus }) => {
        // Log.log(`To Address: ${address}`)
        // Log.log(`Tokens:     ${value}`)
        // Log.log(`Bonus:      ${bonus} `)
        // Log.line()
        await this.allocate(this.tokenVault, address, value, {
          title: `Allocating ${value} tokens to ${address}`,
        })
        await this.allocate(this.bonusVault, address, bonus, {
          title: `Allocating ${bonus} bonuses to ${address}`,
        })
      }, this)
    )
  }

  allocate = async (vault, address, value, logOpts = {}) => {
    const { owner } = this
    const result = await vault.setAllocation(
      address,
      FlexaContractManager.toTokens(value),
      {
        from: owner,
      }
    )

    return this._processResult(result, {
      ...logOpts,
      func: `${
        vault === this.tokenVault ? 'tokenVault' : 'bonusVault'
      }.setAllocation('${address}', ${value})`,
    })
  }

  prepareVaults = async () => {
    const {
      owner,
      tokenVault,
      bonusVault,
      vaultConfig: { tokensToBeAllocated, bonusToBeAllocated },
    } = this

    await this._transfer(tokenVault.address, owner, tokensToBeAllocated, {
      title: 'Preparing Token Vault',
    })

    await this._transfer(bonusVault.address, owner, bonusToBeAllocated, {
      title: 'Preparing Bonus Vault',
    })
  }

  _transfer = async (to, from, value, logOpts = {}) => {
    const result = await this.flexacoin.transfer(
      to,
      FlexaContractManager.toTokens(value),
      { from }
    )

    return this._processResult(result, {
      ...logOpts,
      func: `Flexacoin.transfer(${to}, ${value})`,
    })
  }

  lockVaults = async () => {
    Log.section('Locking Vaults')

    const { owner, tokenVault, bonusVault } = this

    let result
    result = await tokenVault.lock({ from: owner })
    this._processTx(result.tx, {
      title: 'Locking Token Vault',
      func: 'tokenVault.lock()',
    })

    result = await bonusVault.lock({ from: owner })
    this._processTx(result.tx, {
      title: 'Locking Bonus Vault',
      func: 'bokenVault.lock()',
    })
  }

  transferTokens = async () => {
    Log.section('Transferring Regular Tokens')

    return await this._transferDistribution(
      this.tokenVault,
      this.distribution,
      'value'
    )
  }

  transferBonuses = async () => {
    Log.section('Transferring Bonus Tokens')

    return await this._transferDistribution(
      this.bonusVault,
      this.distribution,
      'bonus'
    )
  }

  _transferDistribution = async (vault, distribution, valueKey) => {
    return await Promise.all(
      distribution.map(data => {
        const { address } = data
        const value = data[valueKey]
        return this._transferFor(vault, address, {
          title: `Transferring ${value} tokens to ${address}`,
        })
      }, this)
    )
  }

  _transferFor = async (vault, address, logOpts = {}) => {
    const { owner } = this
    const result = await vault.transferFor(address, { from: owner })
    return this._processResult(result, {
      ...logOpts,
      func: `${
        vault === this.tokenVault ? 'tokenVault' : 'bonusVault'
      }.transferFor('${address}')`,
    })
  }

  _processContract = (name, instance) => {
    this._processTx(instance.transactionHash, {
      title: `${name} Contract`,
      copy: `Deploying ${name} contract... deployed!`,
    })
    return instance
  }

  _processResult = (result, opts) => {
    this._processTx(result.tx, opts)
    return result
  }

  _processTx = (txHash, opts) => {
    const { title, func, copy } = opts

    this.transactionHashes.push(txHash)

    const receipt = this.web3.eth.getTransactionReceipt(txHash)
    this.receipts[txHash] = receipt

    if (!receipt) {
      Log.log(`NO RECEIPT FOUND: ${JSON.toString(opts)}`)
      return
    }

    if (title) {
      Log.title(title)
    }

    if (copy) {
      Log.log(copy)
    }

    if (func) {
      Log.log()
      Log.log(func)
      Log.log()
    }

    Log.log(`> transactionHash: ${receipt.transactionHash}`)
    Log.log(`> transactionIndex: ${receipt.transactionIndex}`)
    Log.log(`> blockHash: ${receipt.blockHash}`)
    Log.log(`> blockNumber: ${receipt.blockNumber}`)
    Log.log(`> gasUsed: ${receipt.gasUsed}`)
    Log.log(`> cumulativeGasUsed: ${receipt.cumulativeGasUsed}`)
    Log.log(`> contractAddress: ${receipt.contractAddress}`)
    Log.log(`> status: ${receipt.status}`)
  }

  _processGas = () => {
    Log.section('Gas Consumption')

    const { web3, transactionHashes } = this
    const total = transactionHashes.reduce((total, txHash) => {
      const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
      return total + Number(gasUsed)
    }, 0)

    Log.log(`Total gas used: ${total}`)
  }

  printResults = () => {
    Log.flush()
  }
}
