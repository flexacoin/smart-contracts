const vaultConfigs = {
  development: {
    tokensToBeAllocated: 36703064000,
    tokensVestingPeriod: 0,
    bonusToBeAllocated: 31082532000,
    bonusVestingPeriod: 5 * 60, // 5 minutes
  },
  rinkeby: {
    tokensToBeAllocated: 36703064000,
    tokensVestingPeriod: 0,
    bonusToBeAllocated: 31082532000,
    bonusVestingPeriod: 5 * 60, // 5 minutes
  },
  mainnet: {
    tokensToBeAllocated: 0,
    tokensVestingPeriod: 0,
    bonusToBeAllocated: 0,
    bonusVestingPeriod: 180 * 24 * 60 * 60, // 180 days * 24 hours * 60 minutes * 60 seconds
  },
}

module.exports = vaultConfigs
