require('babel-register')
require('babel-polyfill')

const LedgerWalletProvider = require('truffle-ledger-provider')

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
      provider: new LedgerWalletProvider(
        {
          networkId: 4,
          accountOffset: 0,
        },
        'https://rinkeby.infura.io/UySth7pExjWwPyqOE9Sw'
      ),
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

module.exports = config
