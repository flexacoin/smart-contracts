import { ZERO_ADDRESS, logTitle, logError } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { DECIMALS_FACTOR, tokens } from './helpers/flexacoin'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Flexacoin = artifacts.require('Flexacoin')

contract('Flexacoin', function([_, owner, accountOne]) {
  beforeEach(async function() {
    this.token = await Flexacoin.new({ from: owner })
  })

  describe('owner', function() {
    it('returns the owner', async function() {
      const contractOwner = await this.token.owner({ from: accountOne })

      contractOwner.should.equal(owner)
    })
  })
})
