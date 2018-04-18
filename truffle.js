// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'test'
process.env.NODE_ENV = 'test'

require('babel-register')
require('babel-polyfill')

module.exports = {
  migrations_directory: './migrations',
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 500,
    },
  },
}
