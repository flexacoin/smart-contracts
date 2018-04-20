import BigNumber from 'bignumber.js'

export const config = {
  name: 'Flexacoin',
  symbol: 'FXC',
  decimals: 18,
}

export const DECIMALS_FACTOR = new BigNumber('10').pow(config.decimals)

// Helper function to normalize whole numbers to token values with decimals
// applied
export const tokens = num => num * DECIMALS_FACTOR
