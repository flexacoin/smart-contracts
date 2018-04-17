import { assertRevert, EVMRevert } from './helpers/assertions'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const FlexaToken = artifacts.require('FlexaToken')
const TokenVault = artifacts.require('TokenVault')

contract('TokenVault', accounts => {
  before(async () => {
    this.token = await FlexaToken.new({ from: owner })
  })

  it(
    ('should be deployed',
    async () => {
      const tokenAddress = await this.token.address
      assert(tokenAddress, 'FlexaToken is not deployed')
      assert(
        tokenAddress != ZERO_ADDRESS,
        'FlexaToken address is the zero address'
      )
    })
  )

  describe('ownership', () => {})
})
