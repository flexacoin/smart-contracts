import fs from 'fs'
import csv from 'fast-csv'
import { tokens } from './flexacoin'

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

const parseDistributionCsv = filename => {
  const distro = []

  // Read distribution csv
  const stream = fs.createReadStream(filename)

  return new Promise((resolve, reject) => {
    stream
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

const gasUsed = {
  contracts: 0,
  transfers: 0,
  allocation: 0,
}

const calculateGas = txHash => {
  const { gasUsed } = web3.eth.getTransactionReceipt(txHash)
  return gasUsed
}

export const deployContracts = async (deployer, distributionCsv) => {
  const distro = await parseDistributionCsv(distributionCsv)

  console.log('Create Flexacoin contract')
  const flexacoin = await Flexacoin.new({ from: deployer })
  console.log(`Flexacoin: ${flexacoin.address}`)
  console.log(`Flexacoin Tx Hash: ${flexacoin.transactionHash}`)
  gasUsed.contracts += calculateGas(flexacoin.transactionHash)

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
  gasUsed.contracts += calculateGas(tokenVault.transactionHash)

  let tx
  // Transfer tokens to token vault
  tx = await flexacoin.transfer(tokenVault.address, tokensToBeAllocated, {
    from: deployer,
  })
  console.log(tx.receipt.gasUsed)
  gasUsed.transfers += tx.receipt.gasUsed
  console.log(gasUsed)

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
  gasUsed.contracts += calculateGas(bonusVault.transactionHash)

  // Transfer tokens to bonus vault
  tx = await flexacoin.transfer(bonusVault.address, bonusToBeAllocated, {
    from: deployer,
  })
  gasUsed.transfers += tx.receipt.gasUsed

  // Set allocations for distro list
  Array.forEach(
    distro,
    async function({ address, value, bonus }) {
      console.log(
        `Allocating for ${address} - Tokens: ${value} - Bonue: ${bonus}`
      )
      let tx
      tx = await tokenVault.setAllocation(address, tokens(value), {
        from: deployer,
      })
      gasUsed.allocation += tx.receipt.gasUsed

      tx = await bonusVault.setAllocation(address, tokens(bonus), {
        from: deployer,
      })
      gasUsed.allocation += tx.receipt.gasUsed
    },
    this
  )

  const tokenVaultBalance = await flexacoin.balanceOf(tokenVault.address)
  console.log('Token Vault Balance', tokenVaultBalance.toFixed())

  const bonusVaultBalance = await flexacoin.balanceOf(bonusVault.address)
  console.log('Bonus Vault Balance', bonusVaultBalance.toFixed())

  console.log()
  console.log('Gas Used: Contracts', gasUsed.contracts)
  console.log('Gas Used: Transfers', gasUsed.transfers)
  console.log('Gas Used: Allocation', gasUsed.allocation)
  console.log()
}
