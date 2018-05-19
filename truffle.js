require('babel-register')
require('babel-polyfill')

const config = {
  migrations_directory: './migrations',
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    test: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    ganache: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    mainnet: {
      host: 'localhost',
      port: 8545,
      network_id: '1',
    },
    rinkeby: {
      host: 'localhost',
      port: 8545,
      network_id: '4',
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 500,
    },
  },
}

const _ = require('lodash')

try {
  _.merge(config, require('./truffle.local'))
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    // eslint-disable-next-line no-console
    console.log('No local truffle config found. Using all defaults...')
  } else {
    // eslint-disable-next-line no-console
    console.warn('Tried processing local config but got error:', e)
  }
}

module.exports = config
