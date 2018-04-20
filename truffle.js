require('babel-register')
require('babel-polyfill')

const config = (module.exports = {
  migrations_directory: './migrations',
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // Match any network id
    },
    test: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
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
})

module.exports = config
