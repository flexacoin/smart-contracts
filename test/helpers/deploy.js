import fs from 'fs'
import csv from 'fast-csv'
import { tokens } from './flexacoin'

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

const parseDistributionCsv = filename => {
  const distro = []
  return new Promise((resolve, reject) => {
    fs
      .createReadStream(filename)
      .pipe(csv())
      .on('data', function(data) {
        const [address, value, bonus] = data
        distro.push({ address, value, bonus })
      })
      .on('end', function() {
        console.log('Done parsing distribution csv')
        resolve(distro)
      })
  })
}

const parseGas = txHash => {
  const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
  return gasUsed
}

export const deployContracts = async (deployer, distributionCsv) => {
  const gasUsed = {
    contracts: 0,
    transfers: 0,
    allocation: 0,
  }

  const deploymentLog = {
    contracts: {},
    transactions: [],
  }

  const distro = await parseDistributionCsv(distributionCsv)

  console.log('Create Flexacoin contract')
  const flexacoin = await Flexacoin.new({ from: deployer })
  console.log(`Flexacoin: ${flexacoin.address}`)
  console.log(`Flexacoin Tx Hash: ${flexacoin.transactionHash}`)
  gasUsed.contracts += parseGas(flexacoin.transactionHash)
  deploymentLog.contracts['flexacoin'] = flexacoin

  // Create TokenVault contract for immediately available tokens
  const tokensToBeAllocated = tokens(36703064000)
  const tokenVestingPeriod = 0
  const tokenVault = await TokenVault.new(
    flexacoin.address,
    tokensToBeAllocated,
    tokenVestingPeriod,
    {
      from: deployer,
    }
  )
  deploymentLog.contracts['tokenVault'] = tokenVault
  gasUsed.contracts += parseGas(tokenVault.transactionHash)

  let tx
  // Transfer tokens to token vault
  tx = await flexacoin.transfer(tokenVault.address, tokensToBeAllocated, {
    from: deployer,
  })
  deploymentLog.transactions.push(tx)
  gasUsed.transfers += tx.receipt.gasUsed

  // Create TokenVault contract for bonus tokens. These will vest and be
  // available 180 days after the contract is locked.
  const bonusToBeAllocated = tokens(31082532000)
  const bonusVestingPeriod = 180 * 24 * 60 * 60 // 180 days * 24 hours * 60 minutes * 60 seconds
  const bonusVault = await TokenVault.new(
    flexacoin.address,
    bonusToBeAllocated,
    bonusVestingPeriod,
    {
      from: deployer,
    }
  )
  deploymentLog.contracts['bonusVault'] = bonusVault
  gasUsed.contracts += parseGas(bonusVault.transactionHash)

  // Transfer tokens to bonus vault
  tx = await flexacoin.transfer(bonusVault.address, bonusToBeAllocated, {
    from: deployer,
  })
  deploymentLog.transactions.push(tx)
  gasUsed.transfers += tx.receipt.gasUsed

  // Set allocations for distro list
  Array.forEach(distro, async function({ address, value, bonus }) {
    console.log(
      `Allocating for ${address} - Tokens: ${value} - Bonue: ${bonus}`
    )
    let tx
    tx = await tokenVault.setAllocation(address, tokens(value), {
      from: deployer,
    })
    deploymentLog.transactions.push(tx)
    gasUsed.allocation += tx.receipt.gasUsed

    tx = await bonusVault.setAllocation(address, tokens(bonus), {
      from: deployer,
    })
    deploymentLog.transactions.push(tx)
    gasUsed.allocation += tx.receipt.gasUsed
  })

  const tokenVaultBalance = await flexacoin.balanceOf(tokenVault.address)
  console.log('Token Vault Balance', tokenVaultBalance.toFixed())

  const bonusVaultBalance = await flexacoin.balanceOf(bonusVault.address)
  console.log('Bonus Vault Balance', bonusVaultBalance.toFixed())

  console.log()
  console.log('Gas Used: Contracts', gasUsed.contracts)
  console.log('Gas Used: Transfers', gasUsed.transfers)
  console.log('Gas Used: Allocation', gasUsed.allocation)

  console.log('Deployment Log', deploymentLog)
}
